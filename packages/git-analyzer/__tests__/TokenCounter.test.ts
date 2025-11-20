/**
 * Tests for TokenCounter utility
 */

import { describe, it, expect } from 'vitest';
import { TokenCounter } from '../src/utils/TokenCounter.js';

describe('TokenCounter', () => {
  describe('constructor', () => {
    it('should create TokenCounter with valid config', () => {
      const counter = new TokenCounter({ maxTokensPerBatch: 1000 });
      expect(counter).toBeInstanceOf(TokenCounter);
      expect(counter.getEffectiveMaxTokens()).toBe(900); // 0.9 safety margin
    });

    it('should accept custom safety margin', () => {
      const counter = new TokenCounter({
        maxTokensPerBatch: 1000,
        safetyMargin: 0.8,
      });
      expect(counter.getEffectiveMaxTokens()).toBe(800);
    });

    it('should throw error for invalid maxTokensPerBatch', () => {
      expect(() => new TokenCounter({ maxTokensPerBatch: 0 })).toThrow(
        'maxTokensPerBatch must be greater than 0'
      );
      expect(() => new TokenCounter({ maxTokensPerBatch: -100 })).toThrow();
    });

    it('should throw error for invalid safety margin', () => {
      expect(() =>
        new TokenCounter({ maxTokensPerBatch: 1000, safetyMargin: 0 })
      ).toThrow('safetyMargin must be between 0 and 1');
      expect(() =>
        new TokenCounter({ maxTokensPerBatch: 1000, safetyMargin: 1.5 })
      ).toThrow();
    });
  });

  describe('countTokens', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 1000 });

    it('should count tokens in simple text', () => {
      const tokens = counter.countTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should return 0 for empty string', () => {
      expect(counter.countTokens('')).toBe(0);
    });

    it('should handle code snippets', () => {
      const code = `
function hello() {
  console.log("Hello, world!");
}
      `.trim();

      const tokens = counter.countTokens(code);
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(50);
    });

    it('should handle non-ASCII characters', () => {
      const tokens = counter.countTokens('你好世界');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('exceedsLimit', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 100 });

    it('should return false for text within limit', () => {
      expect(counter.exceedsLimit('Short text')).toBe(false);
    });

    it('should return true for text exceeding limit', () => {
      const longText = 'word '.repeat(1000);
      expect(counter.exceedsLimit(longText)).toBe(true);
    });
  });

  describe('splitIntoChunks', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 100 });

    it('should not split text within limit', () => {
      const text = 'Short text';
      const chunks = counter.splitIntoChunks(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split long text into multiple chunks', () => {
      const longText = 'word '.repeat(500);
      const chunks = counter.splitIntoChunks(longText);
      expect(chunks.length).toBeGreaterThan(1);

      for (const chunk of chunks) {
        expect(counter.countTokens(chunk)).toBeLessThanOrEqual(
          counter.getEffectiveMaxTokens()
        );
      }
    });

    it('should respect custom separator', () => {
      const text = 'line1|line2|line3|'.repeat(50);
      const chunks = counter.splitIntoChunks(text, '|');
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle very long lines', () => {
      const veryLongLine = 'x'.repeat(1000);
      const chunks = counter.splitIntoChunks(veryLongLine);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should filter empty chunks', () => {
      const text = 'line1\n\n\nline2';
      const chunks = counter.splitIntoChunks(text);
      expect(chunks.every((chunk) => chunk.length > 0)).toBe(true);
    });
  });

  describe('createBatches', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 100 });

    it('should create single batch for small items', () => {
      const items = ['item1', 'item2', 'item3'];
      const batches = counter.createBatches(items);
      expect(batches).toHaveLength(1);
      expect(batches[0].items).toEqual(items);
      expect(batches[0].batchIndex).toBe(0);
    });

    it('should create multiple batches for large items', () => {
      const items = Array(100).fill('word '.repeat(10));
      const batches = counter.createBatches(items);
      expect(batches.length).toBeGreaterThan(1);

      for (const batch of batches) {
        expect(batch.totalTokens).toBeLessThanOrEqual(
          counter.getEffectiveMaxTokens()
        );
      }
    });

    it('should handle items exceeding token limit', () => {
      const largeItem = 'word '.repeat(500);
      const items = ['small', largeItem, 'small again'];
      const batches = counter.createBatches(items);

      expect(batches.length).toBeGreaterThan(1);
    });

    it('should assign correct batch indices', () => {
      const items = Array(10).fill('word '.repeat(10));
      const batches = counter.createBatches(items);

      batches.forEach((batch, index) => {
        expect(batch.batchIndex).toBe(index);
      });
    });

    it('should calculate total tokens correctly', () => {
      const items = ['hello', 'world'];
      const batches = counter.createBatches(items);

      const manualTotal =
        counter.countTokens(items[0]) + counter.countTokens(items[1]);

      expect(batches[0].totalTokens).toBeCloseTo(manualTotal, 0);
    });
  });

  describe('estimateCost', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 1000 });

    it('should estimate cost correctly with default rate', () => {
      const cost = counter.estimateCost(1000);
      expect(cost).toBe(0.002);
    });

    it('should estimate cost with custom rate', () => {
      const cost = counter.estimateCost(1000, 0.01);
      expect(cost).toBe(0.01);
    });

    it('should return 0 for 0 tokens', () => {
      expect(counter.estimateCost(0)).toBe(0);
    });

    it('should handle fractional tokens', () => {
      const cost = counter.estimateCost(500, 0.002);
      expect(cost).toBe(0.001);
    });
  });

  describe('getStatistics', () => {
    const counter = new TokenCounter({ maxTokensPerBatch: 1000 });

    it('should return correct statistics for batches', () => {
      const batches = [
        { items: ['a', 'b'], totalTokens: 100, batchIndex: 0 },
        { items: ['c'], totalTokens: 50, batchIndex: 1 },
        { items: ['d', 'e', 'f'], totalTokens: 150, batchIndex: 2 },
      ];

      const stats = counter.getStatistics(batches);

      expect(stats.totalBatches).toBe(3);
      expect(stats.totalItems).toBe(6);
      expect(stats.totalTokens).toBe(300);
      expect(stats.averageTokensPerBatch).toBe(100);
      expect(stats.maxTokensInBatch).toBe(150);
      expect(stats.minTokensInBatch).toBe(50);
      expect(stats.estimatedCost).toBeCloseTo(0.0006, 4);
    });

    it('should handle empty batches array', () => {
      const stats = counter.getStatistics([]);

      expect(stats.totalBatches).toBe(0);
      expect(stats.totalItems).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.averageTokensPerBatch).toBe(0);
      expect(stats.maxTokensInBatch).toBe(0);
      expect(stats.minTokensInBatch).toBe(0);
      expect(stats.estimatedCost).toBe(0);
    });

    it('should handle single batch', () => {
      const batches = [{ items: ['a'], totalTokens: 50, batchIndex: 0 }];

      const stats = counter.getStatistics(batches);

      expect(stats.totalBatches).toBe(1);
      expect(stats.totalItems).toBe(1);
      expect(stats.maxTokensInBatch).toBe(50);
      expect(stats.minTokensInBatch).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle Unicode characters correctly', () => {
      const counter = new TokenCounter({ maxTokensPerBatch: 100 });
      const emoji = '😀'.repeat(50);
      const tokens = counter.countTokens(emoji);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle very large token limits', () => {
      const counter = new TokenCounter({ maxTokensPerBatch: 1000000 });
      expect(counter.getEffectiveMaxTokens()).toBe(900000);
    });

    it('should handle minimal token limits', () => {
      const counter = new TokenCounter({ maxTokensPerBatch: 10 });
      const text = 'This is a longer piece of text';
      const chunks = counter.splitIntoChunks(text);
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
