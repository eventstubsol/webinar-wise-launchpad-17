
import React from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { BlockRenderer, BlockPreview, TemplateBlock } from "./blocks";
import { Button } from "@/components/ui/button";

interface DraggableTemplateBlockProps {
  block: TemplateBlock;
  index: number;
  editing: boolean;
  onUpdate: (updated: TemplateBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function DraggableTemplateBlock({
  block,
  index,
  editing,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: DraggableTemplateBlockProps) {
  return (
    <div className="relative group bg-background border rounded my-2 px-2 py-3 shadow-sm hover:shadow-md transition">
      <div className="absolute top-1 right-1 flex gap-1 opacity-70 group-hover:opacity-100">
        <Button size="icon" variant="ghost" onClick={onMoveUp} disabled={index === 0}>
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onMoveDown} disabled={false}>
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={onDelete}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      {editing ? (
        <BlockRenderer
          block={block}
          onUpdate={content => onUpdate({ ...block, content })}
        />
      ) : (
        <BlockPreview block={block} />
      )}
    </div>
  );
}
