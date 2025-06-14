
import React from "react";

export type TemplateBlockType = "text" | "image" | "button" | "divider";

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  content: any;
}

export const blockDefaults: Record<TemplateBlockType, any> = {
  text: { text: "Add your text here..." },
  image: { url: "", alt: "Image description" },
  button: { label: "Click me", url: "#" },
  divider: {},
};

export function BlockRenderer({
  block,
  onUpdate,
}: {
  block: TemplateBlock;
  onUpdate: (content: any) => void;
}) {
  switch (block.type) {
    case "text":
      return (
        <textarea
          value={block.content.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="w-full border rounded p-2 my-1"
        />
      );
    case "image":
      return (
        <div className="flex items-center gap-2 my-1">
          <input
            type="text"
            value={block.content.url}
            onChange={e => onUpdate({ ...block.content, url: e.target.value })}
            placeholder="Image URL"
            className="w-1/2 border rounded p-2"
          />
          <input
            type="text"
            value={block.content.alt}
            onChange={e => onUpdate({ ...block.content, alt: e.target.value })}
            placeholder="Alt text"
            className="w-1/2 border rounded p-2"
          />
        </div>
      );
    case "button":
      return (
        <div className="flex items-center gap-2 my-1">
          <input
            type="text"
            value={block.content.label}
            onChange={e => onUpdate({ ...block.content, label: e.target.value })}
            placeholder="Button label"
            className="w-1/2 border rounded p-2"
          />
          <input
            type="text"
            value={block.content.url}
            onChange={e => onUpdate({ ...block.content, url: e.target.value })}
            placeholder="Button link"
            className="w-1/2 border rounded p-2"
          />
        </div>
      );
    case "divider":
      return <div className="border-b border-gray-200 my-2" />;
    default:
      return null;
  }
}

export function BlockPreview({ block }: { block: TemplateBlock }) {
  switch (block.type) {
    case "text":
      return <div className="my-1">{block.content.text}</div>;
    case "image":
      return block.content.url ? (
        <img src={block.content.url} alt={block.content.alt} className="my-1 rounded max-h-32" />
      ) : (
        <div className="my-1 italic text-muted-foreground">No image</div>
      );
    case "button":
      return (
        <a
          href={block.content.url}
          className="inline-block my-1 px-4 py-2 bg-blue-600 text-white rounded"
        >
          {block.content.label}
        </a>
      );
    case "divider":
      return <div className="border-b border-gray-200 my-2" />;
    default:
      return null;
  }
}
