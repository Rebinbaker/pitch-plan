import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContainerSummary {
  name: string;
  description: string;
  quantity: number;
  size: string;
  type: string;
}

interface ContainerOrderRequest {
  projectName: string;
  projectAddress: string;
  containers: ContainerSummary[];
  emailContent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectName, 
      projectAddress, 
      containers,
      emailContent 
    }: ContainerOrderRequest = await req.json();
    
    const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);
    console.log('Sending container order email for project:', projectName, 'total containers:', totalContainers);

    // Generate container list HTML
    const containerListHtml = containers.map(container => `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #333333; font-size: 16px;">${container.quantity}x ${container.name}</strong>
          <div>
            <span style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px;">${container.size}</span>
            <span style="background: #dee2e6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${container.type}</span>
          </div>
        </div>
        <p style="color: #666666; margin: 0; font-size: 14px;">${container.description}</p>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Container-beställning - ${totalContainers} container${totalContainers > 1 ? 's' : ''}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px;">
              <h1 style="color: #333333; margin: 0; font-size: 24px; font-weight: 700;">
                🚛 Container-beställning
              </h1>
              <p style="color: #666666; margin: 10px 0 0 0; font-size: 16px;">
                ${totalContainers} container${totalContainers > 1 ? 's' : ''} för ${projectName}
              </p>
            </div>
            
            <!-- Project details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📋 Projektdetaljer
              </h2>
              <div style="color: #555555; line-height: 1.6;">
                <p style="margin: 5px 0;"><strong>Projekt:</strong> ${projectName}</p>
                <p style="margin: 5px 0;"><strong>Adress:</strong> ${projectAddress}</p>
                <p style="margin: 5px 0;"><strong>Antal containers:</strong> ${totalContainers}</p>
              </div>
            </div>
            
            <!-- Container list -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📦 Beställda containers
              </h2>
              ${containerListHtml}
            </div>
            
            <!-- Email content -->
            <div style="color: #333333; line-height: 1.8; font-size: 15px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📧 Beställningsmeddelande
              </h2>
              <div style="background: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; white-space: pre-line;">
                ${emailContent}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888888; font-size: 14px; margin: 0;">
                Skickat från <strong style="color: #333333;">Lokala Hantverkarna</strong> projektsystem
              </p>
              <p style="color: #888888; font-size: 12px; margin: 10px 0 0 0;">
                ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE')}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to container supplier (in production, this would be the actual supplier email)
    const emailResponse = await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: ["container@example.com"], // Replace with actual supplier email
      subject: `Container-beställning - ${totalContainers} container${totalContainers > 1 ? 's' : ''} - ${projectAddress}`,
      html: emailHtml,
      text: emailContent, // Plain text fallback
    });

    console.log("Container order email sent:", emailResponse);

    // Also send a copy to the project team for confirmation
    await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: ["team@lokalahantverkarna.se"], // Replace with actual team email
      subject: `[KOPIA] Container-beställning - ${totalContainers} container${totalContainers > 1 ? 's' : ''} - ${projectAddress}`,
      html: emailHtml,
      text: `KOPIA AV CONTAINER-BESTÄLLNING:\n\n${emailContent}`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Container order sent successfully",
      totalContainers,
      containers: containers.map(c => `${c.quantity}x ${c.name}`).join(', '),
      projectName
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending container order email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);