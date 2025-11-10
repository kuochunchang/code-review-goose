import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Composable for rendering markdown content safely
 */
export function useMarkdown() {
  /**
   * Convert markdown to sanitized HTML
   * @param markdown - The markdown string to render
   * @returns Sanitized HTML string
   */
  const renderMarkdown = (markdown: string): string => {
    if (!markdown) return '';

    try {
      // Configure marked options
      marked.setOptions({
        breaks: true, // Convert \n to <br>
        gfm: true, // GitHub Flavored Markdown
      });

      // Convert markdown to HTML
      const rawHtml = marked(markdown) as string;

      // Sanitize HTML to prevent XSS attacks
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          'p',
          'br',
          'strong',
          'em',
          'u',
          'code',
          'pre',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'ul',
          'ol',
          'li',
          'blockquote',
          'a',
          'span',
          'div',
        ],
        ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
      });

      return cleanHtml;
    } catch (error) {
      console.error('Failed to render markdown:', error);
      return markdown; // Fallback to plain text
    }
  };

  return {
    renderMarkdown,
  };
}
