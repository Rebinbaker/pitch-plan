import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // Admin check
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { flag_id, check_in_id } = await req.json().catch(() => ({}));
    if (!flag_id && !check_in_id) {
      return new Response(JSON.stringify({ error: "Missing flag_id or check_in_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let flag: any = null;
    if (flag_id) {
      const { data } = await admin.from("stationary_device_flags").select("*").eq("id", flag_id).maybeSingle();
      flag = data;
    }
    const targetCheckInId = flag?.check_in_id || check_in_id;
    const { data: checkIn } = await admin.from("worker_check_ins")
      .select("id, user_id, organization_id, project_id, check_out_at")
      .eq("id", targetCheckInId).maybeSingle();
    if (!checkIn) return new Response(JSON.stringify({ error: "Check-in not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (checkIn.check_out_at) return new Response(JSON.stringify({ error: "Check-in already closed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    const { data: mpv, error } = await admin.from("manual_presence_verifications").insert({
      flag_id: flag?.id ?? null,
      check_in_id: checkIn.id,
      user_id: checkIn.user_id,
      organization_id: checkIn.organization_id,
      project_id: checkIn.project_id,
      requested_by: adminId,
      expires_at: expiresAt,
    }).select().single();
    if (error) throw error;

    await admin.from("notifications").insert({
      organization_id: checkIn.organization_id, user_id: checkIn.user_id,
      type: "security_anomaly",
      title: "Snabb verifiering krävs",
      message: "En snabb verifiering krävs för ditt aktiva arbetspass. Öppna appen och ta en selfie inom 5 minuter.",
      priority: "high", action_required: true,
    });

    return new Response(JSON.stringify({ ok: true, verification: mpv }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
