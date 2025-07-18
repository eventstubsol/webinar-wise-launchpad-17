
import React from "react";
import { EmailTemplate } from "@/types/email";
import { SafeHtml } from "@/utils/htmlSanitizer";

interface EmailPreviewProps {
  template: EmailTemplate;
  sampleData: Record<string, any>;
}

export function EmailPreview({ template, sampleData }: EmailPreviewProps) {
  let html = template.html_template;
  template.variables?.forEach((v) => {
    html = html.replace(new RegExp(`{{\\s*${v}\\s*}}`, "g"), sampleData[v] ?? "");
  });

  return (
    <div className="border rounded p-6 bg-background shadow">
      <div className="font-bold mb-2">Preview</div>
      <SafeHtml html={html} />
    </div>
  );
}
