import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AUTO_CHECKOUT_MIN = 120;
const WARNING_MIN = 90;

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "lovable-geofence/1.0" } },
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) { console.error("geocode fail", e); }
  return null;
};

interface PingPayload {
  check_in_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  is_mocked?: boolean;
  recorded_at?: string;
  device_id?: string;
  motion_activity?: string;
}

const processPing = async (admin: any, userId: string, payload: PingPayload) => {
  const { check_in_id, lat, lng, accuracy, is_mocked, recorded_at, device_id, motion_activity } = payload;

  const { data: checkIn } = await admin
    .from("worker_check_ins")
    .select("id, user_id, organization_id, project_id, check_out_at, hourly_rate_snapshot, check_in_at")
    .eq("id", check_in_id)
    .single();

  if (!checkIn) return { skipped: "no_check_in" };
  if (checkIn.user_id !== userId) return { skipped: "forbidden" };
  if (checkIn.check_out_at) return { skipped: "closed" };

  // Device approval check (soft: still record ping but flag)
  let deviceApproved = true;
  if (device_id) {
    const { data: dev } = await admin
      .from("user_devices")
      .select("status")
      .eq("user_id", userId)
      .eq("device_id", device_id)
      .maybeSingle();
    deviceApproved = dev?.status === "approved";
  }

  const { data: project } = await admin
    .from("projects")
    .select("address, geofence_radius_m, latitude, longitude")
    .eq("id", checkIn.project_id)
    .single();
  const radius = Number(project?.geofence_radius_m ?? 50);

  let projectCoords: { lat: number; lng: number } | null = null;
  if (project?.latitude != null && project?.longitude != null) {
    projectCoords = { lat: Number(project.latitude), lng: Number(project.longitude) };
  } else if (project?.address) {
    projectCoords = await geocodeAddress(project.address);
    if (projectCoords) {
      await admin.from("projects").update({
        latitude: projectCoords.lat, longitude: projectCoords.lng, geocoded_at: new Date().toISOString(),
      }).eq("id", checkIn.project_id);
    }
  }

  let distance: number | null = null;
  let insideRadius = true;
  if (projectCoords) {
    distance = haversineMeters(lat, lng, projectCoords.lat, projectCoords.lng);
    const acc = Number(accuracy ?? 0);
    insideRadius = acc > 30 ? true : distance <= radius;
  }

  const pingRecordedAt = recorded_at ? new Date(recorded_at).toISOString() : new Date().toISOString();

  await admin.from("worker_location_pings").insert({
    check_in_id, user_id: userId, organization_id: checkIn.organization_id,
    recorded_at: pingRecordedAt, lat, lng,
    accuracy_m: accuracy ?? null, distance_m: distance,
    inside_radius: insideRadius, is_mocked: !!is_mocked,
    motion_activity: motion_activity ?? null,
  });

  const { data: openAbsence } = await admin
    .from("worker_absence_periods")
    .select("id, left_at, warning_sent_at")
    .eq("check_in_id", check_in_id)
    .is("returned_at", null)
    .order("left_at", { ascending: false })
    .limit(1).maybeSingle();

  let notifyWarning = false;
  let autoCheckedOut = false;
  let autoCheckoutAt: string | null = null;

  if (!insideRadius && !openAbsence) {
    await admin.from("worker_absence_periods").insert({
      check_in_id, user_id: userId, organization_id: checkIn.organization_id,
      left_at: pingRecordedAt,
      status: is_mocked ? "rejected" : "pending",
      reason: is_mocked ? "Mock-GPS upptäckt – automatiskt avvisad" : null,
    });
  } else if (!insideRadius && openAbsence) {
    const awayMin = (new Date(pingRecordedAt).getTime() - new Date(openAbsence.left_at).getTime()) / 60000;

    if (awayMin >= AUTO_CHECKOUT_MIN) {
      // Auto-checkout retroactively to left_at
      const leftAt = openAbsence.left_at;
      const checkInAtMs = new Date(checkIn.check_in_at).getTime();
      const leftAtMs = new Date(leftAt).getTime();
      const grossHours = Math.max(0, (leftAtMs - checkInAtMs) / 3_600_000);
      const netHours = grossHours; // absence is collapsed: duration = 0
      const wage = Math.round(netHours * Number(checkIn.hourly_rate_snapshot || 0) * 100) / 100;

      await admin.from("worker_check_ins").update({
        check_out_at: leftAt,
        check_out_lat: lat,
        check_out_lng: lng,
        gross_hours: Math.round(grossHours * 100) / 100,
        absence_minutes: 0,
        net_hours: Math.round(netHours * 100) / 100,
        duration_hours: Math.round(netHours * 100) / 100,
        wage_amount: wage,
        auto_closed: true,
        checkout_reason: "auto_checkout_outside_geofence",
        auto_checkout_triggered_at: new Date().toISOString(),
      }).eq("id", check_in_id);

      await admin.from("worker_absence_periods").update({
        returned_at: leftAt,
        duration_minutes: 0,
        auto_checkout_triggered: true,
      }).eq("id", openAbsence.id);

      // Notify admins
      await admin.from("notifications").insert({
        organization_id: checkIn.organization_id,
        user_id: userId,
        type: "security_anomaly",
        title: "Automatisk utcheckning",
        message: "Användare lämnade arbetsområdet i mer än 2 timmar – passet avslutades automatiskt.",
        priority: "high",
        action_required: true,
      });
      autoCheckedOut = true;
      autoCheckoutAt = leftAt;
    } else if (awayMin >= WARNING_MIN && !openAbsence.warning_sent_at) {
      await admin.from("worker_absence_periods").update({
        warning_sent_at: new Date().toISOString(),
      }).eq("id", openAbsence.id);
      notifyWarning = true;
    }
  } else if (insideRadius && openAbsence) {
    const leftAt = new Date(openAbsence.left_at).getTime();
    const returnedAt = new Date(pingRecordedAt).getTime();
    const durationMin = Math.max(0, Math.round((returnedAt - leftAt) / 60000));
    await admin.from("worker_absence_periods")
      .update({ returned_at: pingRecordedAt, duration_minutes: durationMin })
      .eq("id", openAbsence.id);
  }

  return {
    inside_radius: insideRadius,
    distance_m: distance,
    radius_m: radius,
    device_approved: deviceApproved,
    notify_warning: notifyWarning,
    auto_checked_out: autoCheckedOut,
    auto_checkout_at: autoCheckoutAt,
  };
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
    const body = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    if (Array.isArray(body?.pings)) {
      const results: any[] = [];
      const sorted = [...body.pings].sort((a, b) => new Date(a.recorded_at ?? 0).getTime() - new Date(b.recorded_at ?? 0).getTime());
      for (const p of sorted) {
        if (!p?.check_in_id || typeof p.lat !== "number" || typeof p.lng !== "number") { results.push({ skipped: "invalid" }); continue; }
        try { results.push(await processPing(admin, userId, p)); } catch (e) { console.error(e); results.push({ skipped: "error" }); }
      }
      const last = [...results].reverse().find((r) => "inside_radius" in r);
      return new Response(JSON.stringify({ ok: true, count: results.length, latest: last ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!body?.check_in_id || typeof body.lat !== "number" || typeof body.lng !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await processPing(admin, userId, body);
    return new Response(JSON.stringify({ ok: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ping error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
