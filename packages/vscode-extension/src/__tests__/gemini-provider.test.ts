import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../services/providers/gemini-provider.js';

// Mock Google Generative AI
let mockGenerateContent: any;
let lastModelConfig: any = {};

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class GoogleGenerativeAI {
      constructor(_apiKey: string) {
        // Store API key for verification
      }

      getGenerativeModel(config: any) {
        lastModelConfig = config;
        return {
          generateContent: (...args: any[]) => mockGenerateContent(...args),
        };
      }
    },
  };
});

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastModelConfig = {};
    mockGenerateContent = vi.fn();
  });

  describe('Constructor', () => {
    it('should require API key', () => {
      expect(() => {
        new GeminiProvider({ apiKey: '' });
      }).toThrow('Gemini API key is required');
    });

    it('should create provider with valid config', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      expect(provider).toBeDefined();
    });

    it('should use default model if not specified', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
      });

      expect(provider).toBeDefined();
    });
  });

  describe('analyzeCode', () => {
    it('should analyze code successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              issues: [
                {
                  severity: 'medium',
                  category: 'quality',
                  line: 5,
                  message: 'Consider using const instead of let',
                  suggestion: 'Use const for values that won\'t be reassigned',
                },
              ],
              summary: 'Found 1 code quality issue',
            }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      const result = await provider.analyzeCode('let x = 1;', {
        language: 'javascript',
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('medium');
      expect(result.issues[0].category).toBe('quality');
      expect(result.summary).toBe('Found 1 code quality issue');
    });

    it('should handle JSON wrapped in code blocks', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '```json\n{"issues": [], "summary": "Code looks good"}\n```',
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      const result = await provider.analyzeCode('const x = 1;');

      expect(result.issues).toHaveLength(0);
      expect(result.summary).toBe('Code looks good');
    });

    it('should normalize issues with missing fields', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              issues: [
                {
                  // Missing severity, category
                  line: 1,
                  message: 'Test issue',
                },
              ],
              summary: 'Test summary',
            }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      const result = await provider.analyzeCode('const x = 1;');

      expect(result.issues[0].severity).toBe('info');
      expect(result.issues[0].category).toBe('quality');
      expect(result.issues[0].line).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await expect(provider.analyzeCode('const x = 1;')).rejects.toThrow(
        'AI analysis failed: API quota exceeded'
      );
    });

    it('should throw error when no response text', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '',
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await expect(provider.analyzeCode('const x = 1;')).rejects.toThrow('No response from Gemini');
    });

    it('should use JSON mode for supported models', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ issues: [], summary: 'OK' }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await provider.analyzeCode('const x = 1;');

      expect(lastModelConfig.generationConfig?.responseMimeType).toBe('application/json');
    });
  });

  describe('explainCode', () => {
    it('should explain code successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              overview: 'This declares a constant variable',
              fields: [],
              mainComponents: [
                {
                  name: 'x',
                  type: 'constant',
                  description: 'A constant number',
                  line: 1,
                },
              ],
              methodDependencies: [],
              howItWorks: [
                {
                  step: 1,
                  title: 'Declaration',
                  description: 'A constant is declared and initialized',
                  line: 1,
                },
              ],
              keyConcepts: [
                {
                  concept: 'Constants',
                  explanation: 'const creates immutable bindings',
                },
              ],
              dependencies: [],
              notableFeatures: ['Uses ES6 const keyword'],
            }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-pro',
      });

      const result = await provider.explainCode('const x = 1;', {
        language: 'javascript',
      });

      expect(result.overview).toBe('This declares a constant variable');
      expect(result.mainComponents).toHaveLength(1);
      expect(result.mainComponents[0].name).toBe('x');
      expect(result.howItWorks).toHaveLength(1);
      expect(result.keyConcepts).toHaveLength(1);
      expect(result.notableFeatures).toHaveLength(1);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle missing fields with defaults', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              overview: 'Simple code',
            }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      const result = await provider.explainCode('const x = 1;');

      expect(result.overview).toBe('Simple code');
      expect(result.fields).toEqual([]);
      expect(result.mainComponents).toEqual([]);
      expect(result.methodDependencies).toEqual([]);
      expect(result.howItWorks).toEqual([]);
      expect(result.keyConcepts).toEqual([]);
      expect(result.dependencies).toEqual([]);
      expect(result.notableFeatures).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Safety filter triggered'));

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await expect(provider.explainCode('const x = 1;')).rejects.toThrow(
        'Code explanation failed: Safety filter triggered'
      );
    });

    it('should use appropriate temperature for explanation', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ overview: 'Test' }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await provider.explainCode('const x = 1;');

      expect(lastModelConfig.generationConfig?.temperature).toBe(0.4);
    });
  });

  describe('Model Support Detection', () => {
    it('should support JSON mode for Gemini 2.0+ models', async () => {
      const models = [
        'gemini-3-pro-preview',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
      ];

      for (const model of models) {
        mockGenerateContent.mockResolvedValue({
          response: {
            text: () => JSON.stringify({ issues: [], summary: 'OK' }),
          },
        });

        const provider = new GeminiProvider({
          apiKey: 'test-key',
          model,
        });

        await provider.analyzeCode('const x = 1;');

        expect(lastModelConfig.generationConfig?.responseMimeType).toBe('application/json');
      }
    });

    it('should support custom temperature for all Gemini models', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ issues: [], summary: 'OK' }),
        },
      });

      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
      });

      await provider.analyzeCode('const x = 1;');

      expect(lastModelConfig.generationConfig?.temperature).toBe(0.3);
    });
  });
});
