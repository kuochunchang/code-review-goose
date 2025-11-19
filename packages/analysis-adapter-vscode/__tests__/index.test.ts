import { describe, it, expect, vi } from 'vitest';
import { VSCodeFileProvider } from '../src/index.js';

// Mock VS Code API
vi.mock('vscode', () => {
  const Uri = {
    file: (path: string) => ({
      scheme: 'file',
      fsPath: path,
      path: path.replace(/\\/g, '/'),
    }),
  };

  return {
    Uri,
  };
});

describe('index', () => {
  it('should export VSCodeFileProvider', () => {
    expect(VSCodeFileProvider).toBeDefined();
    expect(typeof VSCodeFileProvider).toBe('function');
  });

  it('should be instantiable', () => {
    const provider = new VSCodeFileProvider({ fsPath: '/workspace' } as any);
    expect(provider).toBeDefined();
  });
});

