import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from '../../../../services/providers/openaiProvider.js';
import type { AIProviderConfig, AnalysisOptions } from '../../../../types/ai.js';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
      constructor(_config: any) {}
    },
  };
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockConfig: AIProviderConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      apiKey: 'test-api-key',
      model: 'gpt-4',
      timeout: 30000,
    };
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      provider = new OpenAIProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.name).toBe('openai');
    });

    it('should use default model if not specified', () => {
      provider = new OpenAIProvider({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should use default timeout if not specified', () => {
      provider = new OpenAIProvider({ apiKey: 'test-key' });
      expect(provider).toBeDefined();
    });

    it('should handle config without API key', () => {
      provider = new OpenAIProvider({});
      expect(provider).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
    });

    it('should return true for valid config with API key', () => {
      const result = provider.validateConfig({ apiKey: 'valid-key' });
      expect(result).toBe(true);
    });

    it('should return false for config without API key', () => {
      const result = provider.validateConfig({});
      expect(result).toBe(false);
    });

    it('should return false for empty API key', () => {
      const result = provider.validateConfig({ apiKey: '' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only API key', () => {
      const result = provider.validateConfig({ apiKey: '   ' });
      expect(result).toBe(false);
    });
  });

  describe('analyze', () => {
    let mockCreate: any;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
      // Access the mocked client through the provider
      mockCreate = (provider as any).client.chat.completions.create;
    });

    it('should analyze code successfully', async () => {
      const mockResponse = {
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
                    message: 'Potential SQL injection',
                    suggestion: 'Use parameterized queries',
                    codeExample: {
                      before: 'SELECT * FROM users WHERE id = userId',
                      after: 'SELECT * FROM users WHERE id = ?',
                    },
                  },
                ],
                summary: 'Found 1 security issue',
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const code = 'const query = "SELECT * FROM users WHERE id = " + userId;';
      const options: AnalysisOptions = {
        filePath: 'test.ts',
        language: 'typescript',
      };

      const result = await provider.analyze(code, options);

      expect(result).toBeDefined();
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('high');
      expect(result.issues[0].category).toBe('security');
      expect(result.summary).toBe('Found 1 security issue');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw error when client not initialized', async () => {
      const providerWithoutKey = new OpenAIProvider({});

      await expect(
        providerWithoutKey.analyze('code', {})
      ).rejects.toThrow('OpenAI client not initialized');
    });

    it('should throw error when no response from OpenAI', async () => {
      mockCreate.mockResolvedValue({ choices: [] });

      await expect(provider.analyze('code', {})).rejects.toThrow('No response from OpenAI');
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(provider.analyze('code', {})).rejects.toThrow(
        'AI analysis failed: API rate limit exceeded'
      );
    });

    it('should handle unknown errors', async () => {
      mockCreate.mockRejectedValue('Unknown error');

      await expect(provider.analyze('code', {})).rejects.toThrow(
        'AI analysis failed: Unknown error'
      );
    });

    it('should extract JSON from markdown code blocks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```json\n{"issues": [], "summary": "No issues found"}\n```',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.analyze('code', {});

      expect(result.issues).toHaveLength(0);
      expect(result.summary).toBe('No issues found');
    });

    it('should normalize result with missing fields', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                issues: [{ message: 'Test issue' }],
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.analyze('code', {});

      expect(result.issues[0].severity).toBe('info');
      expect(result.issues[0].category).toBe('quality');
      expect(result.issues[0].line).toBe(1);
      expect(result.summary).toBe('Analysis completed.');
    });

    it('should build prompt with all checks enabled by default', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await provider.analyze('code', { language: 'javascript', filePath: 'test.js' });

      const call = mockCreate.mock.calls[0][0];
      const userMessage = call.messages[1].content;

      expect(userMessage).toContain('Code Quality');
      expect(userMessage).toContain('Security Vulnerabilities');
      expect(userMessage).toContain('Performance Issues');
      expect(userMessage).toContain('Best Practices');
      expect(userMessage).toContain('Potential Bugs');
    });

    it('should respect disabled checks in options', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const options: AnalysisOptions = {
        checkSecurity: false,
        checkPerformance: false,
      };

      await provider.analyze('code', options);

      const call = mockCreate.mock.calls[0][0];
      const userMessage = call.messages[1].content;

      expect(userMessage).toContain('Code Quality');
      expect(userMessage).not.toContain('Security Vulnerabilities');
      expect(userMessage).not.toContain('Performance Issues');
      expect(userMessage).toContain('Best Practices');
    });

    it('should use JSON mode for supported models', async () => {
      const providerWithJsonMode = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4o',
      });

      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      (providerWithJsonMode as any).client.chat.completions.create.mockResolvedValue(mockResponse);

      await providerWithJsonMode.analyze('code', {});

      const call = (providerWithJsonMode as any).client.chat.completions.create.mock.calls[0][0];
      expect(call.response_format).toEqual({ type: 'json_object' });
    });

    it('should not use JSON mode for unsupported models', async () => {
      const providerWithoutJsonMode = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
      });

      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      (providerWithoutJsonMode as any).client.chat.completions.create.mockResolvedValue(mockResponse);

      await providerWithoutJsonMode.analyze('code', {});

      const call = (providerWithoutJsonMode as any).client.chat.completions.create.mock.calls[0][0];
      expect(call.response_format).toBeUndefined();
    });

    it('should use custom temperature for supported models', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await provider.analyze('code', {});

      const call = mockCreate.mock.calls[0][0];
      expect(call.temperature).toBe(0.3);
    });

    it('should not use custom temperature for GPT-5 models', async () => {
      const providerGpt5 = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-5',
      });

      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      (providerGpt5 as any).client.chat.completions.create.mockResolvedValue(mockResponse);

      await providerGpt5.analyze('code', {});

      const call = (providerGpt5 as any).client.chat.completions.create.mock.calls[0][0];
      expect(call.temperature).toBeUndefined();
    });
  });

  describe('generateDiagram', () => {
    let mockCreate: any;

    beforeEach(() => {
      provider = new OpenAIProvider(mockConfig);
      mockCreate = (provider as any).client.chat.completions.create;
    });

    it('should generate class diagram successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'classDiagram\n  class User\n  class Account\n  User --> Account',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const code = 'class User {} class Account {}';
      const result = await provider.generateDiagram(code, 'class');

      expect(result.success).toBe(true);
      expect(result.mermaidCode).toContain('classDiagram');
      expect(result.metadata?.diagramType).toBe('class');
    });

    it('should generate flowchart successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'flowchart TD\n  A[Start] --> B[End]',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateDiagram('function test() {}', 'flowchart');

      expect(result.success).toBe(true);
      expect(result.mermaidCode).toContain('flowchart TD');
    });

    it('should extract mermaid code from markdown blocks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```mermaid\nflowchart TD\n  A --> B\n```',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateDiagram('code', 'flowchart');

      expect(result.success).toBe(true);
      expect(result.mermaidCode).toBe('flowchart TD\n  A --> B');
      expect(result.mermaidCode).not.toContain('```');
    });

    it('should handle diagram generation errors', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await provider.generateDiagram('code', 'class');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
      expect(result.mermaidCode).toBe('');
    });

    it('should throw error when client not initialized', async () => {
      const providerWithoutKey = new OpenAIProvider({});

      await expect(providerWithoutKey.generateDiagram('code', 'class')).rejects.toThrow(
        'OpenAI client not initialized'
      );
    });

    it('should use lower temperature for diagram generation', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'classDiagram\n  class Test' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateDiagram('code', 'class');

      const call = mockCreate.mock.calls[0][0];
      expect(call.temperature).toBe(0.2);
    });

    it('should not use temperature for GPT-5 models in diagram generation', async () => {
      const providerGpt5 = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-5-mini',
      });

      const mockResponse = {
        choices: [{ message: { content: 'classDiagram\n  class Test' } }],
      };
      (providerGpt5 as any).client.chat.completions.create.mockResolvedValue(mockResponse);

      await providerGpt5.generateDiagram('code', 'class');

      const call = (providerGpt5 as any).client.chat.completions.create.mock.calls[0][0];
      expect(call.temperature).toBeUndefined();
    });

    it('should generate sequence diagram', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'sequenceDiagram\n  A->>B: Message' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateDiagram('code', 'sequence');

      expect(result.success).toBe(true);
      expect(result.mermaidCode).toContain('sequenceDiagram');
    });

    it('should generate dependency diagram', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'graph TD\n  A --> B' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateDiagram('code', 'dependency');

      expect(result.success).toBe(true);
      expect(result.mermaidCode).toContain('graph TD');
    });

    it('should use class diagram prompt as default for unknown types', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'classDiagram\n  class Test' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateDiagram('code', 'unknown-type');

      const call = mockCreate.mock.calls[0][0];
      const userMessage = call.messages[1].content;
      expect(userMessage).toContain('class diagram');
    });
  });

  describe('Model Support Detection', () => {
    it('should detect JSON mode support for GPT-4o', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-4o' });
      expect((provider as any).supportsJsonMode()).toBe(true);
    });

    it('should detect JSON mode support for GPT-4 Turbo', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-4-turbo' });
      expect((provider as any).supportsJsonMode()).toBe(true);
    });

    it('should detect no JSON mode support for GPT-3.5', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-3.5-turbo' });
      expect((provider as any).supportsJsonMode()).toBe(false);
    });

    it('should detect JSON mode support for GPT-5 series', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-5' });
      expect((provider as any).supportsJsonMode()).toBe(true);
    });

    it('should detect no custom temperature support for GPT-5', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-5' });
      expect((provider as any).supportsCustomTemperature()).toBe(false);
    });

    it('should detect custom temperature support for GPT-4', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-4' });
      expect((provider as any).supportsCustomTemperature()).toBe(true);
    });

    it('should detect custom temperature support for GPT-4o', () => {
      const provider = new OpenAIProvider({ apiKey: 'test', model: 'gpt-4o' });
      expect((provider as any).supportsCustomTemperature()).toBe(true);
    });
  });
});
