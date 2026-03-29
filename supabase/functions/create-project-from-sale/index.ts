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
    const {
      customer_name,
      address,
      customer_phone,
      responsible_seller,
      region,
      rot_status,
      organization_id,
      construction_start_week,
      estimated_work_days,
      quote_pdf_base64,
      quote_pdf_filename,
      quotePdfBase64,
      quotePdfFilename,
      quote_pdf,
      quote_filename,
      quote_pdf_url,
      quotePdfUrl,
      quote,
    } = body;

    const incomingPdfBase64 =
      quote_pdf_base64 ||
      quotePdfBase64 ||
      quote_pdf ||
      quote?.pdf_base64 ||
      quote?.pdfBase64 ||
      null;

    const incomingPdfFilename =
      quote_pdf_filename ||
      quotePdfFilename ||
      quote_filename ||
      quote?.filename ||
      quote?.fileName ||
      `Offert_${customer_name}.pdf`;

    const incomingPdfUrl =
      quote_pdf_url ||
      quotePdfUrl ||
      quote?.pdf_url ||
      quote?.pdfUrl ||
      null;

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

    const projectName = address || "Nytt projekt";

    // Calculate start_date and deadline from construction_start_week and estimated_work_days
    let startDate = null;
    let deadline = null;
    if (construction_start_week) {
      // Parse ISO week format "2025-W33" or just week number "33" / "v33"
      let weekNumber: number;
      let year = new Date().getFullYear();
      if (construction_start_week.includes('-W')) {
        const parts = construction_start_week.split('-W');
        year = parseInt(parts[0], 10);
        weekNumber = parseInt(parts[1], 10);
      } else {
        weekNumber = parseInt(construction_start_week.replace(/[^0-9]/g, ''), 10);
      }
      if (!isNaN(weekNumber) && weekNumber >= 1 && weekNumber <= 53) {
        const jan4 = new Date(year, 0, 4);
        const mondayOfWeek1 = startOfWeek(jan4, { weekStartsOn: 1 });
        const targetDate = addWeeks(mondayOfWeek1, weekNumber - 1);
        startDate = format(targetDate, 'yyyy-MM-dd');
        if (estimated_work_days && estimated_work_days > 0) {
          deadline = format(addDays(targetDate, estimated_work_days - 1), 'yyyy-MM-dd');
        }
      }
    }

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
        construction_start_week: construction_start_week || null,
        estimated_work_days: estimated_work_days || null,
        start_date: startDate,
        deadline: deadline,
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

    // If quote PDF was provided, store it in Supabase Storage and create a file record
    let fileUrl = null;
    let quotePdfReceived = false;
    let quotePdfStored = false;

    if (quote_pdf_base64) {
      quotePdfReceived = true;
      console.log("Quote PDF received for project:", project.id, "filename:", quote_pdf_filename || "(default)");
      try {
        // Strip Data URL prefix if present (e.g. "data:application/pdf;base64,...")
        let rawBase64 = quote_pdf_base64;
        if (rawBase64.includes(',')) {
          rawBase64 = rawBase64.split(',')[1];
        }

        const pdfBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
        const fileName = quote_pdf_filename || `Offert_${customer_name}.pdf`;
        const storagePath = `${project.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(storagePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error("Error uploading PDF to storage:", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(storagePath);
          
          fileUrl = publicUrlData.publicUrl;

          const { error: fileError } = await supabase
            .from('files')
            .insert({
              name: fileName,
              type: 'pdf',
              url: fileUrl,
              size: pdfBytes.length,
              project_id: project.id,
              user_id: adminRole.user_id,
              organization_id,
            });

          if (fileError) {
            console.error("Error creating file record in DB:", fileError);
          } else {
            quotePdfStored = true;
            console.log("Quote PDF stored for project:", project.id, "file:", fileName);
          }
        }
      } catch (pdfError) {
        console.error("Error decoding/processing PDF:", pdfError);
      }
    } else {
      console.log("No quote_pdf_base64 provided for project:", project.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        project_id: project.id,
        project_name: project.name,
        quote_pdf_url: fileUrl,
        quote_pdf_received: quotePdfReceived,
        quote_pdf_stored: quotePdfStored,
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
