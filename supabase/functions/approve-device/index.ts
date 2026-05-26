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

    // Check admin
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { device_row_id, action } = await req.json(); // action: 'approve' | 'reject'
    if (!device_row_id || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: targetDevice } = await admin.from("user_devices").select("id, user_id").eq("id", device_row_id).maybeSingle();
    if (!targetDevice) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const now = new Date().toISOString();
    if (action === "approve") {
      // Revoke all currently approved devices for this user
      await admin.from("user_devices")
        .update({ status: "revoked", revoked_at: now })
        .eq("user_id", targetDevice.user_id)
        .eq("status", "approved");
      await admin.from("user_devices")
        .update({ status: "approved", approved_at: now, approved_by: adminId, revoked_at: null })
        .eq("id", device_row_id);
    } else {
      await admin.from("user_devices")
        .update({ status: "revoked", revoked_at: now, approved_by: adminId })
        .eq("id", device_row_id);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
