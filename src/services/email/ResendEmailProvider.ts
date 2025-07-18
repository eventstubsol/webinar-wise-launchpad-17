
// Interface for email providers

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || "";

interface IEmailServiceProvider {
  send(params: any): Promise<any>;
}

export const ResendEmailProvider: IEmailServiceProvider = {
  async send({ to, subject, html, from, metadata, abVariant }) {
    if (!RESEND_API_KEY) {
      return { success: false, error: "Resend API key missing" };
    }
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Webinar Wise <noreply@webinarwise.co>",
        to: [to],
        subject,
        html,
        ...metadata,
        headers: abVariant
          ? { "X-AB-Variant": abVariant }
          : undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || "Failed to send email" };
    }
    const result = await response.json();
    return { success: true, messageId: result.id };
  },
};
