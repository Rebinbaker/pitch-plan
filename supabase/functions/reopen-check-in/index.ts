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
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { check_in_id, action, note, new_check_out_at } = await req.json();
    // action: 'reopen' | 'set_checkout'
    if (!check_in_id) return new Response(JSON.stringify({ error: "check_in_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "reopen") {
      await admin.from("worker_check_ins").update({
        check_out_at: null,
        checkout_reason: "admin_override",
        auto_closed: false,
        notes: note ?? null,
      }).eq("id", check_in_id);
    } else if (action === "set_checkout" && new_check_out_at) {
      await admin.from("worker_check_ins").update({
        check_out_at: new_check_out_at,
        checkout_reason: "admin_override",
        notes: note ?? null,
      }).eq("id", check_in_id);
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
