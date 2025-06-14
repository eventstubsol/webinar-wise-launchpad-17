
import React from "react";
import { prebuiltTemplates } from "@/services/email/PrebuiltTemplatesData";
import { TemplateCard } from "./TemplateCard";
import { EmailTemplate } from "@/types/email";
import { nanoid } from "nanoid";

interface PrebuiltTemplatesProps {
  onSelectTemplate: (template: EmailTemplate) => void;
  filters: {
    category: string;
    search: string;
    tags: string[];
  };
}

export function PrebuiltTemplates({ onSelectTemplate, filters }: PrebuiltTemplatesProps) {
  // Convert prebuilt templates to EmailTemplate format
  const filteredTemplates = prebuiltTemplates
    .filter(template => {
      if (filters.category && template.category !== filters.category) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!template.name.toLowerCase().includes(searchLower) &&
            !template.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (filters.tags.length > 0) {
        if (!filters.tags.some(tag => template.tags.includes(tag))) return false;
      }
      return true;
    })
    .map(template => ({
      id: nanoid(),
      user_id: 'system',
      template_name: template.name,
      category: template.category as any,
      design_json: template.blocks,
      html_template: template.blocks
        .map(block => {
          switch (block.type) {
            case "text":
              return `<div style="margin:8px 0;">${block.content.text?.replace(/\n/g, "<br/>") || ""}</div>`;
            case "image":
              return block.content.url
                ? `<img src="${block.content.url}" alt="${block.content.alt}" style="max-width:100%;border-radius:4px;margin:8px 0;" />`
                : "";
            case "button":
              return `<a href="${block.content.url}" style="display:inline-block;margin:10px 0;padding:10px 20px;background:#2563eb;color:#fff;border-radius:4px;text-decoration:none;font-weight:600;">${block.content.label}</a>`;
            case "divider":
              return '<hr style="margin:16px 0;border:none;border-bottom:1px solid #ddd;" />';
            default:
              return "";
          }
        })
        .join(""),
      subject_template: `${template.name} - {{company_name}}`,
      template_type: "email",
      variables: template.variables,
      is_public: true,
      is_active: true,
      is_system_template: true,
      tags: template.tags,
      preview_image_url: template.preview_image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version_number: 1,
      usage_count: 0,
      rating: 5,
      rating_count: 10
    }));

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Pre-built Templates</h3>
        <p className="text-sm text-muted-foreground">
          Professional templates ready to use for your email campaigns.
        </p>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode="grid"
              onSelect={() => onSelectTemplate(template)}
              onDuplicate={() => {
                // For system templates, we just select them since users can't modify them directly
                onSelectTemplate(template);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
