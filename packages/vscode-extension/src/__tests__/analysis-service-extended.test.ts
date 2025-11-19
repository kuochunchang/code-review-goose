import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis-service.js';

// Mock OpenAI
let mockCreateFn: any;

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };

      constructor(_config: any) {
        // Store reference to create function
        mockCreateFn = this.chat.completions.create;
      }
    },
  };
});

describe('AnalysisService - Extended Tests', () => {
  let service: AnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFn = undefined;
  });

  describe('analyzeCode', () => {
    beforeEach(() => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });
    });

    it('should call OpenAI API with correct parameters', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [],
                summary: 'Test summary',
              }),
            },
          },
        ],
      });

      await service.analyzeCode('const x = 1;', {
        language: 'typescript',
        filePath: 'test.ts',
      });

      expect(mockCreateFn).toHaveBeenCalled();
      const callArgs = (mockCreateFn as any).mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4');
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
    });

    it('should include custom temperature for supported models', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [],
                summary: 'Test summary',
              }),
            },
          },
        ],
      });

      await service.analyzeCode('const x = 1;');

      const callArgs = (mockCreateFn as any).mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.3);
    });

    it('should use JSON mode for supported models', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [],
                summary: 'Test summary',
              }),
            },
          },
        ],
      });

      await service.analyzeCode('const x = 1;');

      const callArgs = (mockCreateFn as any).mock.calls[0][0];
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
    });

    it('should extract JSON from markdown code blocks', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"issues": [], "summary": "Test"}\n```',
            },
          },
        ],
      });

      const result = await service.analyzeCode('const x = 1;');
      expect(result.summary).toBe('Test');
    });

    it('should handle response without content', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {},
          },
        ],
      });

      await expect(service.analyzeCode('const x = 1;')).rejects.toThrow('No response from OpenAI');
    });

    it('should normalize analysis result', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [
                  {
                    severity: 'high',
                    category: 'security',
                    line: 10,
                    column: 5,
                    message: 'Test issue',
                    suggestion: 'Fix it',
                  },
                ],
                summary: 'Test summary',
              }),
            },
          },
        ],
      });

      const result = await service.analyzeCode('const x = 1;');
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
      expect(result.issues[0].category).toBe('security');
      expect(result.summary).toBe('Test summary');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockRejectedValue(new Error('API Error'));

      await expect(service.analyzeCode('const x = 1;')).rejects.toThrow('AI analysis failed: API Error');
    });
  });

  describe('explainCode', () => {
    it('should call OpenAI API with explain prompt', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'Test overview',
                fields: [],
                mainComponents: [],
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

      await service.explainCode('const x = 1;', {
        language: 'typescript',
        filePath: 'test.ts',
      });

      expect(mockCreateFn).toHaveBeenCalled();
      const callArgs = (mockCreateFn as any).mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('code explainer');
    });

    it('should use custom temperature for supported models', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'Test overview',
                fields: [],
                mainComponents: [],
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

      await service.explainCode('const x = 1;');

      const callArgs = (mockCreateFn as any).mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.4);
    });

    it('should return normalized explain result', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overview: 'Test overview',
                fields: [],
                mainComponents: [],
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

      const result = await service.explainCode('const x = 1;');
      expect(result.overview).toBe('Test overview');
      expect(result.fields).toEqual([]);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });

      (mockCreateFn as any).mockRejectedValue(new Error('API Error'));

      await expect(service.explainCode('const x = 1;')).rejects.toThrow('Code explanation failed: API Error');
    });
  });

  describe('supportsJsonMode', () => {
    it('should return true for gpt-4-turbo', () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      });
      // Access private method through any cast
      const supports = (service as any).supportsJsonMode();
      expect(supports).toBe(true);
    });

    it('should return true for gpt-4o', () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4o',
      });
      const supports = (service as any).supportsJsonMode();
      expect(supports).toBe(true);
    });

    it('should return false for unsupported models', () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      });
      const supports = (service as any).supportsJsonMode();
      expect(supports).toBe(false);
    });
  });

  describe('supportsCustomTemperature', () => {
    it('should return false for o1 models', () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'o1',
      });
      const supports = (service as any).supportsCustomTemperature();
      expect(supports).toBe(false);
    });

    it('should return true for regular models', () => {
      service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4',
      });
      const supports = (service as any).supportsCustomTemperature();
      expect(supports).toBe(true);
    });
  });
});

