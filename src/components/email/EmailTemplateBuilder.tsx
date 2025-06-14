
import React, { useState } from "react";
import { EmailTemplate } from "@/types/email";
import { MergeTagSelector } from "./MergeTagSelector";

interface EmailTemplateBuilderProps {
  template?: EmailTemplate;
  onChange?: (template: Partial<EmailTemplate>) => void;
}

export function EmailTemplateBuilder({ template, onChange }: EmailTemplateBuilderProps) {
  const [html, setHtml] = useState(template?.html_template || "<p>Hello, {{name}}</p>");
  const [variables, setVariables] = useState<string[]>(template?.variables || ["name"]);

  // For a real drag-and-drop builder, use libraries like react-dnd, but here's a basic version:
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

  return (
    <div className="space-y-4">
      <label className="font-semibold">HTML Template</label>
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
