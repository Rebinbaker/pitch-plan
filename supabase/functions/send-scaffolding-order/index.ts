import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Body {
  project_id: string;
  supplier_email: string;
  supplier_name?: string;
  delivery_date?: string;
  extra_notes?: string;
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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const body = (await req.json()) as Body;
    if (!body?.project_id || !body?.supplier_email) {
      return new Response(JSON.stringify({ error: 'project_id and supplier_email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Authorize: admin or project scaffolder
    const { data: isScaffolder } = await admin.rpc('is_project_scaffolder', {
      _user_id: userId, _project_id: body.project_id,
    });
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: userId, _role: 'admin',
    });
    if (!isScaffolder && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: project, error: projErr } = await admin
      .from('projects')
      .select('id, name, address, customer_name, customer_phone, organization_id')
      .eq('id', body.project_id).single();
    if (projErr || !project) throw new Error('Project not found');

    const { data: job, error: jobErr } = await admin
      .from('scaffolding_jobs')
      .select('material_spec, activity_log').eq('project_id', body.project_id).single();
    if (jobErr || !job) throw new Error('Scaffolding job not found');

    const items = Array.isArray(job.material_spec) ? job.material_spec : [];
    if (items.length === 0) throw new Error('Materialspecifikationen är tom');

    const rowsHtml = items.map((it: any) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(it.type || '')}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;text-align:right;">${escapeHtml(String(it.quantity ?? ''))}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(it.unit || '')}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(it.notes || '')}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;max-width:640px;">
        <h2>Beställning av ställningsmaterial</h2>
        <p><strong>Projekt:</strong> ${escapeHtml(project.name)}<br/>
        <strong>Leveransadress:</strong> ${escapeHtml(project.address || '')}<br/>
        <strong>Kund:</strong> ${escapeHtml(project.customer_name || '')}${project.customer_phone ? ` (${escapeHtml(project.customer_phone)})` : ''}<br/>
        ${body.delivery_date ? `<strong>Önskat leveransdatum:</strong> ${escapeHtml(body.delivery_date)}<br/>` : ''}</p>
        <table style="border-collapse:collapse;border:1px solid #ddd;width:100%;">
          <thead><tr style="background:#f3f3f3;">
            <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Typ</th>
            <th style="padding:6px 10px;border:1px solid #ddd;text-align:right;">Antal</th>
            <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Enhet</th>
            <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Kommentar</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${body.extra_notes ? `<p style="margin-top:16px;"><strong>Övrigt:</strong><br/>${escapeHtml(body.extra_notes).replace(/\n/g, '<br/>')}</p>` : ''}
        <p style="margin-top:24px;color:#666;font-size:12px;">Skickad via PitchPlan</p>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'PitchPlan <onboarding@resend.dev>',
        to: [body.supplier_email],
        subject: `Ställningsbeställning – ${project.name}`,
        html,
      }),
    });
    const resendJson = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: 'Resend failed', detail: resendJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const newLog = [
      ...(Array.isArray(job.activity_log) ? job.activity_log : []),
      { at: now, user_id: userId, action: 'order_sent', to: body.supplier_email },
    ];
    await admin.from('scaffolding_jobs').update({
      order_status: 'sent',
      order_sent_at: now,
      order_sent_to: body.supplier_email,
      order_notes: body.extra_notes ?? null,
      activity_log: newLog,
    }).eq('project_id', body.project_id);

    return new Response(JSON.stringify({ ok: true, resend: resendJson }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-scaffolding-order error', e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}
