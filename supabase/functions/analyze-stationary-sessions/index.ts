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

const RISK_DELTA = {
  stationary_medium: 5,
  stationary_high: 15,
  manual_verification_missed: 10,
  manual_verification_failed: 20,
  manual_verification_passed: -5,
  flag_marked_legitimate: -10,
};

async function applyRiskDelta(admin: any, userId: string, orgId: string, eventType: keyof typeof RISK_DELTA, opts: { reason?: string; flag_id?: string; verification_id?: string } = {}) {
  const delta = RISK_DELTA[eventType];
  await admin.from("risk_score_events").insert({
    user_id: userId, organization_id: orgId, event_type: eventType, delta,
    reason: opts.reason ?? null, related_flag_id: opts.flag_id ?? null, related_verification_id: opts.verification_id ?? null,
  });
  const { data: existing } = await admin.from("user_risk_scores").select("id, score").eq("user_id", userId).maybeSingle();
  if (existing) {
    await admin.from("user_risk_scores").update({
      score: Math.max(0, (existing.score ?? 0) + delta),
      last_event_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await admin.from("user_risk_scores").insert({
      user_id: userId, organization_id: orgId, score: Math.max(0, delta), last_event_at: new Date().toISOString(),
    });
  }
}

async function analyzeCheckIn(admin: any, checkIn: any) {
  const now = Date.now();
  const checkInAt = new Date(checkIn.check_in_at).getTime();
  const ageMin = (now - checkInAt) / 60000;
  if (ageMin < 90) return { skipped: "too_young" };

  // Recent verification guard (30 min)
  const recentCutoff = new Date(now - 30 * 60000).toISOString();
  const [{ data: recentRpv }, { data: recentMpv }] = await Promise.all([
    admin.from("random_presence_verifications")
      .select("id").eq("check_in_id", checkIn.id).eq("status", "passed").gt("completed_at", recentCutoff).limit(1),
    admin.from("manual_presence_verifications")
      .select("id").eq("check_in_id", checkIn.id).eq("status", "passed").gt("completed_at", recentCutoff).limit(1),
  ]);
  if ((recentRpv?.length ?? 0) > 0 || (recentMpv?.length ?? 0) > 0) return { skipped: "recent_verification" };

  // Open absence (rast/transport) guard
  const { data: openAbs } = await admin.from("worker_absence_periods")
    .select("id").eq("check_in_id", checkIn.id).is("returned_at", null).limit(1);
  if ((openAbs?.length ?? 0) > 0) return { skipped: "absence_open" };

  // Pings: last 150 min
  const windowCutoff = new Date(now - 150 * 60000).toISOString();
  const { data: pings } = await admin.from("worker_location_pings")
    .select("recorded_at, lat, lng, accuracy_m, inside_radius, motion_activity")
    .eq("check_in_id", checkIn.id).gt("recorded_at", windowCutoff)
    .order("recorded_at", { ascending: true });

  if (!pings || pings.length < 5) return { skipped: "too_few_pings" };

  // Total movement
  let totalMovement = 0;
  for (let i = 1; i < pings.length; i++) {
    totalMovement += haversineMeters(Number(pings[i - 1].lat), Number(pings[i - 1].lng), Number(pings[i].lat), Number(pings[i].lng));
  }
  // Variance (simple: max distance from centroid)
  const cLat = pings.reduce((s: number, p: any) => s + Number(p.lat), 0) / pings.length;
  const cLng = pings.reduce((s: number, p: any) => s + Number(p.lng), 0) / pings.length;
  let gpsVariance = 0;
  for (const p of pings) {
    const d = haversineMeters(Number(p.lat), Number(p.lng), cLat, cLng);
    if (d > gpsVariance) gpsVariance = d;
  }
  const avgAccuracy = pings.reduce((s: number, p: any) => s + Number(p.accuracy_m || 0), 0) / pings.length;

  if (avgAccuracy > 30) return { skipped: "poor_accuracy" };

  // Accelerometer summary
  const motionCounts: Record<string, number> = {};
  for (const p of pings) {
    const m = p.motion_activity || "unknown";
    motionCounts[m] = (motionCounts[m] || 0) + 1;
  }
  const total = pings.length;
  const stillPct = (motionCounts["still"] || 0) / total;
  const unknownPct = (motionCounts["unknown"] || 0) / total;
  const movingPct = ((motionCounts["walking"] || 0) + (motionCounts["moving"] || 0)) / total;
  let accelStatus: "none" | "low" | "normal" | "unknown" = "unknown";
  if (unknownPct > 0.7) accelStatus = "unknown";
  else if (movingPct > 0.2) accelStatus = "normal";
  else if (stillPct > 0.8) accelStatus = "none";
  else accelStatus = "low";

  const firstAt = new Date(pings[0].recorded_at).getTime();
  const lastAt = new Date(pings[pings.length - 1].recorded_at).getTime();
  const durationMin = (lastAt - firstAt) / 60000;
  const allInside = pings.every((p: any) => p.inside_radius === true);

  // High criteria
  const highMatch = totalMovement < 10 && durationMin >= 120 && allInside &&
    (accelStatus === "none" || (accelStatus === "unknown" && gpsVariance < 3));
  // Medium criteria
  const mediumMatch = !highMatch && totalMovement < 15 && durationMin >= 90 &&
    (accelStatus === "low" || accelStatus === "none" || (accelStatus === "unknown" && gpsVariance < 5));

  if (!mediumMatch && !highMatch) return { skipped: "no_match", total_movement_m: totalMovement };

  const level: "medium" | "high" = highMatch ? "high" : "medium";

  // Avoid duplicate open flag of same level for same session
  const { data: existingFlag } = await admin.from("stationary_device_flags")
    .select("id").eq("check_in_id", checkIn.id).eq("risk_level", level).eq("status", "open").maybeSingle();
  if (existingFlag) return { skipped: "already_flagged", level };

  const { data: flagRow } = await admin.from("stationary_device_flags").insert({
    check_in_id: checkIn.id, user_id: checkIn.user_id, organization_id: checkIn.organization_id,
    project_id: checkIn.project_id, risk_level: level,
    started_at: pings[0].recorded_at, ended_at: pings[pings.length - 1].recorded_at,
    duration_minutes: Math.round(durationMin),
    total_movement_m: Math.round(totalMovement * 10) / 10,
    gps_variance_m: Math.round(gpsVariance * 10) / 10,
    avg_accuracy_m: Math.round(avgAccuracy * 10) / 10,
    accelerometer_activity: accelStatus,
  }).select("id").maybeSingle();

  await applyRiskDelta(admin, checkIn.user_id, checkIn.organization_id,
    level === "high" ? "stationary_high" : "stationary_medium",
    { reason: `Stationär enhet: ${Math.round(totalMovement)}m / ${Math.round(durationMin)} min`, flag_id: flagRow?.id });

  await admin.from("notifications").insert({
    organization_id: checkIn.organization_id, user_id: checkIn.user_id,
    type: "security_anomaly",
    title: level === "high" ? "Möjlig ghost presence" : "Ovanligt låg aktivitet",
    message: `Enheten har rört sig ${Math.round(totalMovement)} m på ${Math.round(durationMin)} minuter.`,
    priority: level === "high" ? "high" : "medium", action_required: true,
  });

  return { flagged: level, total_movement_m: totalMovement, duration_minutes: durationMin, flag_id: flagRow?.id };
}

async function sweepMissedManual(admin: any) {
  const { data: expired } = await admin.from("manual_presence_verifications")
    .select("id, user_id, organization_id, flag_id").eq("status", "pending").lt("expires_at", new Date().toISOString());
  for (const v of expired || []) {
    await admin.from("manual_presence_verifications").update({
      status: "missed", completed_at: new Date().toISOString(), failure_reason: "Tidsfrist överskreds",
    }).eq("id", v.id);
    await applyRiskDelta(admin, v.user_id, v.organization_id, "manual_verification_missed",
      { reason: "Manuell verifiering missad", verification_id: v.id, flag_id: v.flag_id });
    await admin.from("notifications").insert({
      organization_id: v.organization_id, user_id: v.user_id, type: "security_anomaly",
      title: "Manuell verifiering missad", message: "Användaren svarade inte inom 5 minuter.",
      priority: "high", action_required: true,
    });
  }
  return expired?.length ?? 0;
}

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

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const checkInId: string | undefined = body?.check_in_id;

    let q = admin.from("worker_check_ins")
      .select("id, user_id, organization_id, project_id, check_in_at, check_out_at")
      .is("check_out_at", null);
    if (checkInId) q = q.eq("id", checkInId);
    const { data: sessions } = await q;

    const results: any[] = [];
    for (const s of sessions || []) {
      try { results.push({ check_in_id: s.id, ...(await analyzeCheckIn(admin, s)) }); }
      catch (e) { console.error("analyze err", e); results.push({ check_in_id: s.id, error: (e as Error).message }); }
    }
    const sweptMissed = await sweepMissedManual(admin);
    return new Response(JSON.stringify({ ok: true, analyzed: results, missed_swept: sweptMissed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
