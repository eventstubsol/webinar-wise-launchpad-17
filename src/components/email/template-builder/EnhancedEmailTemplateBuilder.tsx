import React, { useState } from "react";
import { DraggableTemplateBlock } from "./DraggableTemplateBlock";
import { blockDefaults, TemplateBlock, TemplateBlockType } from "./blocks";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { MergeTagSelector } from "../MergeTagSelector";
import { 
  advancedBlockDefaults, 
  SocialMediaBlockEditor, 
  VideoBlockEditor, 
  ProductShowcaseEditor,
  renderAdvancedBlock
} from './AdvancedBlocks';

interface EnhancedEmailTemplateBuilderProps {
  templateBlocks?: TemplateBlock[];
  onChange?: (blocks: TemplateBlock[]) => void;
}

const defaultBlocks: TemplateBlock[] = [
  { id: nanoid(), type: "text", content: { text: "Hi {{name}}," } }
];

const blockOptions: { type: TemplateBlockType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "button", label: "Button" },
  { type: "divider", label: "Divider" },
  { type: "social_media", label: "Social Media" },
  { type: "video", label: "Video" },
  { type: "product_showcase", label: "Product Showcase" },
  { type: "countdown_timer", label: "Countdown Timer" },
  { type: "survey", label: "Survey/Poll" },
];

export function EnhancedEmailTemplateBuilder({
  templateBlocks,
  onChange
}: EnhancedEmailTemplateBuilderProps) {
  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    templateBlocks && templateBlocks.length > 0 ? templateBlocks : defaultBlocks
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(0);

  function addBlock(type: TemplateBlockType) {
    const newBlock: TemplateBlock = {
      id: nanoid(),
      type,
      content: { 
        ...blockDefaults[type],
        ...(advancedBlockDefaults[type as keyof typeof advancedBlockDefaults] || {})
      },
    };
    setBlocks(bs => {
      const updated = [...bs, newBlock];
      onChange?.(updated);
      return updated;
    });
    setEditingIdx(blocks.length);
  }

  function updateBlock(idx: number, block: TemplateBlock) {
    setBlocks(bs => {
      const updated = bs.map((b, i) => (i === idx ? block : b));
      onChange?.(updated);
      return updated;
    });
  }

  function deleteBlock(idx: number) {
    setBlocks(bs => {
      const updated = bs.filter((_, i) => i !== idx);
      onChange?.(updated);
      return updated;
    });
    if (editingIdx === idx) setEditingIdx(null);
  }

  function moveBlock(idx: number, direction: -1 | 1) {
    setBlocks(bs => {
      if ((idx === 0 && direction === -1) || idx === bs.length - 1 && direction === 1) return bs;
      const updated = [...bs];
      const [removed] = updated.splice(idx, 1);
      updated.splice(idx + direction, 0, removed);
      onChange?.(updated);
      return updated;
    });
    setEditingIdx(idx + direction);
  }

  // Insert merge tag into the last text block being edited
  function handleInsertTag(tag: string) {
    if (editingIdx == null) return;
    setBlocks(bs => {
      return bs.map((b, i) => {
        if (i === editingIdx && b.type === "text") {
          const prev = b.content.text || "";
          return {
            ...b,
            content: { ...b.content, text: prev + ` {{${tag}}}` }
          };
        }
        return b;
      });
    });
  }

  function buildHTMLPreview(blocks: TemplateBlock[]) {
    return blocks
      .map(b => {
        // Handle advanced blocks
        if (['social_media', 'video', 'product_showcase', 'countdown_timer', 'survey'].includes(b.type)) {
          return renderAdvancedBlock(b);
        }
        
        // Handle basic blocks
        switch (b.type) {
          case "text":
            return `<div style="margin:8px 0;">${b.content.text?.replace(/\n/g, "<br/>") || ""}</div>`;
          case "image":
            return b.content.url
              ? `<img src="${b.content.url}" alt="${b.content.alt}" style="max-width:100%;border-radius:4px;margin:8px 0;" />`
              : "";
          case "button":
            return `<a href="${b.content.url}" style="display:inline-block;margin:10px 0;padding:10px 20px;background:#2563eb;color:#fff;border-radius:4px;text-decoration:none;font-weight:600;">
              ${b.content.label}
            </a>`;
          case "divider":
            return '<hr style="margin:16px 0;border:none;border-bottom:1px solid #ddd;" />';
          default:
            return "";
        }
      })
      .join("");
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Editor (left) */}
      <div className="flex-1 max-w-xl">
        <div className="mb-3 font-semibold">Block Palette</div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {blockOptions.map(opt => (
            <Button
              key={opt.type}
              size="sm"
              variant="secondary"
              onClick={() => addBlock(opt.type)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <MergeTagSelector onInsertTag={handleInsertTag} />
        <div className="mt-4 space-y-2">
          {blocks.map((block, idx) => (
            <DraggableTemplateBlock
              key={block.id}
              block={block}
              index={idx}
              editing={editingIdx === idx}
              onUpdate={updated => updateBlock(idx, updated)}
              onDelete={() => deleteBlock(idx)}
              onMoveUp={() => moveBlock(idx, -1)}
              onMoveDown={() => moveBlock(idx, 1)}
            />
          ))}
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingIdx(null)}
            className="mr-2"
          >
            Done Editing
          </Button>
        </div>
      </div>
      {/* Preview (right) */}
      <div className="flex-1 bg-muted border rounded-md p-6 shadow-inner min-h-[400px]">
        <div className="font-semibold mb-2 text-center">Live Email Preview</div>
        <div
          className="bg-white p-4 rounded shadow"
          style={{ minHeight: 340 }}
          dangerouslySetInnerHTML={{ __html: buildHTMLPreview(blocks) }}
        />
      </div>
    </div>
  );
}
