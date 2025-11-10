import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomProvider } from '../../../../services/providers/customProvider.js';
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

describe('CustomProvider', () => {
  let provider: CustomProvider;
  let mockConfig: AIProviderConfig & { baseUrl: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      baseUrl: 'https://llm.webcomm.com.tw/v1',
      apiKey: 'test-api-key',
      model: 'instruct',
      timeout: 30000,
    };
  });

  describe('Constructor', () => {
    it('should create provider with valid config', () => {
      provider = new CustomProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.name).toBe('custom');
    });

    it('should use default model if not specified', () => {
      provider = new CustomProvider({
        baseUrl: 'https://example.com/v1',
        apiKey: 'test-key',
      });
      expect(provider).toBeDefined();
    });

    it('should use default timeout if not specified', () => {
      provider = new CustomProvider({
        baseUrl: 'https://example.com/v1',
        apiKey: 'test-key',
      });
      expect(provider).toBeDefined();
    });

    it('should handle config without API key (for local services)', () => {
      provider = new CustomProvider({
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama2',
      });
      expect(provider).toBeDefined();
    });

    it('should support various model names', () => {
      const models = ['small-instruct', 'multimodal', 'instruct', 'think'];
      models.forEach((model) => {
        const p = new CustomProvider({
          baseUrl: 'https://example.com/v1',
          model,
        });
        expect(p).toBeDefined();
      });
    });
  });

  describe('validateConfig', () => {
    beforeEach(() => {
      provider = new CustomProvider(mockConfig);
    });

    it('should return true for valid config with base URL', () => {
      const result = provider.validateConfig({
        baseUrl: 'https://example.com/v1',
        apiKey: 'key',
      });
      expect(result).toBe(true);
    });

    it('should return false for config without base URL', () => {
      const result = provider.validateConfig({ apiKey: 'key' });
      expect(result).toBe(false);
    });

    it('should return false for empty base URL', () => {
      const result = provider.validateConfig({ baseUrl: '', apiKey: 'key' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only base URL', () => {
      const result = provider.validateConfig({ baseUrl: '   ', apiKey: 'key' });
      expect(result).toBe(false);
    });

    it('should return true even without API key (for local services)', () => {
      const result = provider.validateConfig({ baseUrl: 'http://localhost:11434/v1' });
      expect(result).toBe(true);
    });
  });

  describe('analyze', () => {
    let mockCreate: any;

    beforeEach(() => {
      provider = new CustomProvider(mockConfig);
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

    it('should throw error when no response from provider', async () => {
      mockCreate.mockResolvedValue({ choices: [] });

      await expect(provider.analyze('code', {})).rejects.toThrow(
        'No response from custom AI provider'
      );
    });

    it('should handle API errors', async () => {
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

    it('should use temperature 0.3 for analysis', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await provider.analyze('code', {});

      const call = mockCreate.mock.calls[0][0];
      expect(call.temperature).toBe(0.3);
    });

    it('should send correct model in request', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await provider.analyze('code', {});

      const call = mockCreate.mock.calls[0][0];
      expect(call.model).toBe('instruct');
    });
  });

  describe('generateDiagram', () => {
    let mockCreate: any;

    beforeEach(() => {
      provider = new CustomProvider(mockConfig);
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

    it('should use lower temperature for diagram generation', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'classDiagram\n  class Test' } }],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateDiagram('code', 'class');

      const call = mockCreate.mock.calls[0][0];
      expect(call.temperature).toBe(0.2);
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

  describe('Integration with different base URLs', () => {
    it('should work with webcomm.com.tw URL', () => {
      const p = new CustomProvider({
        baseUrl: 'https://llm.webcomm.com.tw/v1',
        model: 'small-instruct',
      });
      expect(p).toBeDefined();
    });

    it('should work with localhost URL', () => {
      const p = new CustomProvider({
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama2',
      });
      expect(p).toBeDefined();
    });

    it('should work with custom port', () => {
      const p = new CustomProvider({
        baseUrl: 'http://192.168.1.100:8080/v1',
        model: 'custom-model',
      });
      expect(p).toBeDefined();
    });
  });

  describe('Supported models', () => {
    it('should support small-instruct model', async () => {
      const p = new CustomProvider({
        baseUrl: 'https://llm.webcomm.com.tw/v1',
        model: 'small-instruct',
      });
      const mockCreate = (p as any).client.chat.completions.create;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      });

      await p.analyze('code', {});
      expect(mockCreate.mock.calls[0][0].model).toBe('small-instruct');
    });

    it('should support multimodal model', async () => {
      const p = new CustomProvider({
        baseUrl: 'https://llm.webcomm.com.tw/v1',
        model: 'multimodal',
      });
      const mockCreate = (p as any).client.chat.completions.create;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      });

      await p.analyze('code', {});
      expect(mockCreate.mock.calls[0][0].model).toBe('multimodal');
    });

    it('should support instruct model', async () => {
      const p = new CustomProvider({
        baseUrl: 'https://llm.webcomm.com.tw/v1',
        model: 'instruct',
      });
      const mockCreate = (p as any).client.chat.completions.create;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      });

      await p.analyze('code', {});
      expect(mockCreate.mock.calls[0][0].model).toBe('instruct');
    });

    it('should support think model', async () => {
      const p = new CustomProvider({
        baseUrl: 'https://llm.webcomm.com.tw/v1',
        model: 'think',
      });
      const mockCreate = (p as any).client.chat.completions.create;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"issues": [], "summary": "ok"}' } }],
      });

      await p.analyze('code', {});
      expect(mockCreate.mock.calls[0][0].model).toBe('think');
    });
  });
});
