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
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px 30px;">
            <!-- Logo -->
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://pitch-plan.lovable.app/lovable-uploads/e784bfba-aa1d-4a91-a9f6-01f29efadff2.png" 
                   alt="Lokala Hantverkarna" 
                   style="max-width: 200px; height: auto;">
            </div>
            
            <!-- Main content -->
            <div style="color: #333; line-height: 1.6;">
              <h1 style="color: #2c3e50; margin-bottom: 20px; font-size: 24px;">Hej och välkommen!</h1>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Vi är glada att du vill vara en del av Lokala Hantverkarna. Det är bara ett steg kvar - bekräfta din e-postadress genom att klicka här:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Bekräfta min e-post
                </a>
              </div>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Har du frågor? Kontakta oss gärna.
              </p>
              
              <p style="margin-bottom: 30px; font-size: 16px;">
                Varma hälsningar,<br>
                <strong>Lokala Hantverkarna i Sverige AB</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #777; font-size: 14px;">
              <p>© 2025 Lokala Hantverkarna i Sverige AB</p>
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