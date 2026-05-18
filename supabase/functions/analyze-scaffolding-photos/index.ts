import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  project_id: string;
  photo_urls: string[]; // public URLs or signed URLs the AI can fetch
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
    if (!body.project_id || !Array.isArray(body.photo_urls) || body.photo_urls.length === 0) {
      return new Response(JSON.stringify({ error: 'project_id och minst en photo_url krävs' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.photo_urls.length > 10) {
      return new Response(JSON.stringify({ error: 'Max 10 bilder per analys' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Hämta projekt + org
    const { data: proj } = await admin.from('projects').select('organization_id, name, address')
      .eq('id', body.project_id).maybeSingle();
    if (!proj) {
      return new Response(JSON.stringify({ error: 'Projektet hittades inte' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hämta PERI-katalog (om finns)
    const { data: catalog } = await admin.from('peri_catalog')
      .select('artnr, name, category, unit, description')
      .eq('organization_id', proj.organization_id)
      .eq('active', true)
      .limit(500);

    const catalogText = (catalog || []).length > 0
      ? `Använd ENDAST artiklar från denna PERI-katalog. Returnera exakt artnr som listas.\n\n${(catalog || []).map(c => `- ${c.artnr} | ${c.name} (${c.unit})${c.category ? ' [' + c.category + ']' : ''}`).join('\n')}`
      : `Ingen specifik PERI-katalog är uppladdad. Använd generiska PERI UP-komponenter: ramar, plank/bomlag, diagonalstag, fotplattor, räcken, trappor, konsoler, väderskydd. Sätt artnr till "PERI-UP-<typ>".`;

    const systemPrompt = `Du är expert på PERI-ställningar och uppskattar material från fotografier av hus.
Analysera bilderna och returnera en uppskattning som JSON.

${catalogText}

Returnera ENDAST giltig JSON enligt detta exakta schema (ingen markdown, ingen text):
{
  "estimated": {
    "sides_m": [number],
    "height_m": number,
    "floors": number,
    "roof_type": "sadeltak"|"valmat"|"platt"|"mansard"|"okänt",
    "total_area_m2": number
  },
  "risks": [string],
  "materials": [{"artnr": string, "name": string, "qty": number, "unit": string}],
  "confidence": number,
  "notes": string
}`;

    const userMessage = `Analysera dessa ${body.photo_urls.length} bild(er) av huset på adressen "${proj.address || 'okänd'}" och föreslå PERI-ställningsmaterial.${body.notes ? '\n\nExtra info: ' + body.notes : ''}`;

    const content: any[] = [{ type: 'text', text: userMessage }];
    for (const url of body.photo_urls) {
      content.push({ type: 'image_url', image_url: { url } });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
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
    const rawContent = aiData?.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch {
      parsed = { estimated: {}, risks: ['Kunde inte tolka AI-svaret'], materials: [], confidence: 0, notes: rawContent };
    }

    // Spara i scaffolding_jobs
    await admin.from('scaffolding_jobs').upsert({
      project_id: body.project_id,
      organization_id: proj.organization_id,
      ai_analysis: parsed,
      ai_analyzed_at: new Date().toISOString(),
    }, { onConflict: 'project_id' });

    return new Response(JSON.stringify({ analysis: parsed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('analyze-scaffolding-photos error', e);
    return new Response(JSON.stringify({ error: e.message || 'Internt fel' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
