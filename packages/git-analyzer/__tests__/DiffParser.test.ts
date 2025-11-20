/**
 * Tests for DiffParser utility
 */

import { describe, it, expect } from 'vitest';
import { DiffParser } from '../src/utils/DiffParser.js';
import type { WorkingDirectoryChanges } from '../src/types/git.types.js';

describe('DiffParser', () => {
  const parser = new DiffParser();

  const sampleGitChanges: WorkingDirectoryChanges = {
    type: 'working-directory',
    files: [
      {
        path: 'src/utils/helper.ts',
        status: 'modified',
        linesAdded: 2,
        linesDeleted: 1,
      },
    ],
    diff: `diff --git a/src/utils/helper.ts b/src/utils/helper.ts
index 1234567..abcdefg 100644
--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -1,5 +1,7 @@
 export function helper() {
-  console.log('old');
+  console.log('new');
+  console.log('added line');
 }`,
    summary: {
      filesChanged: 1,
      insertions: 2,
      deletions: 1,
    },
  };

  describe('parseGitChanges', () => {
    it('should parse Git changes', () => {
      const result = parser.parseGitChanges(sampleGitChanges);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe('src/utils/helper.ts');
      expect(result[0].changeType).toBe('modified');
      expect(result[0].additions).toBe(2);
      expect(result[0].deletions).toBe(1);
    });

    it('should detect change types correctly', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'new.ts', status: 'added', linesAdded: 10, linesDeleted: 0 },
          { path: 'deleted.ts', status: 'deleted', linesAdded: 0, linesDeleted: 10 },
          { path: 'modified.ts', status: 'modified', linesAdded: 5, linesDeleted: 5 },
          {
            path: 'renamed.ts',
            oldPath: 'old.ts',
            status: 'renamed',
            linesAdded: 0,
            linesDeleted: 0,
          },
        ],
        diff: '',
        summary: { filesChanged: 4, insertions: 15, deletions: 15 },
      };

      const result = parser.parseGitChanges(changes);

      expect(result[0].changeType).toBe('added');
      expect(result[1].changeType).toBe('deleted');
      expect(result[2].changeType).toBe('modified');
      expect(result[3].changeType).toBe('renamed');
      expect(result[3].oldPath).toBe('old.ts');
    });

    it('should extract file extensions', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'test.ts', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'test.jsx', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'README.md', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'no-extension', status: 'added', linesAdded: 1, linesDeleted: 0 },
        ],
        diff: '',
        summary: { filesChanged: 4, insertions: 4, deletions: 0 },
      };

      const result = parser.parseGitChanges(changes);

      expect(result[0].extension).toBe('ts');
      expect(result[1].extension).toBe('jsx');
      expect(result[2].extension).toBe('md');
      expect(result[3].extension).toBe('');
    });

    it('should calculate complexity', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [{ path: 'test.ts', status: 'modified', linesAdded: 10, linesDeleted: 5 }],
        diff: '',
        summary: { filesChanged: 1, insertions: 10, deletions: 5 },
      };

      const result = parser.parseGitChanges(changes);

      expect(result[0].complexity).toBe(15);
    });
  });

  describe('formatDiffForAnalysis', () => {
    it('should format diff with metadata', () => {
      const parsed = parser.parseGitChanges(sampleGitChanges)[0];
      const formatted = parser.formatDiffForAnalysis(parsed);

      expect(formatted).toContain('File: src/utils/helper.ts');
      expect(formatted).toContain('Change Type: modified');
      expect(formatted).toContain('Language: TypeScript');
      expect(formatted).toContain('Changes: +2 -1');
    });

    it('should exclude metadata when requested', () => {
      const parsed = parser.parseGitChanges(sampleGitChanges)[0];
      const formatted = parser.formatDiffForAnalysis(parsed, {
        includeMetadata: false,
      });

      expect(formatted).not.toContain('File:');
      expect(formatted).not.toContain('Change Type:');
    });
  });

  describe('groupByExtension', () => {
    it('should group files by extension', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'a.ts', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'b.ts', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'c.jsx', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'd.py', status: 'added', linesAdded: 1, linesDeleted: 0 },
        ],
        diff: '',
        summary: { filesChanged: 4, insertions: 4, deletions: 0 },
      };

      const parsed = parser.parseGitChanges(changes);
      const groups = parser.groupByExtension(parsed);

      expect(groups.size).toBe(3);
      expect(groups.get('ts')).toHaveLength(2);
      expect(groups.get('jsx')).toHaveLength(1);
      expect(groups.get('py')).toHaveLength(1);
    });

    it('should handle files without extensions', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'Makefile', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'README', status: 'added', linesAdded: 1, linesDeleted: 0 },
        ],
        diff: '',
        summary: { filesChanged: 2, insertions: 2, deletions: 0 },
      };

      const parsed = parser.parseGitChanges(changes);
      const groups = parser.groupByExtension(parsed);

      expect(groups.get('unknown')).toHaveLength(2);
    });
  });

  describe('sortByComplexity', () => {
    it('should sort files by complexity descending', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'low.ts', status: 'modified', linesAdded: 2, linesDeleted: 1 },
          { path: 'high.ts', status: 'modified', linesAdded: 50, linesDeleted: 30 },
          { path: 'medium.ts', status: 'modified', linesAdded: 10, linesDeleted: 5 },
        ],
        diff: '',
        summary: { filesChanged: 3, insertions: 62, deletions: 36 },
      };

      const parsed = parser.parseGitChanges(changes);
      const sorted = parser.sortByComplexity(parsed);

      expect(sorted[0].file).toBe('high.ts');
      expect(sorted[1].file).toBe('medium.ts');
      expect(sorted[2].file).toBe('low.ts');
    });

    it('should not modify original array', () => {
      const parsed = parser.parseGitChanges(sampleGitChanges);
      const original = [...parsed];
      parser.sortByComplexity(parsed);

      expect(parsed).toEqual(original);
    });
  });

  describe('filterByChangeType', () => {
    it('should filter by single change type', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'added.ts', status: 'added', linesAdded: 10, linesDeleted: 0 },
          { path: 'modified.ts', status: 'modified', linesAdded: 5, linesDeleted: 5 },
          { path: 'deleted.ts', status: 'deleted', linesAdded: 0, linesDeleted: 10 },
        ],
        diff: '',
        summary: { filesChanged: 3, insertions: 15, deletions: 15 },
      };

      const parsed = parser.parseGitChanges(changes);
      const filtered = parser.filterByChangeType(parsed, ['added']);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].file).toBe('added.ts');
    });

    it('should filter by multiple change types', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'added.ts', status: 'added', linesAdded: 10, linesDeleted: 0 },
          { path: 'modified.ts', status: 'modified', linesAdded: 5, linesDeleted: 5 },
          { path: 'deleted.ts', status: 'deleted', linesAdded: 0, linesDeleted: 10 },
        ],
        diff: '',
        summary: { filesChanged: 3, insertions: 15, deletions: 15 },
      };

      const parsed = parser.parseGitChanges(changes);
      const filtered = parser.filterByChangeType(parsed, ['added', 'modified']);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('filterByExtension', () => {
    it('should filter by extension', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'a.ts', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'b.jsx', status: 'added', linesAdded: 1, linesDeleted: 0 },
          { path: 'c.ts', status: 'added', linesAdded: 1, linesDeleted: 0 },
        ],
        diff: '',
        summary: { filesChanged: 3, insertions: 3, deletions: 0 },
      };

      const parsed = parser.parseGitChanges(changes);
      const filtered = parser.filterByExtension(parsed, ['ts']);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((f) => f.extension === 'ts')).toBe(true);
    });

    it('should be case insensitive', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [{ path: 'a.TS', status: 'added', linesAdded: 1, linesDeleted: 0 }],
        diff: '',
        summary: { filesChanged: 1, insertions: 1, deletions: 0 },
      };

      const parsed = parser.parseGitChanges(changes);
      const filtered = parser.filterByExtension(parsed, ['ts']);

      expect(filtered).toHaveLength(1);
    });
  });

  describe('createSummary', () => {
    it('should create comprehensive summary', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [
          { path: 'a.ts', status: 'modified', linesAdded: 10, linesDeleted: 5 },
          { path: 'b.jsx', status: 'added', linesAdded: 20, linesDeleted: 0 },
          { path: 'c.ts', status: 'deleted', linesAdded: 0, linesDeleted: 10 },
        ],
        diff: '',
        summary: { filesChanged: 3, insertions: 30, deletions: 15 },
      };

      const parsed = parser.parseGitChanges(changes);
      const summary = parser.createSummary(parsed);

      expect(summary.totalFiles).toBe(3);
      expect(summary.totalAdditions).toBe(30);
      expect(summary.totalDeletions).toBe(15);
      expect(summary.byChangeType.modified).toBe(1);
      expect(summary.byChangeType.added).toBe(1);
      expect(summary.byChangeType.deleted).toBe(1);
      expect(summary.byExtension.ts).toBe(2);
      expect(summary.byExtension.jsx).toBe(1);
      expect(summary.mostComplexFile?.file).toBe('b.jsx');
    });

    it('should handle empty array', () => {
      const summary = parser.createSummary([]);

      expect(summary.totalFiles).toBe(0);
      expect(summary.totalAdditions).toBe(0);
      expect(summary.totalDeletions).toBe(0);
      expect(summary.mostComplexFile).toBeNull();
    });
  });

  describe('language detection', () => {
    it('should detect common languages', () => {
      const testCases = [
        { path: 'test.ts', expected: 'TypeScript' },
        { path: 'test.js', expected: 'JavaScript' },
        { path: 'test.py', expected: 'Python' },
        { path: 'test.java', expected: 'Java' },
        { path: 'test.go', expected: 'Go' },
        { path: 'test.rs', expected: 'Rust' },
        { path: 'test.md', expected: 'Markdown' },
      ];

      for (const { path, expected } of testCases) {
        const changes: WorkingDirectoryChanges = {
          type: 'working-directory',
          files: [{ path, status: 'added', linesAdded: 1, linesDeleted: 0 }],
          diff: '',
          summary: { filesChanged: 1, insertions: 1, deletions: 0 },
        };

        const parsed = parser.parseGitChanges(changes)[0];
        const formatted = parser.formatDiffForAnalysis(parsed);

        expect(formatted).toContain(`Language: ${expected}`);
      }
    });

    it('should handle unknown extensions', () => {
      const changes: WorkingDirectoryChanges = {
        type: 'working-directory',
        files: [{ path: 'test.xyz', status: 'added', linesAdded: 1, linesDeleted: 0 }],
        diff: '',
        summary: { filesChanged: 1, insertions: 1, deletions: 0 },
      };

      const parsed = parser.parseGitChanges(changes)[0];
      const formatted = parser.formatDiffForAnalysis(parsed);

      expect(formatted).toContain('Language: Unknown');
    });
  });
});
