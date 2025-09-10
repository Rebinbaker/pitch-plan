import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MaterialOrderRequest {
  projectName: string;
  projectAddress: string;
  teamName: string;
  orderText: string;
  totalCost?: number;
  items: Array<{
    materialType: string;
    quantity: number;
    unit: string;
    notes?: string;
    estimatedCost?: number;
  }>;
  salvageUsed?: Array<{
    materialType: string;
    quantity: number;
    sourceProject: string;
  }>;
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
      teamName, 
      orderText,
      totalCost,
      items,
      salvageUsed = []
    }: MaterialOrderRequest = await req.json();
    
    console.log('Sending material order for project:', projectName, 'team:', teamName);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Materialbeställning - ${projectName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 700px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px;">
              <h1 style="color: #333333; margin: 0; font-size: 24px; font-weight: 700;">
                📦 Materialbeställning
              </h1>
              <p style="color: #666666; margin: 10px 0 0 0; font-size: 16px;">
                Automatiskt genererad från materiallista
              </p>
            </div>
            
            <!-- Project details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                🏗️ Projektinformation
              </h2>
              <div style="color: #555555; line-height: 1.6;">
                <p style="margin: 5px 0;"><strong>Projekt:</strong> ${projectName}</p>
                <p style="margin: 5px 0;"><strong>Adress:</strong> ${projectAddress}</p>
                <p style="margin: 5px 0;"><strong>Bygglag:</strong> ${teamName}</p>
                <p style="margin: 5px 0;"><strong>Beställningsdatum:</strong> ${new Date().toLocaleDateString('sv-SE')}</p>
                ${totalCost ? `<p style="margin: 5px 0;"><strong>Uppskattat värde:</strong> ${totalCost.toLocaleString('sv-SE')} SEK</p>` : ''}
              </div>
            </div>
            
            <!-- Material items -->
            ${items.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📋 Materialspecifikation
              </h2>
              <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f8f9fa;">
                      <th style="text-align: left; padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">Material</th>
                      <th style="text-align: right; padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">Kvantitet</th>
                      <th style="text-align: right; padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">Enhet</th>
                      ${items.some(item => item.estimatedCost) ? '<th style="text-align: right; padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #333;">Uppskattat pris</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((item, index) => `
                      <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 12px; color: #333;">
                          ${item.materialType}
                          ${item.notes ? `<br><small style="color: #666; font-style: italic;">${item.notes}</small>` : ''}
                        </td>
                        <td style="text-align: right; padding: 12px; color: #333; font-weight: 500;">${item.quantity}</td>
                        <td style="text-align: right; padding: 12px; color: #666;">${item.unit}</td>
                        ${item.estimatedCost ? `<td style="text-align: right; padding: 12px; color: #333; font-weight: 500;">${item.estimatedCost.toLocaleString('sv-SE')} SEK</td>` : items.some(i => i.estimatedCost) ? '<td></td>' : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            ` : ''}
            
            <!-- Salvage materials used -->
            ${salvageUsed.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                ♻️ Använt material från lager
              </h2>
              <div style="background: #e8f5e8; border: 1px solid #c3e6c3; padding: 15px; border-radius: 6px;">
                ${salvageUsed.map(item => `
                  <div style="margin: 5px 0; color: #2d5a2d;">
                    • ${item.quantity} ${item.materialType} (från ${item.sourceProject})
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            <!-- Order text -->
            <div style="margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📧 Beställningstext
              </h2>
              <div style="background: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; white-space: pre-line; color: #333; line-height: 1.6;">
                ${orderText}
              </div>
            </div>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f0f8ff; border: 1px solid #b6d7ff; border-radius: 6px;">
              <h3 style="color: #0066cc; margin: 0 0 10px 0;">📞 Nästa steg</h3>
              <p style="color: #333; margin: 10px 0; font-size: 14px;">
                Denna beställning är nu klar att skickas till leverantör. 
                Kontakta er materialleverantör för att genomföra beställningen.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888888; font-size: 14px; margin: 0;">
                Automatiskt genererad materialbeställning från <strong>Lokala Hantverkarna</strong> projektsystem
              </p>
              <p style="color: #888888; font-size: 12px; margin: 10px 0 0 0;">
                ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE')}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to material supplier (in production, use actual supplier email)
    const emailResponse = await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: ["material@leverantör.se"], // Replace with actual supplier email
      subject: `Materialbeställning - ${projectName} - ${projectAddress}`,
      html: emailHtml,
      text: orderText, // Plain text fallback
    });

    console.log("Material order email sent:", emailResponse);

    // Also send a copy to the project team for confirmation
    await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: ["team@lokalahantverkarna.se"], // Replace with actual team email
      subject: `[KOPIA] Materialbeställning skickad - ${projectName}`,
      html: emailHtml.replace('📦 Materialbeställning', '📦 [KOPIA] Materialbeställning skickad'),
      text: `KOPIA AV MATERIALBESTÄLLNING:\n\n${orderText}`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Material order sent successfully",
      projectName,
      teamName,
      itemCount: items.length,
      totalCost
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending material order email:", error);
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