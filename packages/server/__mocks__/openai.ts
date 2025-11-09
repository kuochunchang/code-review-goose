import { vi } from 'vitest';

export class OpenAI {
  chat = {
    completions: {
      create: vi.fn(),
    },
  };

  constructor(_config?: any) {
    // Mock constructor
  }
}
