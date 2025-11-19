/**
 * Unit tests for VSCodeFileProvider
 * Uses Vitest with VS Code API mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VSCodeFileProvider } from '../src/vscode-file-provider.js';
import * as vscode from 'vscode';

// Mock VS Code API
vi.mock('vscode', () => {
  const Uri = {
    file: (path: string) => ({
      scheme: 'file',
      fsPath: path,
      path: path.replace(/\\/g, '/'),
      with: function (changes: { path?: string }) {
        return {
          ...this,
          path: changes.path ?? this.path,
          fsPath: changes.path ?? this.fsPath,
        };
      },
    }),
    parse: (uri: string) => {
      const path = uri.replace('file://', '');
      return Uri.file(path);
    },
    joinPath: (base: any, ...paths: string[]) => {
      const joined = [base.path, ...paths].join('/').replace(/\/+/g, '/');
      return Uri.file(joined);
    },
  };

  const FileType = {
    File: 1,
    Directory: 2,
  };

  const workspace = {
    fs: {
      readFile: vi.fn(),
      stat: vi.fn(),
    },
    findFiles: vi.fn(),
  };

  const RelativePattern = vi.fn((base, pattern) => ({
    base,
    pattern,
  }));

  return {
    Uri,
    FileType,
    workspace,
    RelativePattern,
  };
});

describe('VSCodeFileProvider', () => {
  let provider: VSCodeFileProvider;
  const workspaceUri = vscode.Uri.file('/workspace');

  beforeEach(() => {
    provider = new VSCodeFileProvider(workspaceUri);
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const content = 'export const foo = "bar";';
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: contentBytes.length,
      });

      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(contentBytes);

      const result = await provider.readFile('src/index.ts');
      expect(result).toBe(content);
      expect(vscode.workspace.fs.readFile).toHaveBeenCalled();
    });

    it('should throw error for non-existent file', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('File not found'));

      await expect(provider.readFile('non-existent.ts')).rejects.toThrow('Failed to read file');
    });

    it('should throw error for directory path', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.Directory,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 0,
      });

      await expect(provider.readFile('src')).rejects.toThrow('Path is not a file');
    });

    it('should throw error for paths outside workspace', async () => {
      const outsidePath = '/outside/workspace/file.ts';

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      await expect(provider.readFile(outsidePath)).rejects.toThrow('outside workspace boundary');
    });
  });

  describe('resolveImport', () => {
    it('should resolve relative import with extension', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = './utils.ts';

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeTruthy();
      expect(result).toContain('utils.ts');
    });

    it('should resolve relative import without extension', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = './utils';

      // First call: check if from file exists
      // Second call: check exact path
      // Third call: check with .ts extension (should succeed)
      vi.mocked(vscode.workspace.fs.stat)
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        })
        .mockRejectedValueOnce(new Error('Not found')) // exact path not found
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        }); // .ts extension found

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeTruthy();
    });

    it('should return null for non-relative import', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = 'react';

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeNull();
    });

    it('should return null for non-existent source file', async () => {
      const fromFile = '/workspace/src/non-existent.ts';
      const toImport = './utils';

      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('File not found'));

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeNull();
    });

    it('should resolve index file in directory', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = './components';

      // Mock sequence: from exists, exact path is directory, index.ts exists
      vi.mocked(vscode.workspace.fs.stat)
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        })
        .mockRejectedValueOnce(new Error('Not found')) // .ts
        .mockRejectedValueOnce(new Error('Not found')) // .tsx
        .mockRejectedValueOnce(new Error('Not found')) // .js
        .mockRejectedValueOnce(new Error('Not found')) // .jsx
        .mockResolvedValueOnce({
          type: vscode.FileType.Directory,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0,
        })
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        });

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeTruthy();
    });
  });

  describe('listFiles', () => {
    it('should list files matching pattern', async () => {
      const mockUris = [
        vscode.Uri.file('/workspace/src/index.ts'),
        vscode.Uri.file('/workspace/src/utils.ts'),
      ];

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris);

      const result = await provider.listFiles('**/*.ts');
      expect(result).toHaveLength(2);
      expect(result).toContain('/workspace/src/index.ts');
      expect(result).toContain('/workspace/src/utils.ts');
    });

    it('should return empty array on error', async () => {
      vi.mocked(vscode.workspace.findFiles).mockRejectedValue(new Error('Search failed'));

      const result = await provider.listFiles('**/*.ts');
      expect(result).toEqual([]);
    });

    it('should filter files outside workspace', async () => {
      const mockUris = [
        vscode.Uri.file('/workspace/src/index.ts'),
        vscode.Uri.file('/outside/file.ts'),
      ];

      vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris);

      const result = await provider.listFiles('**/*.ts');
      expect(result).toHaveLength(1);
      expect(result).toContain('/workspace/src/index.ts');
      expect(result).not.toContain('/outside/file.ts');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      const result = await provider.exists('/workspace/src/index.ts');
      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('Not found'));

      const result = await provider.exists('/workspace/src/non-existent.ts');
      expect(result).toBe(false);
    });

    it('should return true for existing directory', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.Directory,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 0,
      });

      const result = await provider.exists('/workspace/src');
      expect(result).toBe(true);
    });
  });

  describe('path resolution edge cases', () => {
    it('should handle absolute file:// URIs', async () => {
      const content = 'test content';
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(content);

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: contentBytes.length,
      });

      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(contentBytes);

      const result = await provider.readFile('file:///workspace/src/index.ts');
      expect(result).toBe(content);
    });

    it('should handle Windows-style paths', async () => {
      const windowsProvider = new VSCodeFileProvider(vscode.Uri.file('C:\\workspace'));

      vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: 100,
      });

      const result = await windowsProvider.exists('C:\\workspace\\src\\index.ts');
      expect(result).toBe(true);
    });
  });

  describe('resolveImport - error handling', () => {
    it('should handle errors during import resolution', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = './utils.ts';

      // Mock to throw error during resolution (after checking source file exists)
      // Need to mock all possible paths that resolveImport tries:
      // 1. Check source file exists
      // 2. Check exact path (has .ts extension)
      // 3. Check if it's a directory
      // 4. Try index files in directory
      vi.mocked(vscode.workspace.fs.stat)
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        })
        .mockRejectedValueOnce(new Error('Network error')) // Error when checking exact path with .ts
        .mockRejectedValueOnce(new Error('Network error')) // Error when checking if directory
        .mockRejectedValue(new Error('Network error')); // Error for any subsequent checks

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeNull();
    });
  });

  describe('isWithinWorkspace - edge cases', () => {
    it('should handle workspace path with trailing slash', () => {
      const providerWithSlash = new VSCodeFileProvider(vscode.Uri.file('/workspace/'));
      const uri = vscode.Uri.file('/workspace/src/file.ts');
      
      // Access private method through any cast
      const isWithin = (providerWithSlash as any).isWithinWorkspace(uri);
      expect(isWithin).toBe(true);
    });

    it('should handle file path with trailing slash', () => {
      const uri = vscode.Uri.file('/workspace/src/file.ts/');
      
      // Access private method through any cast
      const isWithin = (provider as any).isWithinWorkspace(uri);
      expect(isWithin).toBe(true);
    });

    it('should handle errors in isWithinWorkspace', () => {
      const invalidUri = { fsPath: null } as any;
      
      // Access private method through any cast
      const isWithin = (provider as any).isWithinWorkspace(invalidUri);
      expect(isWithin).toBe(false);
    });
  });

  describe('resolveFile - edge cases', () => {
    it('should handle directory without index file', async () => {
      const fromFile = '/workspace/src/app.ts';
      const toImport = './empty-dir';

      vi.mocked(vscode.workspace.fs.stat)
        .mockResolvedValueOnce({
          type: vscode.FileType.File,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 100,
        })
        .mockRejectedValueOnce(new Error('Not found')) // .ts
        .mockRejectedValueOnce(new Error('Not found')) // .tsx
        .mockRejectedValueOnce(new Error('Not found')) // .js
        .mockRejectedValueOnce(new Error('Not found')) // .jsx
        .mockResolvedValueOnce({
          type: vscode.FileType.Directory,
          ctime: Date.now(),
          mtime: Date.now(),
          size: 0,
        })
        .mockRejectedValue(new Error('No index file')); // All index files not found

      const result = await provider.resolveImport(fromFile, toImport);
      expect(result).toBeNull();
    });
  });
});
