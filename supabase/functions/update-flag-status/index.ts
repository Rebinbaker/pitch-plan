import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED = new Set(["legitimate", "ignored", "escalated"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const adminId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { flag_id, status, comment } = await req.json();
    if (!flag_id || !ALLOWED.has(status)) return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: flag } = await admin.from("stationary_device_flags").select("*").eq("id", flag_id).maybeSingle();
    if (!flag) return new Response(JSON.stringify({ error: "Flag not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await admin.from("stationary_device_flags").update({
      status, admin_comment: comment ?? null,
      reviewed_by: adminId, reviewed_at: new Date().toISOString(),
    }).eq("id", flag_id);

    if (status === "legitimate") {
      const delta = -10;
      await admin.from("risk_score_events").insert({
        user_id: flag.user_id, organization_id: flag.organization_id,
        event_type: "flag_marked_legitimate", delta, reason: comment ?? null, related_flag_id: flag.id,
      });
      const { data: existing } = await admin.from("user_risk_scores").select("id, score").eq("user_id", flag.user_id).maybeSingle();
      if (existing) {
        await admin.from("user_risk_scores").update({
          score: Math.max(0, (existing.score ?? 0) + delta), last_event_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
