
import React, { useState } from "react";

interface ABTestingPanelProps {
  variants: { subject: string; html: string; label: string }[];
  onSelect: (variantIndex: number) => void;
}

export function ABTestingPanel({ variants, onSelect }: ABTestingPanelProps) {
  const [selected, setSelected] = useState(0);
  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {variants.map((variant, i) => (
          <button
            key={i}
            className={`px-3 py-1 rounded border ${selected === i ? "bg-primary text-primary-foreground" : "bg-muted" }`}
            onClick={() => {
              setSelected(i);
              onSelect(i);
            }}
          >
            {variant.label || "Variant " + String.fromCharCode(65+i)}
          </button>
        ))}
      </div>
      <div>
        <div className="font-bold mb-1">Subject: {variants[selected]?.subject}</div>
        <div className="border rounded p-4">{variants[selected]?.html}</div>
      </div>
    </div>
  );
}
