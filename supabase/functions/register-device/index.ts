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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const body = await req.json();
    const { deviceId, deviceName, platform, appVersion } = body || {};
    if (!deviceId || typeof deviceId !== "string") {
      return new Response(JSON.stringify({ error: "deviceId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const plat = ["ios", "android", "web"].includes(platform) ? platform : "web";

    const admin = createClient(supabaseUrl, serviceKey);

    // org
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "No organization" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const orgId = membership.organization_id;

    // existing rows for this user
    const { data: existing } = await admin
      .from("user_devices")
      .select("id, device_id, status")
      .eq("user_id", userId);

    const hasApproved = (existing ?? []).some((d: any) => d.status === "approved");
    const thisDevice = (existing ?? []).find((d: any) => d.device_id === deviceId);

    // Already known
    if (thisDevice) {
      await admin
        .from("user_devices")
        .update({ last_seen_at: new Date().toISOString(), device_name: deviceName ?? null, platform: plat, app_version: appVersion ?? null })
        .eq("id", thisDevice.id);
      return new Response(JSON.stringify({
        status: thisDevice.status,
        isFirstDevice: false,
        message: thisDevice.status === "pending" ? "Enheten väntar på godkännande." : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // New device
    const newStatus = hasApproved ? "pending" : "approved";
    const nowIso = new Date().toISOString();
    const { error: insErr } = await admin.from("user_devices").insert({
      user_id: userId,
      organization_id: orgId,
      device_id: deviceId,
      device_name: deviceName ?? null,
      platform: plat,
      app_version: appVersion ?? null,
      status: newStatus,
      approved_at: newStatus === "approved" ? nowIso : null,
      last_seen_at: nowIso,
    });
    if (insErr) throw insErr;

    // Notify admins on pending
    if (newStatus === "pending") {
      try {
        await admin.from("notifications").insert({
          organization_id: orgId,
          user_id: userId,
          type: "security_anomaly",
          title: "Ny enhet väntar på godkännande",
          message: `Användare har loggat in från en ny enhet (${deviceName ?? plat}).`,
          priority: "high",
          action_required: true,
        });
      } catch (e) { console.warn("notify failed", e); }
    }

    return new Response(JSON.stringify({
      status: newStatus,
      isFirstDevice: newStatus === "approved",
      message: newStatus === "approved" ? "Enheten är registrerad som din arbetsenhet." : "Din chef måste godkänna denna enhet innan du kan checka in.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
