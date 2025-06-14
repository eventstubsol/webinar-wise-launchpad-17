
import { EmailTemplate } from "@/types/email";

// Very simple {{merge_tag}} replacement engine.
// You can extend this to support conditionals and loops.
export const TemplateEngine = {
  render(template: EmailTemplate, data: Record<string, any>) {
    let html = template.html_template;
    let subject = template.template_name;
    // Replace merge tags in subject
    if (template.variables?.length) {
      for (const key of template.variables) {
        const value = data[key] ?? "";
        const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        html = html.replace(re, value);
        subject = subject.replace(re, value);
      }
    }
    return { html, subject };
  }
};
