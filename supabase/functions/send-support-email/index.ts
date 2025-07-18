import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Support email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const { name, email, subject, message }: SupportEmailRequest = await req.json();

    console.log("Sending support email from:", email, "Subject:", subject);

    // Send email to support team
    const emailResponse = await resend.emails.send({
      from: "Webinar Wise Support <noreply@webinarwise.io>",
      to: ["support@webinarwise.io"],
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3>Message:</h3>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p><em>This message was sent via the Webinar Wise support form.</em></p>
      `,
    });

    console.log("Support email sent successfully:", emailResponse);

    // Send confirmation email to user
    await resend.emails.send({
      from: "Webinar Wise Support <noreply@webinarwise.io>",
      to: [email],
      subject: "We received your support request",
      html: `
        <h2>Thank you for contacting us, ${name}!</h2>
        <p>We have received your support request and will get back to you within 24 hours.</p>
        <h3>Your message:</h3>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <strong>Subject:</strong> ${subject}<br><br>
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>Best regards,<br>The Webinar Wise Support Team</p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to send support email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);