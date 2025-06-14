import React from "react";
import { TemplateBlock, TemplateBlockType } from "./blocks";
import { Button } from "@/components/ui/button";
import { Grip, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface DraggableTemplateBlockProps {
  block: TemplateBlock;
  index: number;
  editing: boolean;
  onUpdate: (block: TemplateBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

import { 
  SocialMediaBlockEditor, 
  VideoBlockEditor, 
  ProductShowcaseEditor,
  SocialMediaBlockContent,
  VideoBlockContent,
  ProductShowcaseContent
} from './AdvancedBlocks';

export function DraggableTemplateBlock({
  block,
  index,
  editing,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: DraggableTemplateBlockProps) {
  const updateContent = (newContent: any) => {
    onUpdate({ ...block, content: { ...block.content, ...newContent } });
  };

  const handleEdit = () => {
    // Implement edit logic here
  };

  const renderEditor = () => {
    switch (block.type) {
      case "text":
        return (
          <textarea
            value={block.content.text || ""}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Enter your text here..."
            className="w-full border rounded p-2 min-h-[100px] resize-none"
          />
        );

      case "image":
        return (
          <div className="space-y-2">
            <input
              type="url"
              value={block.content.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Image URL"
              className="w-full border rounded p-2"
            />
            <input
              type="text"
              value={block.content.alt || ""}
              onChange={(e) => updateContent({ alt: e.target.value })}
              placeholder="Alt text"
              className="w-full border rounded p-2"
            />
          </div>
        );

      case "button":
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.content.label || ""}
              onChange={(e) => updateContent({ label: e.target.value })}
              placeholder="Button text"
              className="w-full border rounded p-2"
            />
            <input
              type="url"
              value={block.content.url || ""}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="Button URL"
              className="w-full border rounded p-2"
            />
          </div>
        );

      case "social_media":
        return (
          <SocialMediaBlockEditor
            content={block.content as SocialMediaBlockContent}
            onChange={updateContent}
          />
        );

      case "video":
        return (
          <VideoBlockEditor
            content={block.content as VideoBlockContent}
            onChange={updateContent}
          />
        );

      case "product_showcase":
        return (
          <ProductShowcaseEditor
            content={block.content as ProductShowcaseContent}
            onChange={updateContent}
          />
        );

      case "countdown_timer":
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={block.content.title || ""}
              onChange={(e) => updateContent({ title: e.target.value })}
              placeholder="Title"
              className="w-full border rounded p-2"
            />
            <input
              type="datetime-local"
              value={block.content.end_date || ""}
              onChange={(e) => updateContent({ end_date: e.target.value })}
              className="w-full border rounded p-2"
            />
            <textarea
              value={block.content.description || ""}
              onChange={(e) => updateContent({ description: e.target.value })}
              placeholder="Description"
              className="w-full border rounded p-2"
              rows={2}
            />
          </div>
        );

      case "survey":
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={block.content.question || ""}
              onChange={(e) => updateContent({ question: e.target.value })}
              placeholder="Survey question"
              className="w-full border rounded p-2"
            />
            <input
              type="url"
              value={block.content.survey_url || ""}
              onChange={(e) => updateContent({ survey_url: e.target.value })}
              placeholder="Survey URL"
              className="w-full border rounded p-2"
            />
            <input
              type="text"
              value={block.content.button_text || ""}
              onChange={(e) => updateContent({ button_text: e.target.value })}
              placeholder="Button text"
              className="w-full border rounded p-2"
            />
          </div>
        );

      default:
        return <div>No editor available for this block type</div>;
    }
  };

  return (
    <div className="border rounded p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grip className="h-4 w-4 text-gray-400 cursor-grab" />
          <span className="text-sm font-medium text-gray-600">{block.type}</span>
        </div>
        <div>
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing ? (
        renderEditor()
      ) : (
        <div className="text-sm text-gray-500">
          Click to edit content
        </div>
      )}
    </div>
  );
}
