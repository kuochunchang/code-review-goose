import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../services/providers/openai-provider.js';

// Mock OpenAI
let lastConstructorConfig: any = {};
let mockCreate: any;

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: (...args: any[]) => mockCreate(...args),
        },
      };

      constructor(config: any) {
        lastConstructorConfig = config;
      }
    },
  };
});

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastConstructorConfig = {};
    mockCreate = vi.fn();
  });

  describe('Constructor', () => {
    it('should require API key when not using custom API', () => {
      expect(() => {
        new OpenAIProvider({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should create provider with valid config', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      expect(provider).toBeDefined();
      expect(lastConstructorConfig.apiKey).toBe('test-key');
    });

    it('should use default model if not specified', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
    });

    it('should support custom baseURL', () => {
      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
        baseURL: 'https://api.example.com/v1',
      });

      expect(provider).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBe('https://api.example.com/v1');
    });

    it('should allow empty API key with custom baseURL', () => {
      const provider = new OpenAIProvider({
        apiKey: '',
        baseURL: 'https://api.example.com/v1',
      });

      expect(provider).toBeDefined();
      expect(lastConstructorConfig.apiKey).toBe('dummy-key');
    });
  });

  describe('analyzeCode', () => {
    it('should analyze code successfully', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [
                  {
                    severity: 'high',
                    category: 'security',
                    line: 10,
                    message: 'Potential SQL injection',
                    suggestion: 'Use parameterized queries',
                  },
                ],
                summary: 'Found 1 security issue',
              }),
            },
          },
        ],
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const result = await provider.analyzeCode('const x = 1;', {
        language: 'javascript',
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
      expect(result.summary).toBe('Found 1 security issue');
    });

    it('should handle JSON wrapped in code blocks', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"issues": [], "summary": "No issues found"}\n```',
            },
          },
        ],
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const result = await provider.analyzeCode('const x = 1;');

      expect(result.issues).toHaveLength(0);
      expect(result.summary).toBe('No issues found');
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      await expect(provider.analyzeCode('const x = 1;')).rejects.toThrow(
        'AI analysis failed: API rate limit exceeded'
      );
    });

    it('should throw error when no response content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: {} }],
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      await expect(provider.analyzeCode('const x = 1;')).rejects.toThrow('No response from OpenAI');
    });
  });

  describe('explainCode', () => {
    it('should explain code successfully', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'This code declares a constant',
                fields: [],
                mainComponents: [
                  {
                    name: 'x',
                    type: 'constant',
                    description: 'A numeric constant',
                    line: 1,
                  },
                ],
                methodDependencies: [],
                howItWorks: [],
                keyConcepts: [],
                dependencies: [],
                notableFeatures: [],
              }),
            },
          },
        ],
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const result = await provider.explainCode('const x = 1;', {
        language: 'javascript',
      });

      expect(result.overview).toBe('This code declares a constant');
      expect(result.mainComponents).toHaveLength(1);
      expect(result.mainComponents[0].name).toBe('x');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle missing fields with defaults', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'Test overview',
              }),
            },
          },
        ],
      });

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      const result = await provider.explainCode('const x = 1;');

      expect(result.overview).toBe('Test overview');
      expect(result.fields).toEqual([]);
      expect(result.mainComponents).toEqual([]);
      expect(result.methodDependencies).toEqual([]);
      expect(result.howItWorks).toEqual([]);
      expect(result.keyConcepts).toEqual([]);
      expect(result.dependencies).toEqual([]);
      expect(result.notableFeatures).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      const provider = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      await expect(provider.explainCode('const x = 1;')).rejects.toThrow(
        'Code explanation failed: Network error'
      );
    });
  });
});
