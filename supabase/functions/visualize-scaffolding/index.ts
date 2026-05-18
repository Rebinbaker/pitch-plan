import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  project_id: string;
  photo_url: string;
  analysis?: any;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as Body;
    if (!body.project_id || !body.photo_url) {
      return new Response(JSON.stringify({ error: 'project_id och photo_url krävs' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Bygg promptbeskrivning baserad på analys
    const est = body.analysis?.estimated || {};
    const sides = Array.isArray(est.sides_m) ? est.sides_m : [];
    const matList = (body.analysis?.materials || []).slice(0, 12).map((m: any) => `${m.qty} st ${m.name}`).join(', ');

    const prompt = `Rita in en realistisk PERI UP fasadställning på huset i bilden — fotorealistisk visualisering.

KRAV:
- Behåll huset, omgivningen, ljus och perspektiv exakt som i originalbilden.
- Lägg till en komplett ställning runt fasaden ${sides.length ? `(uppskattade sidor: ${sides.map((s: number, i: number) => `sida ${i+1} ${s}m`).join(', ')})` : ''} med höjd ca ${est.height_m || 6}m.
- Vertikala ramar/spiror, horisontella bommar, diagonalstag (kryss), arbetsplan i metall/trä, fotlister, räcken/handledare på översta planet, fotplattor på marken, en trappsektion för uppgång, och förankringar till fasaden.
- Färger: typisk PERI silvergrå/galvad stål med gula/orange detaljer på räcken och fotlister.
- Visa material som motsvarar: ${matList || 'standard PERI UP komponenter'}.
- Undvik människor. Inga texter eller pilar i bilden.
${body.notes ? `\nExtra info: ${body.notes}` : ''}`;

    // Lovable AI gateway — image edit
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        modalities: ['image', 'text'],
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: body.photo_url } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'AI-tjänsten är upptagen. Försök igen om en stund.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-krediter slut. Lägg till krediter i Lovable workspace.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI-fel: ' + txt }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    // Bild kommer som data URL i message.images[0].image_url.url
    const imgUrl = aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!imgUrl) {
      return new Response(JSON.stringify({ error: 'AI returnerade ingen bild', raw: aiData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Konvertera data URL → bytes och ladda upp till storage
    const m = imgUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) {
      return new Response(JSON.stringify({ error: 'Ogiltigt bildformat från AI' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const mime = m[1];
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${user.id}/scaffolding/${body.project_id}/ai-viz/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from('worker-checkin-photos')
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) {
      return new Response(JSON.stringify({ error: 'Uppladdning misslyckades: ' + upErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: signed } = await admin.storage.from('worker-checkin-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 30);

    // Spara på scaffolding_jobs
    const { data: proj } = await admin.from('projects').select('organization_id')
      .eq('id', body.project_id).maybeSingle();
    if (proj) {
      await admin.from('scaffolding_jobs').upsert({
        project_id: body.project_id,
        organization_id: proj.organization_id,
        ai_visualization_path: path,
        ai_visualized_at: new Date().toISOString(),
      }, { onConflict: 'project_id' });
    }

    return new Response(JSON.stringify({ image_url: signed?.signedUrl, storage_path: path }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('visualize-scaffolding error', e);
    return new Response(JSON.stringify({ error: e.message || 'Internt fel' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
