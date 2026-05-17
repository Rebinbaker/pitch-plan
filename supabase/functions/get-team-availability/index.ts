import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function haversineKm(a: {lat:number,lng:number}, b:{lat:number,lng:number}) {
  const R = 6371, toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2*Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat));
  return 2*R*Math.asin(Math.sqrt(h));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // API-key skydd (samma mönster som create-project-from-sale)
  const expected = Deno.env.get("CRM_API_KEY") ?? Deno.env.get("PROJECT_MGMT_API_KEY");
  if (expected && req.headers.get("x-api-key") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type":"application/json" } });
  }

  try {
    const { object_lat, object_lng } = await req.json().catch(()=>({}));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Hämta alla aktiva team
    const { data: teams, error: tErr } = await supabase.from("teams").select("id, name");
    if (tErr) throw tErr;

    const today = new Date();
    const results = [];

    for (const team of teams ?? []) {
      // Senaste planerade projekt för teamet (sorterat på construction_start_week desc)
      // OBS: schemat har inte assigned_team_id – vi matchar via construction_team (text)
      const { data: lastProj } = await supabase
        .from("projects")
        .select("address, construction_start_week, estimated_work_days, latitude, longitude")
        .ilike("construction_team", team.name)
        .order("construction_start_week", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextAvailable = today;
      if (lastProj?.construction_start_week) {
        // Parse "YYYY-Www" → datum för måndag den veckan + arbetstid
        const m = lastProj.construction_start_week.match(/(\d{4})-W(\d{1,2})/);
        if (m) {
          const y = Number(m[1]), w = Number(m[2]);
          const jan4 = new Date(Date.UTC(y, 0, 4));
          const dayOfWeek = (jan4.getUTCDay() + 6) % 7;
          const monday = new Date(jan4); monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + (w-1)*7);
          monday.setUTCDate(monday.getUTCDate() + (lastProj.estimated_work_days ?? 5));
          if (monday > today) nextAvailable = monday;
        }
      }

      let distance_km: number | undefined;
      // latitude/longitude finns ännu inte i projects-tabellen.
      // Om/när de läggs till aktiveras avståndsberäkningen automatiskt.
      if (typeof object_lat === "number" && typeof object_lng === "number" &&
          lastProj?.latitude && lastProj?.longitude) {
        distance_km = Math.round(haversineKm(
          { lat: object_lat, lng: object_lng },
          { lat: lastProj.latitude, lng: lastProj.longitude },
        ) * 10) / 10;
      }

      results.push({
        id: team.id,
        name: team.name,
        next_available_date: nextAvailable.toISOString().split("T")[0],
        next_available_week: isoWeek(nextAvailable),
        last_project_address: lastProj?.address ?? null,
        last_project_lat: lastProj?.latitude ?? null,
        last_project_lng: lastProj?.longitude ?? null,
        distance_km,
      });
    }

    results.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
    return new Response(JSON.stringify({ teams: results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type":"application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type":"application/json" } });
  }
});
