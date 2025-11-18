import { describe, it, expect } from 'vitest';
import { computeSHA256 } from '../utils/hash.js';

describe('Hash Utility', () => {
  it('should compute SHA256 hash correctly', () => {
    const input = 'Hello, World!';
    const hash = computeSHA256(input);

    // SHA256 of "Hello, World!" is known
    expect(hash).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = computeSHA256('code1');
    const hash2 = computeSHA256('code2');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce same hash for same input', () => {
    const input = 'const x = 5;';
    const hash1 = computeSHA256(input);
    const hash2 = computeSHA256(input);

    expect(hash1).toBe(hash2);
  });

  it('should handle empty string', () => {
    const hash = computeSHA256('');

    // SHA256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should handle multi-line code', () => {
    const code = `function test() {
  console.log('test');
}`;
    const hash = computeSHA256(code);

    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
  });
});
