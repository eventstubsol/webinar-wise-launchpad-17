
import React from 'react';
import { TemplateBlock } from './blocks';

// Social Media Block
export interface SocialMediaBlockContent {
  platforms: Array<{
    name: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube';
    url: string;
    icon?: string;
  }>;
  layout: 'horizontal' | 'vertical';
  size: 'small' | 'medium' | 'large';
}

// Video Block
export interface VideoBlockContent {
  video_url: string;
  thumbnail_url: string;
  title: string;
  description?: string;
  play_button_style: 'overlay' | 'below';
}

// Product Showcase Block
export interface ProductShowcaseContent {
  products: Array<{
    name: string;
    image_url: string;
    price: string;
    description: string;
    product_url: string;
  }>;
  layout: 'grid' | 'carousel' | 'list';
  columns: 1 | 2 | 3 | 4;
}

// Countdown Timer Block
export interface CountdownTimerContent {
  end_date: string;
  title: string;
  description?: string;
  timezone: string;
  style: 'digital' | 'analog' | 'minimal';
}

// Survey/Poll Block
export interface SurveyBlockContent {
  question: string;
  options: string[];
  survey_url: string;
  button_text: string;
  allow_multiple: boolean;
}

// Advanced block defaults
export const advancedBlockDefaults = {
  social_media: {
    platforms: [
      { name: 'facebook' as const, url: 'https://facebook.com/yourpage' },
      { name: 'twitter' as const, url: 'https://twitter.com/yourhandle' },
      { name: 'instagram' as const, url: 'https://instagram.com/yourprofile' }
    ],
    layout: 'horizontal' as const,
    size: 'medium' as const
  },
  video: {
    video_url: 'https://youtube.com/watch?v=example',
    thumbnail_url: 'https://via.placeholder.com/600x300',
    title: 'Watch Our Latest Video',
    description: 'Check out this amazing content',
    play_button_style: 'overlay' as const
  },
  product_showcase: {
    products: [
      {
        name: 'Sample Product',
        image_url: 'https://via.placeholder.com/200x200',
        price: '$29.99',
        description: 'Amazing product description',
        product_url: 'https://yourstore.com/product'
      }
    ],
    layout: 'grid' as const,
    columns: 2 as const
  },
  countdown_timer: {
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'Limited Time Offer',
    description: 'Don\'t miss out!',
    timezone: 'UTC',
    style: 'digital' as const
  },
  survey: {
    question: 'How satisfied are you with our service?',
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'],
    survey_url: 'https://yoursurvey.com',
    button_text: 'Take Survey',
    allow_multiple: false
  }
};

// Advanced Block Editor Components
export const SocialMediaBlockEditor: React.FC<{
  content: SocialMediaBlockContent;
  onChange: (content: SocialMediaBlockContent) => void;
}> = ({ content, onChange }) => {
  const addPlatform = () => {
    onChange({
      ...content,
      platforms: [...content.platforms, { name: 'facebook', url: '' }]
    });
  };

  const removePlatform = (index: number) => {
    onChange({
      ...content,
      platforms: content.platforms.filter((_, i) => i !== index)
    });
  };

  const updatePlatform = (index: number, field: string, value: string) => {
    const newPlatforms = [...content.platforms];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };
    onChange({ ...content, platforms: newPlatforms });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Layout</label>
        <select
          value={content.layout}
          onChange={(e) => onChange({ ...content, layout: e.target.value as any })}
          className="w-full border rounded px-3 py-1"
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Icon Size</label>
        <select
          value={content.size}
          onChange={(e) => onChange({ ...content, size: e.target.value as any })}
          className="w-full border rounded px-3 py-1"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Social Platforms</label>
        {content.platforms.map((platform, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={platform.name}
              onChange={(e) => updatePlatform(index, 'name', e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
            <input
              type="url"
              value={platform.url}
              onChange={(e) => updatePlatform(index, 'url', e.target.value)}
              placeholder="Profile URL"
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              onClick={() => removePlatform(index)}
              className="px-2 py-1 bg-red-500 text-white rounded"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addPlatform}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Add Platform
        </button>
      </div>
    </div>
  );
};

export const VideoBlockEditor: React.FC<{
  content: VideoBlockContent;
  onChange: (content: VideoBlockContent) => void;
}> = ({ content, onChange }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Video URL</label>
        <input
          type="url"
          value={content.video_url}
          onChange={(e) => onChange({ ...content, video_url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full border rounded px-3 py-2"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Thumbnail URL</label>
        <input
          type="url"
          value={content.thumbnail_url}
          onChange={(e) => onChange({ ...content, thumbnail_url: e.target.value })}
          placeholder="https://..."
          className="w-full border rounded px-3 py-2"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={content.description || ''}
          onChange={(e) => onChange({ ...content, description: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Play Button Style</label>
        <select
          value={content.play_button_style}
          onChange={(e) => onChange({ ...content, play_button_style: e.target.value as any })}
          className="w-full border rounded px-3 py-1"
        >
          <option value="overlay">Overlay on thumbnail</option>
          <option value="below">Button below thumbnail</option>
        </select>
      </div>
    </div>
  );
};

export const ProductShowcaseEditor: React.FC<{
  content: ProductShowcaseContent;
  onChange: (content: ProductShowcaseContent) => void;
}> = ({ content, onChange }) => {
  const addProduct = () => {
    onChange({
      ...content,
      products: [...content.products, {
        name: '',
        image_url: '',
        price: '',
        description: '',
        product_url: ''
      }]
    });
  };

  const removeProduct = (index: number) => {
    onChange({
      ...content,
      products: content.products.filter((_, i) => i !== index)
    });
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const newProducts = [...content.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    onChange({ ...content, products: newProducts });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Layout</label>
          <select
            value={content.layout}
            onChange={(e) => onChange({ ...content, layout: e.target.value as any })}
            className="w-full border rounded px-3 py-1"
          >
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="list">List</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Columns</label>
          <select
            value={content.columns}
            onChange={(e) => onChange({ ...content, columns: Number(e.target.value) as any })}
            className="w-full border rounded px-3 py-1"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Products</label>
        {content.products.map((product, index) => (
          <div key={index} className="border p-4 rounded mb-4">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                value={product.name}
                onChange={(e) => updateProduct(index, 'name', e.target.value)}
                placeholder="Product name"
                className="border rounded px-2 py-1"
              />
              <input
                type="text"
                value={product.price}
                onChange={(e) => updateProduct(index, 'price', e.target.value)}
                placeholder="Price"
                className="border rounded px-2 py-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="url"
                value={product.image_url}
                onChange={(e) => updateProduct(index, 'image_url', e.target.value)}
                placeholder="Image URL"
                className="border rounded px-2 py-1"
              />
              <input
                type="url"
                value={product.product_url}
                onChange={(e) => updateProduct(index, 'product_url', e.target.value)}
                placeholder="Product URL"
                className="border rounded px-2 py-1"
              />
            </div>
            <textarea
              value={product.description}
              onChange={(e) => updateProduct(index, 'description', e.target.value)}
              placeholder="Description"
              className="w-full border rounded px-2 py-1 mb-2"
              rows={2}
            />
            <button
              onClick={() => removeProduct(index)}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm"
            >
              Remove Product
            </button>
          </div>
        ))}
        <button
          onClick={addProduct}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Add Product
        </button>
      </div>
    </div>
  );
};

// Render functions for advanced blocks
export const renderAdvancedBlock = (block: TemplateBlock): string => {
  switch (block.type) {
    case 'social_media':
      return renderSocialMediaBlock(block.content as SocialMediaBlockContent);
    case 'video':
      return renderVideoBlock(block.content as VideoBlockContent);
    case 'product_showcase':
      return renderProductShowcaseBlock(block.content as ProductShowcaseContent);
    case 'countdown_timer':
      return renderCountdownTimerBlock(block.content as CountdownTimerContent);
    case 'survey':
      return renderSurveyBlock(block.content as SurveyBlockContent);
    default:
      return '';
  }
};

const renderSocialMediaBlock = (content: SocialMediaBlockContent): string => {
  const iconSize = content.size === 'small' ? '24' : content.size === 'large' ? '48' : '32';
  const socialIcons: Record<string, string> = {
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
    youtube: '#FF0000'
  };

  const platformLinks = content.platforms.map(platform => `
    <a href="${platform.url}" style="margin: 5px; text-decoration: none;">
      <div style="
        display: inline-block;
        width: ${iconSize}px;
        height: ${iconSize}px;
        background: ${socialIcons[platform.name] || '#333'};
        border-radius: 50%;
        text-align: center;
        line-height: ${iconSize}px;
        color: white;
        font-weight: bold;
      ">
        ${platform.name[0].toUpperCase()}
      </div>
    </a>
  `).join('');

  return `
    <div style="text-align: center; margin: 20px 0; ${content.layout === 'vertical' ? 'line-height: 2;' : ''}">
      ${platformLinks}
    </div>
  `;
};

const renderVideoBlock = (content: VideoBlockContent): string => {
  return `
    <div style="text-align: center; margin: 20px 0;">
      <h3 style="margin-bottom: 10px;">${content.title}</h3>
      ${content.description ? `<p style="margin-bottom: 15px; color: #666;">${content.description}</p>` : ''}
      <div style="position: relative; display: inline-block;">
        <img src="${content.thumbnail_url}" alt="${content.title}" style="max-width: 100%; border-radius: 8px;" />
        ${content.play_button_style === 'overlay' ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: rgba(0,0,0,0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
          ">▶</div>
        ` : ''}
      </div>
      ${content.play_button_style === 'below' ? `
        <div style="margin-top: 15px;">
          <a href="${content.video_url}" style="
            background: #FF0000;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            font-weight: bold;
          ">▶ Watch Video</a>
        </div>
      ` : ''}
    </div>
  `;
};

const renderProductShowcaseBlock = (content: ProductShowcaseContent): string => {
  const gridCols = content.layout === 'grid' ? content.columns : 1;
  
  const productItems = content.products.map(product => `
    <div style="
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      margin-bottom: 15px;
      ${content.layout === 'grid' ? `width: ${100/gridCols - 2}%; display: inline-block; margin: 1%; vertical-align: top;` : ''}
    ">
      <img src="${product.image_url}" alt="${product.name}" style="max-width: 100%; height: 150px; object-fit: cover; border-radius: 5px;" />
      <h4 style="margin: 10px 0 5px 0;">${product.name}</h4>
      <p style="color: #666; font-size: 14px; margin: 5px 0;">${product.description}</p>
      <div style="font-size: 18px; font-weight: bold; color: #059669; margin: 10px 0;">${product.price}</div>
      <a href="${product.product_url}" style="
        background: #3B82F6;
        color: white;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;
        font-size: 14px;
      ">View Product</a>
    </div>
  `).join('');

  return `
    <div style="margin: 20px 0;">
      ${productItems}
    </div>
  `;
};

const renderCountdownTimerBlock = (content: CountdownTimerContent): string => {
  return `
    <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin-bottom: 10px;">${content.title}</h3>
      ${content.description ? `<p style="margin-bottom: 15px; color: #666;">${content.description}</p>` : ''}
      <div style="
        display: inline-block;
        padding: 15px 25px;
        background: #1f2937;
        color: white;
        border-radius: 8px;
        font-family: monospace;
        font-size: 24px;
        font-weight: bold;
      ">
        ${new Date(content.end_date).toLocaleDateString()}
      </div>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">Hurry, time is running out!</p>
    </div>
  `;
};

const renderSurveyBlock = (content: SurveyBlockContent): string => {
  return `
    <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 1px solid #e0f2fe;">
      <h3 style="margin-bottom: 15px; color: #0f172a;">${content.question}</h3>
      <p style="margin-bottom: 20px; color: #64748b;">We'd love to hear your feedback!</p>
      <a href="${content.survey_url}" style="
        background: #3B82F6;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        display: inline-block;
        font-weight: 600;
      ">${content.button_text}</a>
    </div>
  `;
};
