import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PathResolver } from '../../../services/pathResolver';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('PathResolver', () => {
  let tempDir: string;
  let pathResolver: PathResolver;

  beforeEach(async () => {
    // 建立臨時測試目錄
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-resolver-test-'));
    pathResolver = new PathResolver(tempDir);

    // 建立測試檔案結構
    await fs.ensureDir(path.join(tempDir, 'src'));
    await fs.ensureDir(path.join(tempDir, 'src/models'));
    await fs.ensureDir(path.join(tempDir, 'src/services'));
    await fs.ensureDir(path.join(tempDir, 'lib'));

    // 建立測試檔案
    await fs.writeFile(path.join(tempDir, 'src/models/User.ts'), '// User model');
    await fs.writeFile(path.join(tempDir, 'src/models/Profile.ts'), '// Profile model');
    await fs.writeFile(path.join(tempDir, 'src/models/index.ts'), '// Re-exports');
    await fs.writeFile(path.join(tempDir, 'src/services/UserService.ts'), '// User service');
    await fs.writeFile(
      path.join(tempDir, 'src/services/AuthService.tsx'),
      '// Auth service with TSX'
    );
    await fs.writeFile(path.join(tempDir, 'src/App.jsx'), '// React app');
    await fs.writeFile(path.join(tempDir, 'lib/utils.js'), '// Utilities');
  });

  afterEach(async () => {
    // 清理臨時目錄
    await fs.remove(tempDir);
  });

  describe('resolveImportPath', () => {
    describe('相對路徑解析', () => {
      it('應該解析同層級的相對路徑 (./ prefix)', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = './AuthService';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/services/AuthService.tsx'));
      });

      it('應該解析上層目錄的相對路徑 (../ prefix)', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../models/User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/User.ts'));
      });

      it('應該解析多層上層目錄 (../../)', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../../lib/utils';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'lib/utils.js'));
      });

      it('應該解析沒有 ./ 前綴的同層級路徑（當作相對路徑）', async () => {
        const fromFile = path.join(tempDir, 'src/models/User.ts');
        const importPath = './Profile';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/Profile.ts'));
      });
    });

    describe('檔案副檔名推斷', () => {
      it('應該優先嘗試 .ts 副檔名', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../models/User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/User.ts'));
      });

      it('應該嘗試 .tsx 副檔名（當 .ts 不存在時）', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = './AuthService';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/services/AuthService.tsx'));
      });

      it('應該嘗試 .jsx 副檔名', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../App';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/App.jsx'));
      });

      it('應該嘗試 .js 副檔名', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../../lib/utils';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'lib/utils.js'));
      });

      it('當已有副檔名時應該直接使用', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../models/User.ts';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/User.ts'));
      });
    });

    describe('index.ts 自動解析', () => {
      it('應該自動解析目錄到 index.ts', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../models';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/index.ts'));
      });

      it('應該優先使用明確指定的檔案而非 index.ts', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../models/User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/User.ts'));
      });
    });

    describe('錯誤處理', () => {
      it('當檔案不存在時應該返回 null', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = './NonExistentFile';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });

      it('當路徑指向專案外部時應該返回 null', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '../../../etc/passwd';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });

      it('應該忽略 node_modules 中的路徑', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = 'react';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });

      it('應該忽略以 @ 開頭的絕對路徑（TypeScript path aliases - 未來支援）', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '@/models/User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });
    });

    describe('邊界條件', () => {
      it('應該處理空字串 import path', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = '';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });

      it('應該處理 fromFile 不存在的情況', async () => {
        const fromFile = path.join(tempDir, 'src/NonExistent.ts');
        const importPath = './User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBeNull();
      });

      it('應該正規化路徑（移除多餘的 / 和 .）', async () => {
        const fromFile = path.join(tempDir, 'src/services/UserService.ts');
        const importPath = './../models/./User';

        const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

        expect(resolved).toBe(path.join(tempDir, 'src/models/User.ts'));
      });
    });
  });

  describe('isRelativePath', () => {
    it('應該識別 ./ 開頭的相對路徑', () => {
      expect(pathResolver.isRelativePath('./User')).toBe(true);
    });

    it('應該識別 ../ 開頭的相對路徑', () => {
      expect(pathResolver.isRelativePath('../models/User')).toBe(true);
    });

    it('不應該將絕對路徑識別為相對路徑', () => {
      expect(pathResolver.isRelativePath('react')).toBe(false);
    });

    it('不應該將 @ 開頭的路徑識別為相對路徑', () => {
      expect(pathResolver.isRelativePath('@/models/User')).toBe(false);
    });

    it('不應該將 ~ 開頭的路徑識別為相對路徑', () => {
      expect(pathResolver.isRelativePath('~/utils')).toBe(false);
    });
  });

  describe('isWithinProject', () => {
    it('應該確認專案內的路徑', () => {
      const filePath = path.join(tempDir, 'src/models/User.ts');
      expect(pathResolver.isWithinProject(filePath)).toBe(true);
    });

    it('應該拒絕專案外的路徑', () => {
      const filePath = '/etc/passwd';
      expect(pathResolver.isWithinProject(filePath)).toBe(false);
    });

    it('應該拒絕使用 ../ 跳出專案的路徑', () => {
      const filePath = path.join(tempDir, '../outside.ts');
      expect(pathResolver.isWithinProject(filePath)).toBe(false);
    });

    it('應該處理符號連結和正規化路徑', () => {
      const filePath = path.join(tempDir, 'src/../models/User.ts');
      expect(pathResolver.isWithinProject(filePath)).toBe(true);
    });
  });

  describe('整合測試', () => {
    it('應該正確處理複雜的檔案結構', async () => {
      // 建立更複雜的結構
      await fs.ensureDir(path.join(tempDir, 'src/components/common'));
      await fs.writeFile(path.join(tempDir, 'src/components/common/Button.tsx'), '// Button');
      await fs.writeFile(path.join(tempDir, 'src/components/common/index.ts'), '// Common exports');

      const fromFile = path.join(tempDir, 'src/services/UserService.ts');
      const importPath = '../components/common';

      const resolved = await pathResolver.resolveImportPath(fromFile, importPath);

      expect(resolved).toBe(path.join(tempDir, 'src/components/common/index.ts'));
    });

    it('應該處理連續的相對路徑解析', async () => {
      const fromFile1 = path.join(tempDir, 'src/services/UserService.ts');
      const importPath1 = '../models/User';

      const resolved1 = await pathResolver.resolveImportPath(fromFile1, importPath1);
      expect(resolved1).toBe(path.join(tempDir, 'src/models/User.ts'));

      // 從 User.ts 繼續解析
      const importPath2 = './Profile';
      const resolved2 = await pathResolver.resolveImportPath(resolved1!, importPath2);
      expect(resolved2).toBe(path.join(tempDir, 'src/models/Profile.ts'));
    });
  });
});
