import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis-service.js';

// Mock OpenAI
let lastConstructorConfig: any = {};
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };

      constructor(config: any) {
        lastConstructorConfig = config;
      }
    },
  };
});

describe('AnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastConstructorConfig = {};
  });

  it('should require API key when not using custom API', () => {
    expect(() => {
      new AnalysisService({ apiKey: '' });
    }).toThrow('OpenAI API key is required');
  });

  it('should create service with valid config', () => {
    const service = new AnalysisService({
      apiKey: 'test-key',
      model: 'gpt-4',
    });

    expect(service).toBeDefined();
  });

  it('should use default model if not specified', () => {
    const service = new AnalysisService({
      apiKey: 'test-key',
    });

    expect(service).toBeDefined();
  });

  describe('Custom API support', () => {
    it('should support custom baseURL', () => {
      const service = new AnalysisService({
        apiKey: 'test-key',
        model: 'small-instruct',
        baseURL: 'https://llm.webcomm.com.tw/v1',
      });

      expect(service).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBe('https://llm.webcomm.com.tw/v1');
      expect(lastConstructorConfig.apiKey).toBe('test-key');
    });

    it('should allow empty API key when using custom baseURL', () => {
      const service = new AnalysisService({
        apiKey: '',
        model: 'small-instruct',
        baseURL: 'https://llm.webcomm.com.tw/v1',
      });

      expect(service).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBe('https://llm.webcomm.com.tw/v1');
      expect(lastConstructorConfig.apiKey).toBe('dummy-key');
    });

    it('should support localhost URLs', () => {
      const service = new AnalysisService({
        apiKey: '',
        model: 'custom-model',
        baseURL: 'http://localhost:8080/v1',
      });

      expect(service).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBe('http://localhost:8080/v1');
    });

    it('should support custom model names with custom API', () => {
      const service = new AnalysisService({
        apiKey: '',
        model: 'multimodal',
        baseURL: 'https://custom-api.example.com/v1',
      });

      expect(service).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBe('https://custom-api.example.com/v1');
    });

    it('should not add baseURL to config when not provided', () => {
      const service = new AnalysisService({
        apiKey: 'test-key',
        model: 'gpt-4o',
      });

      expect(service).toBeDefined();
      expect(lastConstructorConfig.baseURL).toBeUndefined();
      expect(lastConstructorConfig.apiKey).toBe('test-key');
    });
  });

  // Note: Full integration tests with OpenAI would require mocking
  // the entire OpenAI client, which is complex. For now, we test
  // the service can be instantiated correctly.
  // More comprehensive tests would be added in an integration test suite.
});
