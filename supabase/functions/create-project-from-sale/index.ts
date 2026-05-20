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

const PDF_KEY_HINT = /(pdf|quote|offert|offer)/i;
const BASE64_CHUNK_SIZE = 4 * 8192;

const normalizeBase64Pdf = (value: string): string => {
  let normalized = value.trim();

  const commaIndex = normalized.indexOf(',');
  if (commaIndex !== -1 && normalized.slice(0, commaIndex).toLowerCase().includes('base64')) {
    normalized = normalized.slice(commaIndex + 1);
  }

  normalized = normalized.replace(/\s/g, '');

  if (!normalized) {
    throw new Error('Incoming quote PDF base64 payload was empty after normalization');
  }

  const remainder = normalized.length % 4;
  if (remainder !== 0) {
    normalized = normalized.padEnd(normalized.length + (4 - remainder), '=');
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    throw new Error('Incoming quote PDF payload is not valid base64');
  }

  return normalized;
};

const decodeBase64PdfChunked = (base64Payload: string): Uint8Array => {
  const normalized = normalizeBase64Pdf(base64Payload);
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  const expectedLength = Math.floor((normalized.length * 3) / 4) - padding;
  const bytes = new Uint8Array(expectedLength);

  let offset = 0;

  for (let i = 0; i < normalized.length; i += BASE64_CHUNK_SIZE) {
    const chunk = normalized.slice(i, i + BASE64_CHUNK_SIZE);
    const binaryChunk = atob(chunk);

    for (let j = 0; j < binaryChunk.length; j++) {
      bytes[offset++] = binaryChunk.charCodeAt(j);
    }
  }

  return offset === expectedLength ? bytes : bytes.slice(0, offset);
};

const toUint8Array = (value: unknown): Uint8Array | null => {
  if (!value) return null;

  if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number')) {
    return Uint8Array.from(value as number[]);
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;

    // Node.js Buffer JSON format: { type: "Buffer", data: [37, 80, 68, 70, ...] }
    if (
      candidate.type === 'Buffer' &&
      Array.isArray(candidate.data) &&
      candidate.data.length > 0 &&
      candidate.data.every((item) => typeof item === 'number')
    ) {
      return Uint8Array.from(candidate.data as number[]);
    }

    // Uint8Array serialized as object with numeric keys: {"0":37,"1":80,...}
    const numericEntries = Object.entries(candidate)
      .filter(([key, val]) => /^\d+$/.test(key) && typeof val === 'number')
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (numericEntries.length > 0) {
      return Uint8Array.from(numericEntries.map(([, val]) => Number(val)));
    }
  }

  return null;
};

const getValueAtPath = (obj: Record<string, unknown>, path: string): unknown => {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
};

const resolvePdfPayload = (payload: Record<string, unknown>) => {
  const base64Paths = [
    'quote_pdf_base64',
    'quotePdfBase64',
    'quote_pdf',
    'quote.base64',
    'quote.pdf_base64',
    'quote.pdfBase64',
    'quote.content_base64',
    'quoteFile.base64',
    'quote_file.base64',
    'files.quote.base64',
    'documents.quote.base64',
  ];

  const urlPaths = [
    'quote_pdf_url',
    'quotePdfUrl',
    'quote_url',
    'quote.url',
    'quote.pdf_url',
    'quote.pdfUrl',
    'quoteFile.url',
    'quote_file.url',
    'files.quote.url',
    'documents.quote.url',
  ];

  const filenamePaths = [
    'quote_pdf_filename',
    'quotePdfFilename',
    'quote_filename',
    'quote.filename',
    'quote.fileName',
    'quote.name',
    'quoteFile.filename',
    'quote_file.filename',
  ];

  for (const path of base64Paths) {
    const value = getValueAtPath(payload, path);
    if (typeof value === 'string' && value.trim().length > 50) {
      return { base64: value, binary: null, url: null, filename: null, sourcePath: path };
    }

    const binaryValue = toUint8Array(value);
    if (binaryValue && binaryValue.length > 0) {
      return { base64: null, binary: binaryValue, url: null, filename: null, sourcePath: path };
    }
  }

  for (const path of urlPaths) {
    const value = getValueAtPath(payload, path);
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      return { base64: null, binary: null, url: value, filename: null, sourcePath: path };
    }
  }

  const stack: Array<{ path: string; value: unknown }> = [{ path: '', value: payload }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !current.value || typeof current.value !== 'object') continue;

    for (const [key, value] of Object.entries(current.value as Record<string, unknown>)) {
      const nextPath = current.path ? `${current.path}.${key}` : key;

      if (typeof value === 'string' && PDF_KEY_HINT.test(nextPath)) {
        const trimmed = value.trim();
        if (trimmed.startsWith('data:application/pdf;base64,')) {
          return { base64: trimmed, binary: null, url: null, filename: null, sourcePath: nextPath };
        }
        if (trimmed.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
          return { base64: trimmed, binary: null, url: null, filename: null, sourcePath: nextPath };
        }
        if (/^https?:\/\//i.test(trimmed) && /\.pdf(\?|$)/i.test(trimmed)) {
          return { base64: null, binary: null, url: trimmed, filename: null, sourcePath: nextPath };
        }
      }

      if (PDF_KEY_HINT.test(nextPath)) {
        const binaryValue = toUint8Array(value);
        if (binaryValue && binaryValue.length > 0) {
          return { base64: null, binary: binaryValue, url: null, filename: null, sourcePath: nextPath };
        }
      }

      if (value && typeof value === 'object') {
        stack.push({ path: nextPath, value });
      }
    }
  }

  const filenameFromPath = filenamePaths
    .map((path) => getValueAtPath(payload, path))
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return { base64: null, binary: null, url: null, filename: filenameFromPath ?? null, sourcePath: null };
};

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
      responsible_booker,
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


    const topLevelKeys = Object.keys(body || {});
    const quoteKeys = quote && typeof quote === 'object' ? Object.keys(quote as Record<string, unknown>) : [];
    console.log('CRM payload keys:', topLevelKeys);
    if (quoteKeys.length > 0) {
      console.log('CRM quote payload keys:', quoteKeys);
    }

    const detectedPdfPayload = resolvePdfPayload(body as Record<string, unknown>);
    console.log('Quote payload diagnostics:', {
      quote_pdf_base64_type: typeof quote_pdf_base64,
      quote_pdf_base64_length: typeof quote_pdf_base64 === 'string' ? quote_pdf_base64.length : null,
      quote_pdf_base64_is_array: Array.isArray(quote_pdf_base64),
      quote_pdf_base64_object_keys:
        quote_pdf_base64 && typeof quote_pdf_base64 === 'object'
          ? Object.keys(quote_pdf_base64 as Record<string, unknown>).slice(0, 10)
          : [],
      quote_pdf_url_type: typeof quote_pdf_url,
      detected_source_path: detectedPdfPayload.sourcePath,
      detected_has_binary: Boolean(detectedPdfPayload.binary),
      detected_has_base64: Boolean(detectedPdfPayload.base64),
      detected_has_url: Boolean(detectedPdfPayload.url),
    });

    const incomingPdfBase64Candidate =
      quote_pdf_base64 ||
      quotePdfBase64 ||
      quote_pdf ||
      quote?.pdf_base64 ||
      quote?.pdfBase64 ||
      detectedPdfPayload.base64 ||
      null;

    let incomingPdfBase64 =
      typeof incomingPdfBase64Candidate === 'string' && incomingPdfBase64Candidate.trim().length > 0
        ? incomingPdfBase64Candidate
        : null;

    const incomingPdfFilenameCandidate =
      quote_pdf_filename ||
      quotePdfFilename ||
      quote_filename ||
      quote?.filename ||
      quote?.fileName ||
      detectedPdfPayload.filename ||
      `Offert_${customer_name || 'projekt'}.pdf`;

    const incomingPdfFilename =
      typeof incomingPdfFilenameCandidate === 'string' && incomingPdfFilenameCandidate.trim().length > 0
        ? incomingPdfFilenameCandidate
        : `Offert_${customer_name || 'projekt'}.pdf`;

    const incomingPdfUrlCandidate =
      quote_pdf_url ||
      quotePdfUrl ||
      quote?.pdf_url ||
      quote?.pdfUrl ||
      detectedPdfPayload.url ||
      null;

    const incomingPdfUrl = typeof incomingPdfUrlCandidate === 'string' ? incomingPdfUrlCandidate : null;

    const incomingPdfBinary = detectedPdfPayload.binary || null;

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

    if (incomingPdfBase64 || incomingPdfUrl || incomingPdfBinary) {
      quotePdfReceived = true;
      console.log(
        "Quote PDF payload received for project:",
        project.id,
        "sourcePath:",
        detectedPdfPayload.sourcePath || 'legacy_field_mapping',
        "hasBase64:",
        Boolean(incomingPdfBase64),
        "hasBinary:",
        Boolean(incomingPdfBinary),
        "hasUrl:",
        Boolean(incomingPdfUrl),
        "filename:",
        incomingPdfFilename
      );

      try {
        let pdfBytes: Uint8Array;

        if (incomingPdfBinary) {
          pdfBytes = incomingPdfBinary;
        } else if (incomingPdfBase64) {
          pdfBytes = decodeBase64PdfChunked(incomingPdfBase64);
          incomingPdfBase64 = null;
        } else {
          const pdfResponse = await fetch(incomingPdfUrl as string);
          if (!pdfResponse.ok) {
            throw new Error(`Failed to download quote PDF from URL (${pdfResponse.status})`);
          }

          const downloadedBytes = new Uint8Array(await pdfResponse.arrayBuffer());
          if (downloadedBytes.length === 0) {
            throw new Error("Downloaded quote PDF was empty");
          }

          pdfBytes = downloadedBytes;
        }

        const safeFileName = incomingPdfFilename.replace(/[\\/]/g, '-');
        const storagePath = `${project.id}/${safeFileName}`;

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
              name: safeFileName,
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
            console.log("Quote PDF stored for project:", project.id, "file:", safeFileName);
          }
        }
      } catch (pdfError) {
        console.error("Error decoding/downloading/processing PDF:", pdfError);
      }
    } else {
      console.log(
        "No quote PDF payload provided for project:",
        project.id,
        "(checked keys: quote_pdf_base64, quotePdfBase64, quote_pdf, quote.pdf_base64, quote_pdf_url, quotePdfUrl)",
        "payload keys:",
        topLevelKeys,
        "quote keys:",
        quoteKeys
      );
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
