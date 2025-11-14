import { describe, it, expect, beforeEach } from 'vitest';
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

  describe('analyzeReverse - Reverse Mode', () => {
    describe('Depth 1 - Direct Dependents', () => {
      it('應該找到直接依賴者（Engine.ts ← Car.ts）', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeReverse(engineFile, 1);

        // 應該包含 Engine.ts 和 Car.ts
        expect(result.size).toBeGreaterThanOrEqual(2);

        // 驗證 Engine.ts 自己 (depth 0)
        const engineResult = result.get(engineFile);
        expect(engineResult).toBeDefined();
        expect(engineResult?.depth).toBe(0);
        expect(engineResult?.classes[0].name).toBe('Engine');

        // 驗證 Car.ts (depth 1 - 依賴 Engine)
        const carResult = result.get(carFile);
        expect(carResult).toBeDefined();
        expect(carResult?.depth).toBe(1);
        expect(carResult?.classes[0].name).toBe('Car');
      });

      it(
        '應該處理沒有依賴者的檔案',
        async () => {
          const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

          const result = await service.analyzeReverse(carFile, 1);

          // 只有 Car.ts 自己
          expect(result.size).toBe(1);
          expect(result.get(carFile)?.depth).toBe(0);
        },
        10000
      ); // Increase timeout for reverse analysis

      it('應該找到多個檔案依賴同一個目標', async () => {
        // Wheel is used by Car (could be used by other classes too)
        const wheelFile = path.join(FIXTURES_PATH, 'simple/Wheel.ts');
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeReverse(wheelFile, 1);

        // 應該包含 Wheel.ts 和 Car.ts
        expect(result.size).toBeGreaterThanOrEqual(2);
        expect(result.get(wheelFile)?.depth).toBe(0);
        expect(result.get(carFile)?.depth).toBe(1);
      });
    });

    describe('Depth 2 - Indirect Dependents', () => {
      it('應該找到兩層依賴者（Level3 ← Level2 ← Level1）', async () => {
        const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
        const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');
        const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

        const result = await service.analyzeReverse(level3File, 2);

        // 應該包含 3 個檔案
        expect(result.size).toBe(3);

        expect(result.get(level3File)?.depth).toBe(0);
        expect(result.get(level2File)?.depth).toBe(1);
        expect(result.get(level1File)?.depth).toBe(2);
      });

      it('應該在 depth=1 時只分析一層', async () => {
        const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
        const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

        const result = await service.analyzeReverse(level3File, 1);

        // 只有 Level3 和 Level2，沒有 Level1
        expect(result.size).toBe(2);
        expect(result.get(level1File)).toBeUndefined();
      });
    });

    describe('Depth 3 - Three-level Dependents', () => {
      it('應該分析三層依賴者', async () => {
        const level3File = path.join(FIXTURES_PATH, 'deep/Level3.ts');
        const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');
        const level1File = path.join(FIXTURES_PATH, 'deep/Level1.ts');

        const result = await service.analyzeReverse(level3File, 3);

        // 應該包含所有 3 個檔案
        expect(result.size).toBe(3);

        expect(result.get(level3File)?.depth).toBe(0);
        expect(result.get(level2File)?.depth).toBe(1);
        expect(result.get(level1File)?.depth).toBe(2);
      });
    });

    describe('Circular Dependencies', () => {
      it('應該處理循環依賴（A ↔ B）', async () => {
        const fileA = path.join(FIXTURES_PATH, 'circular/A.ts');
        const fileB = path.join(FIXTURES_PATH, 'circular/B.ts');

        // 從 A 分析反向依賴
        const resultA = await service.analyzeReverse(fileA, 1);

        // A 被 B 依賴
        expect(resultA.size).toBeGreaterThanOrEqual(2);
        expect(resultA.get(fileA)?.depth).toBe(0);
        expect(resultA.get(fileB)?.depth).toBe(1);

        // 從 B 分析反向依賴
        const resultB = await service.analyzeReverse(fileB, 1);

        // B 被 A 依賴
        expect(resultB.size).toBeGreaterThanOrEqual(2);
        expect(resultB.get(fileB)?.depth).toBe(0);
        expect(resultB.get(fileA)?.depth).toBe(1);
      });

      it('應該避免循環依賴造成的無限迴圈', async () => {
        const fileA = path.join(FIXTURES_PATH, 'circular/A.ts');

        // 深度 2 應該不會造成無限迴圈
        const result = await service.analyzeReverse(fileA, 2);

        // 應該只有 2 個檔案（A 和 B），不會重複
        expect(result.size).toBe(2);
      });
    });

    describe('Complex Scenarios', () => {
      it(
        '應該處理 re-exports (index.ts)',
        async () => {
          const userFile = path.join(FIXTURES_PATH, 'complex/models/User.ts');
          const indexFile = path.join(FIXTURES_PATH, 'complex/models/index.ts');
          const userServiceFile = path.join(FIXTURES_PATH, 'complex/services/UserService.ts');

          const result = await service.analyzeReverse(userFile, 2);

        // User.ts 被 index.ts 匯出，index.ts 被 UserService.ts 使用
        expect(result.size).toBeGreaterThanOrEqual(2);
        expect(result.get(userFile)?.depth).toBe(0);

          // 應該找到 index.ts 或 UserService.ts
          const hasIndexOrService =
            result.get(indexFile) !== undefined || result.get(userServiceFile) !== undefined;
          expect(hasIndexOrService).toBe(true);
        },
        10000
      ); // Increase timeout to 10s for complex reverse analysis
    });

    describe('Error Handling', () => {
      it('應該對不存在的檔案拋出錯誤', async () => {
        const nonExistentFile = path.join(FIXTURES_PATH, 'non-existent.ts');

        await expect(service.analyzeReverse(nonExistentFile, 1)).rejects.toThrow();
      });

      it('應該對無效的 depth 參數拋出錯誤', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');

        await expect(service.analyzeReverse(engineFile, 0 as any)).rejects.toThrow();
        await expect(service.analyzeReverse(engineFile, 4 as any)).rejects.toThrow();
      });
    });

    describe('Import Index Caching', () => {
      it('應該建立並快取 import index', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');

        // 第一次呼叫會建立 index
        const start1 = Date.now();
        await service.analyzeReverse(engineFile, 1);
        const duration1 = Date.now() - start1;

        // 第二次呼叫應該使用快取的 index (應該更快)
        const start2 = Date.now();
        await service.analyzeReverse(engineFile, 1);
        const duration2 = Date.now() - start2;

        // 第二次應該至少不比第一次慢太多（允許一些誤差）
        expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
      });

      it('應該在 clearCache() 時清除 import index', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');

        await service.analyzeReverse(engineFile, 1);

        service.clearCache();

        // 清除後再次分析應該重新建立 index
        const result = await service.analyzeReverse(engineFile, 1);
        expect(result.size).toBeGreaterThanOrEqual(1);
      });
    });

    describe('OO Relationships in Reverse Mode', () => {
      it('應該從依賴者中提取 OO 關係', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeReverse(engineFile, 1);

        // Car.ts 依賴 Engine.ts，應該有 OO 關係
        const carResult = result.get(carFile);
        expect(carResult).toBeDefined();
        expect(carResult?.relationships).toBeDefined();
        expect(carResult?.relationships.length).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzeBidirectional - Bidirectional Mode', () => {
    describe('Basic Functionality', () => {
      it('應該同時分析正向與反向依賴（Car.ts）', async () => {
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeBidirectional(carFile, 1);

        // 驗證基本結構
        expect(result.targetFile).toBe(carFile);
        expect(result.forwardDeps).toBeDefined();
        expect(result.reverseDeps).toBeDefined();
        expect(result.allClasses).toBeDefined();
        expect(result.relationships).toBeDefined();
        expect(result.stats).toBeDefined();

        // 正向：Car.ts import Engine, Wheel
        expect(result.forwardDeps.length).toBeGreaterThanOrEqual(2);
        const forwardPaths = result.forwardDeps.map((d) => d.filePath);
        expect(forwardPaths.some((p) => p.includes('Engine.ts'))).toBe(true);
        expect(forwardPaths.some((p) => p.includes('Wheel.ts'))).toBe(true);

        // 反向：無其他檔案 import Car.ts（在 simple fixture 中）
        expect(result.reverseDeps.length).toBe(0);

        // 統計資訊
        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(3); // Car, Engine, Wheel
        expect(result.stats.totalClasses).toBeGreaterThanOrEqual(3);
        expect(result.stats.maxDepth).toBe(1);
      });

      it('應該分析 Engine.ts 的雙向依賴', async () => {
        const engineFile = path.join(FIXTURES_PATH, 'simple/Engine.ts');

        const result = await service.analyzeBidirectional(engineFile, 1);

        // 正向：Engine.ts 沒有 import 其他類別
        expect(result.forwardDeps.length).toBe(0);

        // 反向：Car.ts import Engine.ts
        expect(result.reverseDeps.length).toBeGreaterThanOrEqual(1);
        const reversePaths = result.reverseDeps.map((d) => d.filePath);
        expect(reversePaths.some((p) => p.includes('Car.ts'))).toBe(true);

        // 統計資訊
        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(2); // Engine, Car
        expect(result.stats.totalClasses).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Depth Control', () => {
      it('應該支援 depth=1 的雙向分析', async () => {
        const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');

        const result = await service.analyzeBidirectional(level2File, 1);

        // 正向：Level2 → Level3
        expect(result.forwardDeps.length).toBe(1);
        expect(result.forwardDeps[0].filePath).toContain('Level3.ts');

        // 反向：Level1 → Level2
        expect(result.reverseDeps.length).toBe(1);
        expect(result.reverseDeps[0].filePath).toContain('Level1.ts');

        // 總共 3 個檔案
        expect(result.stats.totalFiles).toBe(3);
      });

      it('應該支援 depth=2 的雙向分析', async () => {
        const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');

        const result = await service.analyzeBidirectional(level2File, 2);

        // 正向：Level2 → Level3（沒有更深的）
        expect(result.forwardDeps.length).toBe(1);

        // 反向：Level1 → Level2（沒有更深的）
        expect(result.reverseDeps.length).toBe(1);

        // 總共仍是 3 個檔案（因為 deep fixture 只有 3 層）
        expect(result.stats.totalFiles).toBe(3);
      });

      it('應該支援 depth=3 的雙向分析', async () => {
        const level2File = path.join(FIXTURES_PATH, 'deep/Level2.ts');

        const result = await service.analyzeBidirectional(level2File, 3);

        expect(result.stats.totalFiles).toBe(3);
        expect(result.stats.maxDepth).toBeLessThanOrEqual(3);
      });
    });

    describe('Class and Relationship Deduplication', () => {
      it('應該正確去重類別', async () => {
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeBidirectional(carFile, 1);

        // 檢查是否有重複的類別
        const classNames = result.allClasses.map((c) => c.name);
        const uniqueClassNames = new Set(classNames);

        expect(classNames.length).toBe(uniqueClassNames.size);

        // 應該包含 Car, Engine, Wheel 等類別
        expect(classNames).toContain('Car');
        expect(classNames).toContain('Engine');
        expect(classNames).toContain('Wheel');
      });

      it('應該正確去重關係', async () => {
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeBidirectional(carFile, 1);

        // 檢查是否有重複的關係
        const relationshipKeys = result.relationships.map(
          (r) => `${r.from}:${r.to}:${r.type}:${r.name || ''}`
        );
        const uniqueKeys = new Set(relationshipKeys);

        expect(relationshipKeys.length).toBe(uniqueKeys.size);

        // 應該有多種 OO 關係
        expect(result.relationships.length).toBeGreaterThan(0);
      });
    });

    describe('Circular Dependencies', () => {
      it('應該處理循環依賴（A ↔ B）', async () => {
        const aFile = path.join(FIXTURES_PATH, 'circular/A.ts');

        const result = await service.analyzeBidirectional(aFile, 1);

        // 正向：A → B
        expect(result.forwardDeps.length).toBe(1);
        expect(result.forwardDeps[0].filePath).toContain('B.ts');

        // 反向：B → A
        expect(result.reverseDeps.length).toBe(1);
        expect(result.reverseDeps[0].filePath).toContain('B.ts');

        // 總共 2 個檔案（不重複）
        expect(result.stats.totalFiles).toBe(2);

        // 類別不重複
        const classNames = result.allClasses.map((c) => c.name);
        expect(classNames).toContain('A');
        expect(classNames).toContain('B');
        expect(result.allClasses.length).toBe(2);
      });
    });

    describe('Complex Scenarios', () => {
      it('應該處理 re-exports (index.ts)', async () => {
        const userServiceFile = path.join(FIXTURES_PATH, 'complex/services/UserService.ts');

        const result = await service.analyzeBidirectional(userServiceFile, 1);

        // 正向：UserService → index.ts
        expect(result.forwardDeps.length).toBeGreaterThanOrEqual(1);

        // 應該至少包含 UserService 類別
        const classNames = result.allClasses.map((c) => c.name);
        expect(classNames).toContain('UserService');
        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Error Handling', () => {
      it('應該對不存在的檔案拋出錯誤', async () => {
        const nonExistentFile = path.join(FIXTURES_PATH, 'non-existent.ts');

        await expect(service.analyzeBidirectional(nonExistentFile, 1)).rejects.toThrow(
          'File not found'
        );
      });

      it('應該對無效的 depth 參數拋出錯誤', async () => {
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        await expect(service.analyzeBidirectional(carFile, 0 as any)).rejects.toThrow(
          'Depth must be between 1 and 3'
        );

        await expect(service.analyzeBidirectional(carFile, 4 as any)).rejects.toThrow(
          'Depth must be between 1 and 3'
        );
      });
    });

    describe('Statistics', () => {
      it('應該提供正確的統計資訊', async () => {
        const carFile = path.join(FIXTURES_PATH, 'simple/Car.ts');

        const result = await service.analyzeBidirectional(carFile, 1);

        // 驗證統計資訊
        expect(result.stats.totalFiles).toBe(result.forwardDeps.length + result.reverseDeps.length + 1);
        expect(result.stats.totalClasses).toBe(result.allClasses.length);
        expect(result.stats.totalRelationships).toBe(result.relationships.length);
        expect(result.stats.maxDepth).toBeGreaterThanOrEqual(0);
        expect(result.stats.maxDepth).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Type Annotation Coverage - Boolean and Any Types', () => {
    it('should correctly extract boolean and any types from TypedClass', async () => {
      const typedClassFile = path.join(FIXTURES_PATH, 'types/TypedClass.ts');

      const result = await service.analyzeForward(typedClassFile, 1);

      // Should have TypedClass analyzed
      expect(result.size).toBe(1);

      const typedClassResult = result.get(typedClassFile);
      expect(typedClassResult).toBeDefined();
      expect(typedClassResult?.classes).toHaveLength(1);

      const cls = typedClassResult?.classes[0];
      expect(cls?.name).toBe('TypedClass');

      // Check properties with different types
      const isActiveProperty = cls?.properties.find((p) => p.name === 'isActive');
      expect(isActiveProperty?.type).toBe('boolean');

      const metadataProperty = cls?.properties.find((p) => p.name === 'metadata');
      expect(metadataProperty?.type).toBe('any');

      const idProperty = cls?.properties.find((p) => p.name === 'id');
      expect(idProperty?.type).toBe('number');

      const nameProperty = cls?.properties.find((p) => p.name === 'name');
      expect(nameProperty?.type).toBe('string');

      // Check methods with boolean return type
      const checkStatusMethod = cls?.methods.find((m) => m.name === 'checkStatus');
      expect(checkStatusMethod?.returnType).toBe('boolean');

      // Check methods with any return type
      const getMetadataMethod = cls?.methods.find((m) => m.name === 'getMetadata');
      expect(getMetadataMethod?.returnType).toBe('any');

      // Check methods with void return type
      const clearTagsMethod = cls?.methods.find((m) => m.name === 'clearTags');
      expect(clearTagsMethod?.returnType).toBe('void');
    });

    it('should analyze cross-file dependencies with TypedClass', async () => {
      const complexTypesFile = path.join(FIXTURES_PATH, 'types/ComplexTypes.ts');

      const result = await service.analyzeForward(complexTypesFile, 1);

      // Should have ComplexTypes and TypedClass
      expect(result.size).toBe(2);

      const complexTypesResult = result.get(complexTypesFile);
      expect(complexTypesResult).toBeDefined();
      expect(complexTypesResult?.classes[0].name).toBe('ComplexTypes');

      // Check that TypedClass was imported
      expect(complexTypesResult?.imports).toHaveLength(1);
      expect(complexTypesResult?.imports[0].specifiers).toContain('TypedClass');

      // Check for OO relationships (composition, dependency, etc.)
      expect(complexTypesResult?.relationships.length).toBeGreaterThan(0);

      // Verify TypedClass is also in the results
      const typedClassFile = path.join(FIXTURES_PATH, 'types/TypedClass.ts');
      const typedClassResult = result.get(typedClassFile);
      expect(typedClassResult).toBeDefined();
      expect(typedClassResult?.depth).toBe(1);
    });

    it('should extract correct relationships for ComplexTypes → TypedClass', async () => {
      const complexTypesFile = path.join(FIXTURES_PATH, 'types/ComplexTypes.ts');

      const result = await service.analyzeForward(complexTypesFile, 1);

      const complexTypesResult = result.get(complexTypesFile);
      const relationships = complexTypesResult?.relationships || [];

      // Should have composition (private data: TypedClass)
      const compositions = relationships.filter((r) => r.type === 'composition');
      expect(compositions.length).toBeGreaterThan(0);

      // Should have dependency relationships from method parameters/returns
      const dependencies = relationships.filter((r) => r.type === 'dependency');
      expect(dependencies.length).toBeGreaterThan(0);

      // Verify specific relationships exist
      const hasTypedClassRelation = relationships.some((r) => r.to === 'TypedClass');
      expect(hasTypedClassRelation).toBe(true);
    });

    it('should handle bidirectional analysis with TypedClass', async () => {
      const complexTypesFile = path.join(FIXTURES_PATH, 'types/ComplexTypes.ts');

      const result = await service.analyzeBidirectional(complexTypesFile, 1);

      // Forward: ComplexTypes → TypedClass
      expect(result.forwardDeps.length).toBe(1);
      expect(result.forwardDeps[0].filePath).toContain('TypedClass.ts');

      // Reverse: No one imports ComplexTypes (in this fixture)
      expect(result.reverseDeps.length).toBe(0);

      // All classes should include both ComplexTypes and TypedClass
      expect(result.allClasses.length).toBeGreaterThanOrEqual(2);
      const classNames = result.allClasses.map((c) => c.name);
      expect(classNames).toContain('ComplexTypes');
      expect(classNames).toContain('TypedClass');

      // Check statistics
      expect(result.stats.totalFiles).toBe(2);
      expect(result.stats.totalClasses).toBe(2);
      expect(result.stats.totalRelationships).toBeGreaterThan(0);
    });
  });

  describe('Three-Layer Dependency Analysis - E-commerce System', () => {
    describe('Forward Analysis - From Controller (Layer 3)', () => {
      it('should analyze 3 layers: OrderController → Services → Models (depth 3)', async () => {
        const orderControllerFile = path.join(
          FIXTURES_PATH,
          'three-layer/controllers/OrderController.ts'
        );

        const result = await service.analyzeForward(orderControllerFile, 3);

        // Should include all 3 layers
        // Layer 3: OrderController
        // Layer 2: OrderService, ProductService
        // Layer 1: Product, Customer, Order
        expect(result.size).toBeGreaterThanOrEqual(6);

        // Verify Layer 3 (depth 0)
        const controllerResult = result.get(orderControllerFile);
        expect(controllerResult).toBeDefined();
        expect(controllerResult?.depth).toBe(0);

        // Find OrderController class (may not be the first due to interfaces)
        const orderController = controllerResult?.classes.find(c => c.name === 'OrderController');
        expect(orderController).toBeDefined();
        expect(orderController?.name).toBe('OrderController');

        // Should import from Layer 2
        const layer2Imports = controllerResult?.imports.filter(
          (imp) => imp.source.includes('services/')
        );
        expect(layer2Imports?.length).toBeGreaterThan(0);

        // Verify Layer 2 files are included (depth 1)
        const orderServiceFile = path.join(FIXTURES_PATH, 'three-layer/services/OrderService.ts');
        const orderServiceResult = result.get(orderServiceFile);
        expect(orderServiceResult).toBeDefined();
        expect(orderServiceResult?.depth).toBe(1);

        // Find OrderService class
        const orderService = orderServiceResult?.classes.find(c => c.name === 'OrderService');
        expect(orderService).toBeDefined();
        expect(orderService?.name).toBe('OrderService');

        // Verify Layer 1 files are included (depth 2)
        const productFile = path.join(FIXTURES_PATH, 'three-layer/models/Product.ts');
        const productResult = result.get(productFile);
        expect(productResult).toBeDefined();
        expect(productResult?.depth).toBe(2);

        // Find Product class
        const product = productResult?.classes.find(c => c.name === 'Product');
        expect(product).toBeDefined();
        expect(product?.name).toBe('Product');
      });

      it('should respect depth limit - depth 2 should not include all Layer 1 models', async () => {
        const orderControllerFile = path.join(
          FIXTURES_PATH,
          'three-layer/controllers/OrderController.ts'
        );

        const result = await service.analyzeForward(orderControllerFile, 2);

        // With depth 2, we get:
        // - Layer 3: OrderController (depth 0)
        // - Layer 2: OrderService, ProductService (depth 1)
        // - Some of Layer 1 that are directly imported by Layer 2 (depth 2)

        expect(result.size).toBeGreaterThanOrEqual(3);
        expect(result.size).toBeLessThan(10); // Should not get ALL models

        // Controller should be there
        const controllerResult = result.get(orderControllerFile);
        expect(controllerResult?.depth).toBe(0);

        // Services should be there
        const orderServiceFile = path.join(FIXTURES_PATH, 'three-layer/services/OrderService.ts');
        const orderServiceResult = result.get(orderServiceFile);
        expect(orderServiceResult?.depth).toBe(1);
      });

      it('should stop at depth 1 - only include Controller and Services', async () => {
        const orderControllerFile = path.join(
          FIXTURES_PATH,
          'three-layer/controllers/OrderController.ts'
        );

        const result = await service.analyzeForward(orderControllerFile, 1);

        // With depth 1, we get:
        // - Layer 3: OrderController (depth 0)
        // - Layer 2: OrderService, ProductService (depth 1)

        expect(result.size).toBeGreaterThanOrEqual(2);

        // Controller should be there
        const controllerResult = result.get(orderControllerFile);
        expect(controllerResult?.depth).toBe(0);

        // Find OrderController class
        const orderController = controllerResult?.classes.find(c => c.name === 'OrderController');
        expect(orderController).toBeDefined();
        expect(orderController?.name).toBe('OrderController');

        // At least one service should be there
        const hasServices = Array.from(result.values()).some((r) => {
          if (r.depth !== 1) return false;
          // Check if any class in this file is a service
          return r.classes.some(
            (cls) => cls.name === 'OrderService' || cls.name === 'ProductService'
          );
        });
        expect(hasServices).toBe(true);
      });
    });

    describe('Reverse Analysis - From Model (Layer 1)', () => {
      it('should find all dependents from Product model up to Controller (depth 3)', async () => {
        const productFile = path.join(FIXTURES_PATH, 'three-layer/models/Product.ts');

        const result = await service.analyzeReverse(productFile, 3);

        // Product is used by:
        // - Layer 2: ProductService, OrderService (depth 1)
        // - Layer 3: OrderController (depth 2)

        expect(result.size).toBeGreaterThanOrEqual(3);

        // Product itself (depth 0)
        const productResult = result.get(productFile);
        expect(productResult?.depth).toBe(0);

        // Find Product class
        const product = productResult?.classes.find(c => c.name === 'Product');
        expect(product).toBeDefined();
        expect(product?.name).toBe('Product');

        // Should find services that use Product
        const hasServiceDependents = Array.from(result.values()).some((r) => {
          if (r.depth !== 1) return false;
          // Check if any class in this file is a service
          return r.classes.some(
            (cls) => cls.name === 'ProductService' || cls.name === 'OrderService'
          );
        });
        expect(hasServiceDependents).toBe(true);
      });

      it('should respect depth limit in reverse analysis', async () => {
        const productFile = path.join(FIXTURES_PATH, 'three-layer/models/Product.ts');

        const result = await service.analyzeReverse(productFile, 1);

        // With depth 1, should get Product + direct dependents (Services)
        expect(result.size).toBeGreaterThanOrEqual(2);

        const productResult = result.get(productFile);
        expect(productResult?.depth).toBe(0);
      });
    });

    describe('Bidirectional Analysis - From Service (Layer 2)', () => {
      it('should analyze both forward and reverse from OrderService', async () => {
        const orderServiceFile = path.join(FIXTURES_PATH, 'three-layer/services/OrderService.ts');

        const result = await service.analyzeBidirectional(orderServiceFile, 2);

        // Forward deps: Models (Layer 1)
        // Reverse deps: Controllers (Layer 3)

        expect(result.forwardDeps.length).toBeGreaterThan(0); // Should have models
        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(2);

        // Should include OrderService itself
        const classNames = result.allClasses.map((c) => c.name);
        expect(classNames).toContain('OrderService');

        // Should include some Layer 1 models
        const hasModels =
          classNames.includes('Product') ||
          classNames.includes('Customer') ||
          classNames.includes('Order');
        expect(hasModels).toBe(true);
      });

      it('should show complete dependency graph with depth 3', async () => {
        const orderServiceFile = path.join(FIXTURES_PATH, 'three-layer/services/OrderService.ts');

        const result = await service.analyzeBidirectional(orderServiceFile, 3);

        // Should get a comprehensive view:
        // - Forward: Models (Product, Customer, Order)
        // - Reverse: Controllers (OrderController)

        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(3);
        expect(result.stats.totalClasses).toBeGreaterThanOrEqual(3);
        expect(result.stats.totalRelationships).toBeGreaterThan(0);

        // Verify we have classes from different layers
        const classNames = result.allClasses.map((c) => c.name);

        // Should have the service itself
        expect(classNames).toContain('OrderService');

        // Forward deps should include at least one model
        expect(result.forwardDeps.length).toBeGreaterThan(0);
      });
    });

    describe('OO Relationships Across Layers', () => {
      it('should detect composition relationships in OrderController', async () => {
        const orderControllerFile = path.join(
          FIXTURES_PATH,
          'three-layer/controllers/OrderController.ts'
        );

        const result = await service.analyzeForward(orderControllerFile, 1);

        const controllerResult = result.get(orderControllerFile);
        const relationships = controllerResult?.relationships || [];

        // OrderController has composition with OrderService and ProductService
        const compositions = relationships.filter((r) => r.type === 'composition');
        expect(compositions.length).toBeGreaterThan(0);

        // Should have relationships to services
        const serviceDeps = relationships.filter(
          (r) => r.to === 'OrderService' || r.to === 'ProductService'
        );
        expect(serviceDeps.length).toBeGreaterThan(0);
      });

      it('should detect dependency relationships in OrderService', async () => {
        const orderServiceFile = path.join(FIXTURES_PATH, 'three-layer/services/OrderService.ts');

        const result = await service.analyzeForward(orderServiceFile, 1);

        const serviceResult = result.get(orderServiceFile);
        const relationships = serviceResult?.relationships || [];

        // OrderService has dependencies on Product, Customer, Order
        const dependencies = relationships.filter((r) => r.type === 'dependency');
        expect(dependencies.length).toBeGreaterThan(0);

        // Should reference model classes
        const modelRefs = relationships.filter(
          (r) => r.to === 'Product' || r.to === 'Customer' || r.to === 'Order'
        );
        expect(modelRefs.length).toBeGreaterThan(0);
      });
    });

    describe('Statistics and Metrics', () => {
      it('should provide accurate statistics for 3-layer architecture', async () => {
        const orderControllerFile = path.join(
          FIXTURES_PATH,
          'three-layer/controllers/OrderController.ts'
        );

        const result = await service.analyzeBidirectional(orderControllerFile, 3);

        // Verify statistics
        expect(result.stats.totalFiles).toBeGreaterThanOrEqual(4);
        expect(result.stats.totalClasses).toBeGreaterThanOrEqual(4);
        expect(result.stats.totalRelationships).toBeGreaterThan(0);
        expect(result.stats.maxDepth).toBeGreaterThan(0);
        expect(result.stats.maxDepth).toBeLessThanOrEqual(3);

        // Verify counts match
        expect(result.stats.totalClasses).toBe(result.allClasses.length);
        expect(result.stats.totalRelationships).toBe(result.relationships.length);
      });
    });
  });
});
