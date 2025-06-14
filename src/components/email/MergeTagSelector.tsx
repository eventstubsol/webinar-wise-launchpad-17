
import React from "react";

const STANDARD_TAGS = [
  { tag: "name", label: "Recipient Name" },
  { tag: "webinar_title", label: "Webinar Title" },
  { tag: "webinar_date", label: "Webinar Date" },
  { tag: "registration_url", label: "Registration URL" },
  { tag: "host_name", label: "Host Name" },
  { tag: "company", label: "Company" },
];

interface MergeTagSelectorProps {
  onInsertTag: (tag: string) => void;
}

export function MergeTagSelector({ onInsertTag }: MergeTagSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {STANDARD_TAGS.map(({tag, label}) => (
        <button
          type="button"
          key={tag}
          className="bg-accent border px-2 py-1 rounded text-xs"
          onClick={() => onInsertTag(tag)}
        >
          {"{{" + tag + "}}"}
          <span className="ml-1 text-muted-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
