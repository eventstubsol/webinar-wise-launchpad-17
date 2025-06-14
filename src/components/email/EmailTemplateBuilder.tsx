import React, { useState } from "react";
import { EmailTemplate } from "@/types/email";
import { MergeTagSelector } from "./MergeTagSelector";
import { EnhancedEmailTemplateBuilder } from "./template-builder/EnhancedEmailTemplateBuilder";
import { Button } from "@/components/ui/button";

interface EmailTemplateBuilderProps {
  template?: EmailTemplate;
  onChange?: (template: Partial<EmailTemplate>) => void;
}

export function EmailTemplateBuilder({ template, onChange }: EmailTemplateBuilderProps) {
  const [html, setHtml] = useState(template?.html_template || "<p>Hello, {{name}}</p>");
  const [variables, setVariables] = useState<string[]>(template?.variables || ["name"]);
  const [mode, setMode] = useState<"simple" | "designer">("designer");

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHtml(e.target.value);
    onChange?.({
      ...template,
      html_template: e.target.value,
      variables
    });
  };

  const handleAddTag = (tag: string) => {
    if (!variables.includes(tag)) {
      setVariables([...variables, tag]);
      onChange?.({
        ...template,
        html_template: html,
        variables: [...variables, tag]
      });
    }
  };

  if (mode === "designer") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <label className="font-semibold">Enhanced Email Template Designer</label>
          <Button size="sm" variant="outline" onClick={() => setMode("simple")}>
            Switch to Simple Mode
          </Button>
        </div>
        <EnhancedEmailTemplateBuilder
          templateBlocks={[]} // Optionally pass in converted blocks from template.html_template
          onChange={blocks => {
            // We convert blocks to HTML for storage, variables for merge tags handling
            const html = blocks
              .map(b => {
                switch (b.type) {
                  case "text":
                    return b.content.text || "";
                  case "image":
                    return `<img src="${b.content.url}" alt="${b.content.alt}" />`;
                  case "button":
                    return `<a href="${b.content.url}">${b.content.label}</a>`;
                  case "divider":
                    return `<hr />`;
                  default:
                    return "";
                }
              })
              .join("\n");
            onChange?.({
              html_template: html,
              variables: blocks
                .filter(b => b.type === "text" && typeof b.content.text === "string")
                .flatMap(b =>
                  [...b.content.text.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1])
                ),
              design_json: blocks,
              ...template,
            });
          }}
        />
      </div>
    );
  }

  // Old textarea mode (fallback)
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <label className="font-semibold">HTML Template</label>
        <Button size="sm" variant="outline" onClick={() => setMode("designer")}>
          Switch to Designer
        </Button>
      </div>
      <textarea
        className="w-full h-40 border rounded p-2 font-mono"
        value={html}
        onChange={handleHtmlChange}
        placeholder="Write email HTML. Use {{merge_tags}} for personalization."
      />
      <MergeTagSelector onInsertTag={handleAddTag} />
      <div className="text-xs text-muted-foreground">
        Use <code>{"{{name}}"}</code>, <code>{"{{webinar_title}}"}</code>, etc as merge tags.
      </div>
    </div>
  );
}
