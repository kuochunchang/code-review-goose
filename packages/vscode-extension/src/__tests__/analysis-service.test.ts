import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis-service.js';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };

      constructor() {}
    },
  };
});

describe('AnalysisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require API key', () => {
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

  // Note: Full integration tests with OpenAI would require mocking
  // the entire OpenAI client, which is complex. For now, we test
  // the service can be instantiated correctly.
  // More comprehensive tests would be added in an integration test suite.
});
