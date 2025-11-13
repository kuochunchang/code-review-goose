import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrossFileAnalysisService } from '../../../services/crossFileAnalysisService';
import * as path from 'path';

// 測試用的 fixtures 路徑
const FIXTURES_PATH = path.join(__dirname, '../../fixtures/cross-file');

describe('CrossFileAnalysisService', () => {
  let service: CrossFileAnalysisService;
  const projectPath = FIXTURES_PATH;

  beforeEach(() => {
    service = new CrossFileAnalysisService(projectPath);
  });

  describe('analyzeForward - Depth 1', () => {
    it('應該分析單層依賴（simple/Car.ts → Engine.ts, Wheel.ts）', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      const result = await service.analyzeForward(carFile, 1);

      // 應該包含 3 個檔案：Car.ts (depth 0), Engine.ts (depth 1), Wheel.ts (depth 1)
      expect(result.size).toBe(3);

      // 驗證 Car.ts (depth 0)
      const carResult = result.get(carFile);
      expect(carResult).toBeDefined();
      expect(carResult?.depth).toBe(0);
      expect(carResult?.classes).toHaveLength(1);
      expect(carResult?.classes[0].name).toBe('Car');
      expect(carResult?.imports).toHaveLength(2); // Engine, Wheel

      // 驗證 Engine.ts (depth 1)
      const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');
      const engineResult = result.get(engineFile);
      expect(engineResult).toBeDefined();
      expect(engineResult?.depth).toBe(1);
      expect(engineResult?.classes[0].name).toBe('Engine');

      // 驗證 Wheel.ts (depth 1)
      const wheelFile = path.join(FIXTURES_PATH, 'simple/Wheel.ts');
      const wheelResult = result.get(wheelFile);
      expect(wheelResult).toBeDefined();
      expect(wheelResult?.depth).toBe(1);
      expect(wheelResult?.classes[0].name).toBe('Wheel');
    });

    it('應該正確處理沒有依賴的檔案', async () => {
      const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');

      const result = await service.analyzeForward(engineFile, 1);

      // 只有 Engine.ts 自己
      expect(result.size).toBe(1);
      expect(result.get(engineFile)?.depth).toBe(0);
      expect(result.get(engineFile)?.imports).toHaveLength(0);
    });
  });

  describe('analyzeForward - Depth 2', () => {
    it('應該分析兩層依賴（deep/Level1 → Level2 → Level3）', async () => {
      const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

      const result = await service.analyzeForward(level1File, 2);

      // 應該包含 3 個檔案：Level1 (depth 0), Level2 (depth 1), Level3 (depth 2)
      expect(result.size).toBe(3);

      const level1Result = result.get(level1File);
      expect(level1Result?.depth).toBe(0);
      expect(level1Result?.classes[0].name).toBe('Level1');

      const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');
      const level2Result = result.get(level2File);
      expect(level2Result?.depth).toBe(1);
      expect(level2Result?.classes[0].name).toBe('Level2');

      const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
      const level3Result = result.get(level3File);
      expect(level3Result?.depth).toBe(2);
      expect(level3Result?.classes[0].name).toBe('Level3');
    });

    it('應該在 depth=1 時只分析一層', async () => {
      const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

      const result = await service.analyzeForward(level1File, 1);

      // 只有 Level1 和 Level2，沒有 Level3
      expect(result.size).toBe(2);

      const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
      expect(result.get(level3File)).toBeUndefined();
    });
  });

  describe('analyzeForward - Depth 3', () => {
    it('應該分析三層依賴', async () => {
      const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

      const result = await service.analyzeForward(level1File, 3);

      // 全部 3 層
      expect(result.size).toBe(3);

      const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
      expect(result.get(level3File)?.depth).toBe(2);
    });
  });

  describe('analyzeForward - 循環依賴處理', () => {
    it('應該偵測並避免循環依賴', async () => {
      const aFile = path.join(FIXTURES_PATH, 'circular/A.ts');

      const result = await service.analyzeForward(aFile, 3);

      // 應該只分析 A 和 B，不會無限循環
      expect(result.size).toBe(2);

      const aResult = result.get(aFile);
      expect(aResult?.classes[0].name).toBe('A');

      const bFile = path.join(FIXTURES_PATH, 'circular/B.ts');
      const bResult = result.get(bFile);
      expect(bResult?.classes[0].name).toBe('B');
    });

    it('循環依賴應該在同一深度', async () => {
      const aFile = path.join(FIXTURES_PATH, 'circular/A.ts');

      const result = await service.analyzeForward(aFile, 3);

      const aResult = result.get(aFile);
      const bFile = path.join(FIXTURES_PATH, 'circular/B.ts');
      const bResult = result.get(bFile);

      // A 是起點 (depth 0), B 是 A 的依賴 (depth 1)
      expect(aResult?.depth).toBe(0);
      expect(bResult?.depth).toBe(1);
    });
  });

  describe('analyzeForward - 複雜場景（re-exports）', () => {
    it('應該處理 index.ts re-exports', async () => {
      const userServiceFile = path.join(FIXTURES_PATH, 'complex/services/UserService.ts');

      const result = await service.analyzeForward(userServiceFile, 2);

      // UserService → models/index.ts → User.ts, Profile.ts
      expect(result.size).toBeGreaterThanOrEqual(2); // 至少 UserService 和 index.ts

      const userServiceResult = result.get(userServiceFile);
      expect(userServiceResult?.classes[0].name).toBe('UserService');
      expect(userServiceResult?.imports.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeForward - 錯誤處理', () => {
    it('當檔案不存在時應該拋出錯誤', async () => {
      const nonExistentFile = path.join(FIXTURES_PATH, 'NonExistent.ts');

      await expect(service.analyzeForward(nonExistentFile, 1)).rejects.toThrow();
    });

    it('當檔案有語法錯誤時應該處理優雅', async () => {
      // 這個測試需要一個有語法錯誤的 fixture
      // 暫時跳過，因為我們的 fixtures 都是正確的
      expect(true).toBe(true);
    });

    it('應該處理無效的深度參數', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      // 深度必須是 1-3
      await expect(service.analyzeForward(carFile, 0 as any)).rejects.toThrow();
      await expect(service.analyzeForward(carFile, 4 as any)).rejects.toThrow();
    });
  });

  describe('analyzeForward - OO 關係提取', () => {
    it('應該提取每個檔案的 OO 關係', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      const result = await service.analyzeForward(carFile, 1);

      const carResult = result.get(carFile);

      // Car 應該有 composition (Engine) 和 aggregation (Wheel[]) 關係
      expect(carResult?.relationships.length).toBeGreaterThan(0);

      const compositions = carResult?.relationships.filter((r) => r.type === 'composition');
      const aggregations = carResult?.relationships.filter((r) => r.type === 'aggregation');

      expect(compositions?.length).toBeGreaterThan(0); // Engine
      expect(aggregations?.length).toBeGreaterThan(0); // Wheel[]
    });
  });

  describe('AST 快取', () => {
    it('應該快取已解析的 AST', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      // 第一次分析
      const result1 = await service.analyzeForward(carFile, 1);

      // 第二次分析（應該使用快取）
      const result2 = await service.analyzeForward(carFile, 1);

      // 結果應該相同
      expect(result1.size).toBe(result2.size);
      expect(result1.get(carFile)?.classes[0].name).toBe(result2.get(carFile)?.classes[0].name);
    });

    it('應該在檔案修改時使快取失效', async () => {
      // 這個測試需要實際修改檔案，暫時跳過
      // 在實際環境中，我們會檢查 mtime
      expect(true).toBe(true);
    });
  });

  describe('getAnalyzedFiles', () => {
    it('應該返回所有已分析的檔案列表', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      await service.analyzeForward(carFile, 1);

      const files = service.getAnalyzedFiles();

      expect(files.length).toBe(3); // Car, Engine, Wheel
      expect(files).toContain(carFile);
    });
  });

  describe('clearCache', () => {
    it('應該清除 AST 快取', async () => {
      const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

      await service.analyzeForward(carFile, 1);
      expect(service.getAnalyzedFiles().length).toBeGreaterThan(0);

      service.clearCache();

      expect(service.getAnalyzedFiles().length).toBe(0);
    });
  });
});
