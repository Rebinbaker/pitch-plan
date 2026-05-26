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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
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
  } catch (e) {
    console.error("geocode fail", e);
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { check_in_id, lat, lng, accuracy, is_mocked, recorded_at } = body;

    if (!check_in_id || typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // load check-in + project radius
    const { data: checkIn, error: ciErr } = await admin
      .from("worker_check_ins")
      .select("id, user_id, organization_id, project_id, check_in_at, check_out_at")
      .eq("id", check_in_id)
      .single();

    if (ciErr || !checkIn) {
      return new Response(JSON.stringify({ error: "Check-in not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (checkIn.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (checkIn.check_out_at) {
      return new Response(JSON.stringify({ ok: true, closed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await admin
      .from("projects")
      .select("address, geofence_radius_m")
      .eq("id", checkIn.project_id)
      .single();

    const radius = Number(project?.geofence_radius_m ?? 50);

    // get project coords (first ping caches via address)
    let projectCoords: { lat: number; lng: number } | null = null;
    if (project?.address) {
      // use first ping's distance approach: geocode each call (cheap & cached by Nominatim)
      projectCoords = await geocodeAddress(project.address);
    }

    let distance: number | null = null;
    let insideRadius = true;
    if (projectCoords) {
      distance = haversineMeters(lat, lng, projectCoords.lat, projectCoords.lng);
      // GPS drift guard: accuracy worse than 30m -> treat as inside to avoid false positives
      const acc = Number(accuracy ?? 0);
      if (acc > 30) {
        insideRadius = true;
      } else {
        insideRadius = distance <= radius;
      }
    }

    const pingRecordedAt = recorded_at ? new Date(recorded_at).toISOString() : new Date().toISOString();

    // insert ping
    await admin.from("worker_location_pings").insert({
      check_in_id,
      user_id: userId,
      organization_id: checkIn.organization_id,
      recorded_at: pingRecordedAt,
      lat,
      lng,
      accuracy_m: accuracy ?? null,
      distance_m: distance,
      inside_radius: insideRadius,
      is_mocked: !!is_mocked,
    });

    // manage open absence period
    const { data: openAbsence } = await admin
      .from("worker_absence_periods")
      .select("id, left_at")
      .eq("check_in_id", check_in_id)
      .is("returned_at", null)
      .order("left_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!insideRadius && !openAbsence) {
      // left site - open new absence
      await admin.from("worker_absence_periods").insert({
        check_in_id,
        user_id: userId,
        organization_id: checkIn.organization_id,
        left_at: pingRecordedAt,
        status: is_mocked ? "rejected" : "pending",
        reason: is_mocked ? "Mock-GPS upptäckt – automatiskt avvisad" : null,
      });
    } else if (insideRadius && openAbsence) {
      // returned - close absence
      const leftAt = new Date(openAbsence.left_at).getTime();
      const returnedAt = new Date(pingRecordedAt).getTime();
      const durationMin = Math.max(0, Math.round((returnedAt - leftAt) / 60000));
      await admin
        .from("worker_absence_periods")
        .update({
          returned_at: pingRecordedAt,
          duration_minutes: durationMin,
        })
        .eq("id", openAbsence.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inside_radius: insideRadius,
        distance_m: distance,
        radius_m: radius,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ping error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
