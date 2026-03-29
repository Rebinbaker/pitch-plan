import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("CRM_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Validate required fields
    const { customer_name, address, customer_phone, responsible_seller, region, rot_status, organization_id } = body;

    if (!customer_name || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer_name and organization_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find an admin user to set as user_id (needed for the projects table)
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "No admin user found in organization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the project
    const projectName = `${customer_name} - ${address || "Nytt projekt"}`;

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: projectName,
        customer_name,
        address: address || null,
        customer_phone: customer_phone || null,
        responsible_seller: responsible_seller || null,
        region: region || null,
        rot_status: rot_status || null,
        organization_id,
        user_id: adminRole.user_id,
        status: "planned",
        completion_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create project", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Project created from CRM sale:", project.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        project_id: project.id,
        project_name: project.name,
        message: "Projekt skapat från Saleschamp CRM" 
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
