import DOMPurify from 'dompurify';
import React from 'react';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Use this instead of dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'thead', 'tbody',
      'tr', 'td', 'th', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'style', 'class', 'id', 'width', 'height'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}

/**
 * Safe component for rendering sanitized HTML
 */
interface SafeHtmlProps {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeHtml({ html, className, style }: SafeHtmlProps): React.ReactElement {
  const sanitizedHtml = sanitizeHtml(html);
  
  return React.createElement('div', {
    className,
    style,
    dangerouslySetInnerHTML: { __html: sanitizedHtml }
  });
}