import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Probability tuned so over ~4h window the cumulative chance hits ~1 verification.
// With 60s polling and a 4h window (240 ticks) and target ~1 trigger, use ~1/200.
const TRIGGER_PROBABILITY = 1 / 200;

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
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { check_in_id } = await req.json();
    if (!check_in_id) return new Response(JSON.stringify({ error: "check_in_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check for an existing pending verification
    const { data: pendingRow } = await admin
      .from("random_presence_verifications")
      .select("id, triggered_at, expires_at, status")
      .eq("check_in_id", check_in_id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingRow) {
      // expire if past
      if (new Date(pendingRow.expires_at).getTime() < Date.now()) {
        await admin.from("random_presence_verifications")
          .update({ status: "missed", failure_reason: "Tidsfrist överskreds" })
          .eq("id", pendingRow.id);
        // notify admins
        const { data: rowFull } = await admin.from("random_presence_verifications").select("organization_id, user_id, project_id").eq("id", pendingRow.id).maybeSingle();
        if (rowFull) {
          await admin.from("notifications").insert({
            organization_id: rowFull.organization_id,
            user_id: rowFull.user_id,
            type: "security_anomaly",
            title: "Närvarokontroll missad",
            message: "Slumpmässig närvarokontroll besvarades inte i tid.",
            priority: "high",
            action_required: true,
          });
        }
        return new Response(JSON.stringify({ pending: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ pending: pendingRow }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Eligibility checks
    const { data: ci } = await admin
      .from("worker_check_ins")
      .select("id, user_id, organization_id, project_id, check_in_at, check_out_at")
      .eq("id", check_in_id)
      .maybeSingle();
    if (!ci || ci.user_id !== userId || ci.check_out_at) {
      return new Response(JSON.stringify({ pending: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ageMin = (Date.now() - new Date(ci.check_in_at).getTime()) / 60000;
    if (ageMin < 60) return new Response(JSON.stringify({ pending: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Skip if any verification (any status) exists for this check-in already (max 1 per session/day)
    const { data: anyToday } = await admin
      .from("random_presence_verifications")
      .select("id")
      .eq("check_in_id", check_in_id)
      .limit(1);
    if (anyToday && anyToday.length > 0) return new Response(JSON.stringify({ pending: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Random trigger
    if (Math.random() > TRIGGER_PROBABILITY) {
      return new Response(JSON.stringify({ pending: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60_000);
    const { data: inserted, error: insErr } = await admin
      .from("random_presence_verifications")
      .insert({
        user_id: userId,
        organization_id: ci.organization_id,
        check_in_id,
        project_id: ci.project_id,
        triggered_at: now.toISOString(),
        expires_at: expires.toISOString(),
        status: "pending",
      })
      .select("id, triggered_at, expires_at, status")
      .single();
    if (insErr) throw insErr;
    return new Response(JSON.stringify({ pending: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
