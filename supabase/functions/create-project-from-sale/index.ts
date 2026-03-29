import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, addWeeks, format, startOfWeek } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const generateDefaultChecklist = () => [
  { id: crypto.randomUUID(), label: 'Containerbeställning', completed: false, weight: 5 },
  { id: crypto.randomUUID(), label: 'Ställningshantering', completed: false, weight: 5 },
  { id: crypto.randomUUID(), label: 'Schedule construction team', completed: false, weight: 2 },
  { id: crypto.randomUUID(), label: 'Skapa WhatsApp grupp', completed: false, weight: 1 },
  { id: crypto.randomUUID(), label: 'Materialbeställning', completed: false, weight: 5 },
  { id: crypto.randomUUID(), label: 'Dagliga egenkontroller', completed: false, weight: 5 },
  { id: crypto.randomUUID(), label: 'Boka hemtag av container', completed: false, weight: 3 },
  { id: crypto.randomUUID(), label: 'Nedmontering av ställningar', completed: false, weight: 4 },
  { id: crypto.randomUUID(), label: 'Slutsynbesiktning', completed: false, weight: 3 },
  { id: crypto.randomUUID(), label: 'Avvarat material?', completed: false, weight: 2 },
  { id: crypto.randomUUID(), label: 'Generera garantibevis', completed: false, weight: 3 },
  { id: crypto.randomUUID(), label: 'Mark ready for invoice', completed: false, weight: 5 },
];

const generateDefaultWorkPhases = () => [
  { id: crypto.randomUUID(), label: 'Rivning av pannor, läkt, nockregel', completed: false, weight: 10, estimatedDays: 1, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av ny råspont', completed: false, weight: 10, estimatedDays: 1, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av nockregel + trekantslist', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av underlagsduk', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av strö- & bärläkt', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av nockband, fotplåt', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av nya pannor', completed: false, weight: 15, estimatedDays: 1.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Skrapa & måla plåt, nya beslag', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Montering av snörasskydd', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Hängrännor & stuprör', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
  { id: crypto.randomUUID(), label: 'Bortforsling och städning', completed: false, weight: 5, estimatedDays: 0.5, requiresDailyInspection: true, imagesReceived: false, inspectionConfirmed: false },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("CRM_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { customer_name, address, customer_phone, responsible_seller, region, rot_status, organization_id, construction_start_week, estimated_work_days } = body;

    if (!customer_name || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer_name and organization_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        checklist: generateDefaultChecklist(),
        work_phases: generateDefaultWorkPhases(),
        activity_log: [],
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
