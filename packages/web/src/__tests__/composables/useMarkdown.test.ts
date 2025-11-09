import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMarkdown } from '../../composables/useMarkdown';

describe('useMarkdown', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('renderMarkdown', () => {
    it('should convert simple markdown to HTML', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('**bold text**');

      expect(result).toContain('<strong>');
      expect(result).toContain('bold text');
      expect(result).toContain('</strong>');
    });

    it('should handle empty string', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('');

      expect(result).toBe('');
    });

    it('should convert headings', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('# Heading 1');

      expect(result).toContain('<h1');
      expect(result).toContain('Heading 1');
    });

    it('should convert lists', () => {
      const { renderMarkdown } = useMarkdown();
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const result = renderMarkdown(markdown);

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should convert links', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('[Link Text](https://example.com)');

      expect(result).toContain('<a');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Link Text');
    });

    it('should sanitize potentially dangerous HTML', () => {
      const { renderMarkdown } = useMarkdown();
      const dangerousMarkdown = '<script>alert("XSS")</script>';
      const result = renderMarkdown(dangerousMarkdown);

      // Script tags should be removed
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should handle code blocks', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('`inline code`');

      expect(result).toContain('<code>');
      expect(result).toContain('inline code');
    });

    it('should preserve line breaks with GFM', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('Line 1\nLine 2');

      expect(result).toContain('<br>');
    });

    it('should handle blockquotes', () => {
      const { renderMarkdown } = useMarkdown();
      const result = renderMarkdown('> Quote text');

      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote text');
    });

    it('should handle errors gracefully and return original text', async () => {
      const { renderMarkdown } = useMarkdown();

      // Mock marked to throw an error
      const markedModule = await import('marked');
      const originalSetOptions = markedModule.marked.setOptions;
      vi.spyOn(markedModule.marked, 'setOptions').mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = renderMarkdown('Some markdown');

      expect(result).toBe('Some markdown');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to render markdown:', expect.any(Error));

      // Restore
      markedModule.marked.setOptions = originalSetOptions;
    });
  });
});
