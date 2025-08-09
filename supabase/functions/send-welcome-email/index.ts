import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  confirmationUrl: string;
  username?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl, username }: WelcomeEmailRequest = await req.json();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Välkommen till Lokala Hantverkarna</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #000000;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 50px 40px; border-radius: 10px; box-shadow: 0 20px 40px rgba(255, 255, 255, 0.1);">
            
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="https://pitch-plan.lovable.app/lovable-uploads/e784bfba-aa1d-4a91-a9f6-01f29efadff2.png" 
                   alt="Lokala Hantverkarna" 
                   style="max-width: 220px; height: auto; filter: brightness(1.2);">
            </div>
            
            <!-- Main content -->
            <div style="color: #ffffff; line-height: 1.7; text-align: center;">
              <h1 style="color: #ffffff; margin-bottom: 30px; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                🎉 Hej och välkommen!
              </h1>
              
              <p style="margin-bottom: 25px; font-size: 18px; color: #e0e0e0; font-weight: 300;">
                Vi är <strong style="color: #ffffff;">otroligt glada</strong> att du vill vara en del av <br>
                <span style="background: linear-gradient(45deg, #ff6b6b, #4ecdc4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 20px;">Lokala Hantverkarna</span>
              </p>
              
              <p style="margin-bottom: 35px; font-size: 16px; color: #cccccc;">
                Det är bara <strong style="color: #ffffff;">ett steg kvar</strong> - bekräfta din e-postadress genom att klicka på knappen nedan:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${confirmationUrl}" 
                   style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 18px 40px; 
                          text-decoration: none; 
                          border-radius: 50px; 
                          display: inline-block; 
                          font-weight: bold; 
                          font-size: 18px; 
                          text-transform: uppercase; 
                          letter-spacing: 1px;
                          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
                          transition: all 0.3s ease;">
                  ✨ Bekräfta min e-post ✨
                </a>
              </div>
              
              <div style="margin: 40px 0; height: 1px; background: linear-gradient(90deg, transparent, #333333, transparent);"></div>
              
              <p style="margin-bottom: 20px; font-size: 16px; color: #cccccc;">
                Har du frågor? <strong style="color: #ffffff;">Kontakta oss gärna</strong> - vi hjälper dig alltid! 💬
              </p>
              
              <p style="margin-bottom: 30px; font-size: 16px; color: #e0e0e0;">
                Varma hälsningar,<br>
                <strong style="color: #ffffff; font-size: 18px;">Lokala Hantverkarna i Sverige AB</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #333333; padding-top: 25px; margin-top: 40px; text-align: center;">
              <p style="color: #888888; font-size: 14px; margin: 0;">
                © 2025 <span style="color: #ffffff; font-weight: bold;">Lokala Hantverkarna i Sverige AB</span>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Lokala Hantverkarna <noreply@lokalahantverkarna.se>",
      to: [email],
      subject: "Välkommen till Lokala Hantverkarna - Bekräfta din e-post",
      html: emailHtml,
    });

    console.log("Välkomstemail skickat:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Fel vid skickning av välkomstemail:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);