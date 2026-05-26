import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { verification_id, selfie_base64, lat, lng, accuracy, device_id } = body || {};
    if (!verification_id || typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: v } = await admin
      .from("random_presence_verifications")
      .select("id, user_id, organization_id, check_in_id, project_id, status, expires_at")
      .eq("id", verification_id)
      .maybeSingle();
    if (!v || v.user_id !== userId) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (v.status !== "pending") return new Response(JSON.stringify({ error: "Already completed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const expired = new Date(v.expires_at).getTime() < Date.now();

    // Selfie upload
    let selfieUrl: string | null = null;
    if (selfie_base64 && typeof selfie_base64 === "string") {
      try {
        const base64 = selfie_base64.split(",").pop() || selfie_base64;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const path = `${userId}/rpv-${verification_id}.jpg`;
        const { error: upErr } = await admin.storage
          .from("worker-checkin-photos")
          .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
        if (!upErr) selfieUrl = path;
      } catch (e) { console.warn("selfie upload failed", e); }
    }

    // Project coords
    const { data: project } = await admin
      .from("projects")
      .select("latitude, longitude, geofence_radius_m, address")
      .eq("id", v.project_id)
      .maybeSingle();

    let distance: number | null = null;
    const radius = Number(project?.geofence_radius_m ?? 50);
    if (project?.latitude != null && project?.longitude != null) {
      distance = haversineMeters(lat, lng, Number(project.latitude), Number(project.longitude));
    }
    const inside = distance == null ? true : (accuracy && accuracy > 30 ? true : distance <= radius);

    let status: 'passed' | 'failed' | 'missed' = 'passed';
    let failureReason: string | null = null;
    if (expired) { status = 'missed'; failureReason = 'Tidsfrist överskreds'; }
    else if (!selfieUrl) { status = 'failed'; failureReason = 'Ingen selfie skickad'; }
    else if (!inside) { status = 'failed'; failureReason = `För långt från projektet (${Math.round(distance!)} m)`; }

    await admin.from("random_presence_verifications").update({
      completed_at: new Date().toISOString(),
      status,
      selfie_url: selfieUrl,
      gps_lat: lat,
      gps_lng: lng,
      gps_accuracy: accuracy ?? null,
      distance_from_project_m: distance,
      failure_reason: failureReason,
      device_id: device_id ?? null,
    }).eq("id", verification_id);

    if (status !== 'passed') {
      try {
        await admin.from("notifications").insert({
          organization_id: v.organization_id,
          user_id: userId,
          type: "security_anomaly",
          title: status === 'missed' ? "Närvarokontroll missad" : "Närvarokontroll misslyckades",
          message: failureReason ?? "Verifiering misslyckades",
          priority: "high",
          action_required: true,
        });
      } catch (e) { console.warn("notify failed", e); }
    }

    return new Response(JSON.stringify({ status, failure_reason: failureReason, distance_m: distance }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
