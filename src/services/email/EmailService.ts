
import { EmailTemplate, EmailSend } from "@/types/email";

export interface IEmailServiceProvider {
  send: (opts: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    metadata?: any;
    abVariant?: string;
  }) => Promise<{ success: boolean; error?: string; messageId?: string }>;
}

export interface IEmailTemplateEngine {
  render: (
    template: EmailTemplate,
    data: Record<string, any>
  ) => { html: string; subject: string };
}

export class EmailService {
  provider: IEmailServiceProvider;
  templateEngine: IEmailTemplateEngine;

  constructor(
    provider: IEmailServiceProvider,
    templateEngine: IEmailTemplateEngine
  ) {
    this.provider = provider;
    this.templateEngine = templateEngine;
  }

  async sendTemplatedEmail(
    template: EmailTemplate,
    recipient: string,
    data: Record<string, any>,
    subjectOverride?: string,
    abVariant?: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const { html, subject } = this.templateEngine.render(template, data);
    return this.provider.send({
      to: recipient,
      subject: subjectOverride || subject,
      html,
      abVariant,
    });
  }
}
