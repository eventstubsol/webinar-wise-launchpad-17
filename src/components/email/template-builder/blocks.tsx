import React from "react";

export type TemplateBlockType = 
  | "text" 
  | "image" 
  | "button" 
  | "divider"
  | "social_media"
  | "video" 
  | "product_showcase"
  | "countdown_timer"
  | "survey";

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
  social_media: {
    platforms: [
      { name: 'facebook', url: 'https://facebook.com/yourpage' },
      { name: 'twitter', url: 'https://twitter.com/yourhandle' }
    ],
    layout: 'horizontal',
    size: 'medium'
  },
  video: {
    video_url: 'https://youtube.com/watch?v=example',
    thumbnail_url: 'https://via.placeholder.com/600x300',
    title: 'Watch Our Latest Video',
    description: 'Check out this amazing content',
    play_button_style: 'overlay'
  },
  product_showcase: {
    products: [{
      name: 'Sample Product',
      image_url: 'https://via.placeholder.com/200x200',
      price: '$29.99',
      description: 'Amazing product description',
      product_url: 'https://yourstore.com/product'
    }],
    layout: 'grid',
    columns: 2
  },
  countdown_timer: {
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Limited Time Offer',
    description: 'Don\'t miss out!',
    timezone: 'UTC',
    style: 'digital'
  },
  survey: {
    question: 'How satisfied are you with our service?',
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
    survey_url: 'https://yoursurvey.com',
    button_text: 'Take Survey',
    allow_multiple: false
  }
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
      return <div className="text-sm text-gray-500">Advanced block - use designer mode to edit</div>;
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
      return <div className="my-1 p-2 bg-gray-100 rounded text-sm">Advanced Block: {block.type}</div>;
  }
}
