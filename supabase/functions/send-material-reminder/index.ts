import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MaterialReminderRequest {
  projectName: string;
  projectAddress: string;
  teamName: string;
  teamLeader?: string;
  teamEmail?: string;
  reminderType: 'initial' | 'follow_up';
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
      teamLeader, 
      teamEmail,
      reminderType = 'initial'
    }: MaterialReminderRequest = await req.json();
    
    console.log('Sending material reminder for project:', projectName, 'team:', teamName);

    const isFollowUp = reminderType === 'follow_up';
    const subjectPrefix = isFollowUp ? '[PÅMINNELSE] ' : '';
    const urgencyText = isFollowUp ? 'PÅMINNELSE: ' : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${urgencyText}Materiallista behöver fyllas i</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px;">
              <h1 style="color: ${isFollowUp ? '#d73527' : '#333333'}; margin: 0; font-size: 24px; font-weight: 700;">
                ${isFollowUp ? '🔔 PÅMINNELSE' : '📋'} Materiallista behöver fyllas i
              </h1>
              ${isFollowUp ? `
                <div style="background: #fee; border: 1px solid #fcc; color: #d73527; padding: 10px; border-radius: 4px; margin-top: 15px;">
                  <strong>⚠️ Detta är en påminnelse - materialistan har inte fyllts i än!</strong>
                </div>
              ` : ''}
            </div>
            
            <!-- Project details -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                🏗️ Projektdetaljer
              </h2>
              <div style="color: #555555; line-height: 1.6;">
                <p style="margin: 5px 0;"><strong>Projekt:</strong> ${projectName}</p>
                <p style="margin: 5px 0;"><strong>Adress:</strong> ${projectAddress}</p>
                <p style="margin: 5px 0;"><strong>Tilldelat lag:</strong> ${teamName}</p>
                ${teamLeader ? `<p style="margin: 5px 0;"><strong>Lagledare:</strong> ${teamLeader}</p>` : ''}
              </div>
            </div>
            
            <!-- Instructions -->
            <div style="color: #333333; line-height: 1.8; font-size: 15px; margin-bottom: 25px;">
              <h2 style="color: #333333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                📝 Instruktioner
              </h2>
              <p>Hej ${teamLeader ? teamLeader : teamName}!</p>
              
              ${isFollowUp ? `
                <p style="color: #d73527; font-weight: bold;">
                  Detta är en påminnelse om att materialistan för ovanstående projekt inte har fyllts i än.
                </p>
              ` : ''}
              
              <p>
                Material för projektet <strong>${projectName}</strong> har markerats som klart ✅. 
                Nu behöver ni som bygglag fylla i en komplett materiallista i samband med leverans av ställningsvagn.
              </p>
              
              <div style="background: #fff3cd; border: 1px solid #ffecb5; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">⚡ Viktigt att göra:</h3>
                <ol style="margin: 10px 0 0 20px; padding: 0;">
                  <li>Logga in i projektsystemet</li>
                  <li>Gå till projektet "${projectName}"</li>
                  <li>Klicka på fliken "Material"</li>
                  <li>Fyll i alla material som behövs för projektet</li>
                  <li>Ange kvantiteter och eventuella kommentarer</li>
                  <li>Spara och markera som "Klar för beställning"</li>
                </ol>
              </div>
              
              <p>
                När ni fyllt i materialistan kommer systemet automatiskt att generera en färdig beställning 
                som skickas vidare för inköp.
              </p>
              
              ${isFollowUp ? `
                <div style="background: #fee; border: 1px solid #fcc; color: #d73527; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <strong>⏰ Deadline:</strong> Vänligen fyll i materialistan så snart som möjligt för att undvika förseningar i projektet.
                </div>
              ` : ''}
            </div>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://lokalahantverkarna.se" 
                 style="background: ${isFollowUp ? '#d73527' : 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'}; 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block; 
                        font-weight: bold; 
                        font-size: 16px;">
                ${isFollowUp ? '🔥 Fyll i materialistan NU' : '📋 Öppna projektsystemet'}
              </a>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888888; font-size: 14px; margin: 0;">
                Har ni frågor? Kontakta projektledningen.
              </p>
              <p style="color: #888888; font-size: 12px; margin: 10px 0 0 0;">
                Automatiskt meddelande från <strong>Lokala Hantverkarna</strong> projektsystem
              </p>
              <p style="color: #888888; font-size: 12px; margin: 5px 0 0 0;">
                ${new Date().toLocaleDateString('sv-SE')} ${new Date().toLocaleTimeString('sv-SE')}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainTextContent = `
${urgencyText}Materiallista behöver fyllas i

Projekt: ${projectName}
Adress: ${projectAddress}
Tilldelat lag: ${teamName}
${teamLeader ? `Lagledare: ${teamLeader}` : ''}

${isFollowUp ? 'PÅMINNELSE: ' : ''}Material för projektet har markerats som klart. Nu behöver ni fylla i en komplett materiallista i projektsystemet.

Instruktioner:
1. Logga in i projektsystemet
2. Gå till projektet "${projectName}"
3. Klicka på fliken "Material"
4. Fyll i alla material som behövs
5. Spara och markera som "Klar för beställning"

${isFollowUp ? 'Vänligen fyll i materialistan så snart som möjligt för att undvika förseningar.' : ''}

Öppna projektsystemet: https://lokalahantverkarna.se

Med vänliga hälsningar,
Lokala Hantverkarna projektsystem
    `;

    // Send to team email (in production, use actual team email)
    const recipientEmail = teamEmail || "team@lokalahantverkarna.se";
    
    const emailResponse = await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: [recipientEmail],
      subject: `${subjectPrefix}Materiallista behöver fyllas i - ${projectName}`,
      html: emailHtml,
      text: plainTextContent,
    });

    console.log("Material reminder email sent:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Material reminder sent successfully",
      projectName,
      teamName,
      reminderType
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending material reminder email:", error);
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