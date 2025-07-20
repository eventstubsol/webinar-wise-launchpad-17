
import React from "react";
import { EmailTemplate } from "@/types/email";

interface EmailPreviewProps {
  template: EmailTemplate;
  sampleData: Record<string, any>;
}

export function EmailPreview({ template, sampleData }: EmailPreviewProps) {
  function renderHtml(html: string) {
    // Don't use dangerouslySetInnerHTML in prod apps unless sanitized!
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }
  let html = template.html_template;
  template.variables?.forEach((v) => {
    html = html.replace(new RegExp(`{{\\s*${v}\\s*}}`, "g"), sampleData[v] ?? "");
  });

  return (
    <div className="border rounded p-6 bg-background shadow">
      <div className="font-bold mb-2">Preview</div>
      {renderHtml(html)}
    </div>
  );
}
