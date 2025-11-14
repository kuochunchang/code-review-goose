import fs from 'fs-extra';
import { parse } from '@babel/parser';
import traverseDefault from '@babel/traverse';
import * as t from '@babel/types';

// Handle CommonJS/ESM compatibility for @babel/traverse
const traverse =
  typeof traverseDefault === 'function' ? traverseDefault : (traverseDefault as any).default;
import { PathResolver } from './pathResolver.js';
import { OOAnalysisService } from './ooAnalysisService.js';
import { ImportIndexBuilder } from './importIndexBuilder.js';
import type {
  FileAnalysisResult,
  ClassInfo,
  PropertyInfo,
  MethodInfo,
  ParameterInfo,
  ImportIndex,
  BidirectionalAnalysisResult,
  DependencyInfo,
} from '../types/ast.js';

/**
 * CrossFileAnalysisService - 跨檔案依賴分析服務
 *
 * 功能：
 * - Forward mode: 追蹤檔案的正向依賴（該檔案 import 了哪些檔案）
 * - Reverse mode: 追蹤檔案的反向依賴（誰 import 了該檔案）
 * - 支援多層深度追蹤（depth 1-3）
 * - 循環依賴偵測
 * - AST 快取（基於檔案 mtime）
 * - Import index 快取（用於 reverse mode）
 */
export class CrossFileAnalysisService {
  private readonly projectPath: string;
  private readonly pathResolver: PathResolver;
  private readonly ooAnalysisService: OOAnalysisService;

  // AST 快取：filePath → { ast, mtime, analysis }
  private astCache: Map<
    string,
    {
      ast: any;
      mtime: number;
      analysis: FileAnalysisResult;
    }
  >;

  // Import index 快取（用於 reverse mode）
  private importIndexCache: { index: ImportIndex; timestamp: number } | null = null;
  private readonly INDEX_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (increased from 5)

  // 已訪問的檔案（用於避免循環依賴）
  private visited: Set<string>;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.pathResolver = new PathResolver(projectPath);
    this.ooAnalysisService = new OOAnalysisService();
    this.astCache = new Map();
    this.visited = new Set();
  }

  /**
   * 分析正向依賴（Forward mode）
   *
   * @param filePath - 要分析的檔案路徑
   * @param maxDepth - 最大追蹤深度（1-3）
   * @returns Map<filePath, FileAnalysisResult> - 所有分析過的檔案
   */
  async analyzeForward(
    filePath: string,
    maxDepth: 1 | 2 | 3
  ): Promise<Map<string, FileAnalysisResult>> {
    // 驗證深度參數
    if (maxDepth < 1 || maxDepth > 3) {
      throw new Error('Depth must be between 1 and 3');
    }

    // 驗證檔案存在
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    // 重置訪問記錄
    this.visited.clear();

    // 建立結果 Map
    const results = new Map<string, FileAnalysisResult>();

    // 遞迴分析
    await this.analyzeFileRecursive(filePath, 0, maxDepth, results);

    return results;
  }

  /**
   * 分析反向依賴（Reverse mode）
   *
   * @param filePath - 要分析的檔案路徑
   * @param maxDepth - 最大追蹤深度（1-3）
   * @returns Map<filePath, FileAnalysisResult> - 所有分析過的檔案
   */
  async analyzeReverse(
    filePath: string,
    maxDepth: 1 | 2 | 3
  ): Promise<Map<string, FileAnalysisResult>> {
    // 驗證深度參數
    if (maxDepth < 1 || maxDepth > 3) {
      throw new Error('Depth must be between 1 and 3');
    }

    // 驗證檔案存在
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    // 重置訪問記錄
    this.visited.clear();

    // 建立結果 Map
    const results = new Map<string, FileAnalysisResult>();

    // 首先分析目標檔案本身（depth 0）
    const targetAnalysis = await this.analyzeFile(filePath, 0);
    results.set(filePath, targetAnalysis);
    this.visited.add(filePath);

    // 取得或建立 import index
    const importIndex = await this.getOrBuildImportIndex();

    // 使用 BFS 追蹤反向依賴
    await this.analyzeReverseDependencies(filePath, maxDepth, importIndex, results);

    return results;
  }

  /**
   * 分析雙向依賴（Bidirectional mode）
   *
   * 結合 Forward 與 Reverse 分析，提供完整的依賴關係視圖
   *
   * @param filePath - 要分析的檔案路徑
   * @param maxDepth - 最大追蹤深度（1-3）
   * @returns BidirectionalAnalysisResult - 包含正向、反向依賴與統計資訊
   */
  async analyzeBidirectional(
    filePath: string,
    maxDepth: 1 | 2 | 3
  ): Promise<BidirectionalAnalysisResult> {
    // 驗證深度參數
    if (maxDepth < 1 || maxDepth > 3) {
      throw new Error('Depth must be between 1 and 3');
    }

    // 驗證檔案存在
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    // 1. 執行正向分析
    const forwardResults = await this.analyzeForward(filePath, maxDepth);

    // 2. 執行反向分析
    const reverseResults = await this.analyzeReverse(filePath, maxDepth);

    // 3. 合併結果
    const allResults = new Map<string, FileAnalysisResult>();

    // 加入正向依賴（排除目標檔案）
    const forwardDeps: FileAnalysisResult[] = [];
    for (const [path, result] of forwardResults.entries()) {
      if (path !== filePath) {
        forwardDeps.push(result);
      }
      allResults.set(path, result);
    }

    // 加入反向依賴（排除目標檔案和已存在的）
    const reverseDeps: FileAnalysisResult[] = [];
    for (const [path, result] of reverseResults.entries()) {
      if (path !== filePath) {
        reverseDeps.push(result);
      }
      if (!allResults.has(path)) {
        allResults.set(path, result);
      }
    }

    // 4. 提取所有類別（去重）
    const allClasses: ClassInfo[] = [];
    const classSet = new Set<string>(); // 用於去重（filePath:className）

    for (const result of allResults.values()) {
      for (const cls of result.classes) {
        const key = `${result.filePath}:${cls.name}`;
        if (!classSet.has(key)) {
          classSet.add(key);
          allClasses.push(cls);
        }
      }
    }

    // 5. 提取所有關係（去重）
    const allRelationships: DependencyInfo[] = [];
    const relationshipSet = new Set<string>(); // 用於去重

    for (const result of allResults.values()) {
      for (const rel of result.relationships) {
        // 建立唯一鍵：from:to:type:context
        const key = `${rel.from}:${rel.to}:${rel.type}:${rel.context || ''}`;
        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          allRelationships.push(rel);
        }
      }
    }

    // 6. 計算統計資訊
    const maxDepthFound = Math.max(...Array.from(allResults.values()).map((r) => r.depth));

    return {
      targetFile: filePath,
      forwardDeps,
      reverseDeps,
      allClasses,
      relationships: allRelationships,
      stats: {
        totalFiles: allResults.size,
        totalClasses: allClasses.length,
        totalRelationships: allRelationships.length,
        maxDepth: maxDepthFound,
      },
    };
  }

  /**
   * 取得或建立 import index（帶快取）
   */
  private async getOrBuildImportIndex(): Promise<ImportIndex> {
    const now = Date.now();

    // 檢查快取是否有效
    if (this.importIndexCache && now - this.importIndexCache.timestamp < this.INDEX_CACHE_TTL) {
      console.log('[Import Index] Using cached index');
      return this.importIndexCache.index;
    }

    // 建立新的 import index
    console.log('[Import Index] Building new index...');
    const builder = new ImportIndexBuilder(this.projectPath);
    const index = await builder.buildIndex((current, _total, message) => {
      console.log(`[Import Index] Progress: ${current}% - ${message}`);
    });
    console.log(`[Import Index] Index built: ${index.fileCount} files indexed`);

    // 快取結果
    this.importIndexCache = {
      index,
      timestamp: now,
    };

    return index;
  }

  /**
   * 使用 BFS 分析反向依賴
   */
  private async analyzeReverseDependencies(
    targetFile: string,
    maxDepth: number,
    importIndex: ImportIndex,
    results: Map<string, FileAnalysisResult>
  ): Promise<void> {
    // BFS 佇列：[filePath, currentDepth]
    const queue: Array<[string, number]> = [[targetFile, 0]];

    while (queue.length > 0) {
      const [currentFile, currentDepth] = queue.shift()!;

      // 達到最大深度，停止
      if (currentDepth >= maxDepth) {
        continue;
      }

      // 找出誰 import 了 currentFile
      const importers = importIndex.importToFiles.get(currentFile) || [];

      for (const importer of importers) {
        // 跳過已訪問的檔案
        if (this.visited.has(importer)) {
          continue;
        }

        this.visited.add(importer);

        // 分析 importer 檔案
        const importerAnalysis = await this.analyzeFile(importer, currentDepth + 1);
        results.set(importer, importerAnalysis);

        // 加入佇列以繼續追蹤
        queue.push([importer, currentDepth + 1]);
      }
    }
  }

  /**
   * 遞迴分析檔案及其依賴
   */
  private async analyzeFileRecursive(
    filePath: string,
    currentDepth: number,
    maxDepth: number,
    results: Map<string, FileAnalysisResult>
  ): Promise<void> {
    // 檢查是否已訪問（避免循環依賴）
    if (this.visited.has(filePath)) {
      return;
    }

    // 標記為已訪問
    this.visited.add(filePath);

    // 分析當前檔案
    const analysis = await this.analyzeFile(filePath, currentDepth);

    // 儲存結果
    results.set(filePath, analysis);

    // 如果達到最大深度，停止遞迴
    if (currentDepth >= maxDepth) {
      return;
    }

    // 遞迴分析所有 import 的檔案
    for (const importInfo of analysis.imports) {
      const resolvedPath = await this.pathResolver.resolveImportPath(filePath, importInfo.source);

      if (resolvedPath) {
        await this.analyzeFileRecursive(resolvedPath, currentDepth + 1, maxDepth, results);
      }
    }
  }

  /**
   * 分析單一檔案
   */
  private async analyzeFile(filePath: string, depth: number): Promise<FileAnalysisResult> {
    // 檢查快取
    const cached = await this.getCachedAnalysis(filePath);
    if (cached) {
      return { ...cached, depth }; // 更新 depth
    }

    // 讀取檔案內容
    const code = await fs.readFile(filePath, 'utf-8');

    // 解析 AST
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
    });

    // 提取 imports
    const imports = this.ooAnalysisService.extractImports(ast);

    // 提取 exports
    const exports = this.ooAnalysisService.extractExports(ast);

    // 提取 classes（使用 traverse）
    const classes: ClassInfo[] = [];
    traverse(ast, {
      ClassDeclaration: (path: any) => {
        const node = path.node;
        const classInfo = this.extractClassInfo(node);
        if (classInfo) {
          classes.push(classInfo);
        }
      },
      TSInterfaceDeclaration: (path: any) => {
        const node = path.node;
        const interfaceInfo = this.extractInterfaceInfo(node);
        if (interfaceInfo) {
          classes.push(interfaceInfo);
        }
      },
    });

    // 分析 OO 關係
    const ooAnalysis = this.ooAnalysisService.analyze(classes, imports);

    // 建立分析結果
    const analysis: FileAnalysisResult = {
      filePath,
      classes,
      imports,
      exports,
      depth,
      relationships: ooAnalysis.relationships,
    };

    // 快取結果
    await this.cacheAnalysis(filePath, ast, analysis);

    return analysis;
  }

  /**
   * 從快取中取得分析結果
   */
  private async getCachedAnalysis(filePath: string): Promise<FileAnalysisResult | null> {
    const cached = this.astCache.get(filePath);
    if (!cached) {
      return null;
    }

    // 檢查檔案是否被修改
    const stats = await fs.stat(filePath);
    if (stats.mtimeMs !== cached.mtime) {
      // 檔案已修改，移除快取
      this.astCache.delete(filePath);
      return null;
    }

    return cached.analysis;
  }

  /**
   * 快取分析結果
   */
  private async cacheAnalysis(
    filePath: string,
    ast: any,
    analysis: FileAnalysisResult
  ): Promise<void> {
    const stats = await fs.stat(filePath);

    this.astCache.set(filePath, {
      ast,
      mtime: stats.mtimeMs,
      analysis,
    });
  }

  /**
   * 取得所有已分析的檔案列表
   */
  getAnalyzedFiles(): string[] {
    return Array.from(this.astCache.keys());
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.astCache.clear();
    this.visited.clear();
    this.importIndexCache = null; // 清除 import index 快取
  }

  /**
   * 從 AST 節點提取類別資訊
   */
  private extractClassInfo(node: t.ClassDeclaration): ClassInfo | null {
    if (!node.id) {
      return null;
    }

    const className = node.id.name;
    const properties: PropertyInfo[] = [];
    const methods: MethodInfo[] = [];
    let constructorParams: ParameterInfo[] = [];

    // 提取 superClass (extends)
    const extendsClass =
      node.superClass && t.isIdentifier(node.superClass) ? node.superClass.name : undefined;

    // 提取 implements
    const implementsInterfaces: string[] = [];
    if (node.implements) {
      node.implements.forEach((impl: any) => {
        if (t.isTSExpressionWithTypeArguments(impl) && t.isIdentifier(impl.expression)) {
          implementsInterfaces.push(impl.expression.name);
        }
      });
    }

    // 提取 properties 和 methods
    node.body.body.forEach((member: any) => {
      if (t.isClassProperty(member) && t.isIdentifier(member.key)) {
        const propInfo = this.extractPropertyInfo(member);
        if (propInfo) {
          properties.push(propInfo);
        }
      } else if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        if (member.kind === 'constructor') {
          // 提取建構子參數
          constructorParams = member.params.map((param: any) => this.extractParameterInfo(param));
        } else {
          const methodInfo = this.extractMethodInfo(member);
          if (methodInfo) {
            methods.push(methodInfo);
          }
        }
      }
    });

    return {
      name: className,
      type: 'class',
      properties,
      methods,
      extends: extendsClass,
      implements: implementsInterfaces.length > 0 ? implementsInterfaces : undefined,
      isAbstract: node.abstract ?? undefined,
      constructorParams: constructorParams.length > 0 ? constructorParams : undefined,
    };
  }

  /**
   * 從 AST 節點提取介面資訊
   */
  private extractInterfaceInfo(node: t.TSInterfaceDeclaration): ClassInfo | null {
    const interfaceName = node.id.name;
    const properties: PropertyInfo[] = [];
    const methods: MethodInfo[] = [];

    // 提取 extends
    const extendsInterfaces: string[] = [];
    if (node.extends) {
      node.extends.forEach((ext: any) => {
        if (t.isIdentifier(ext.expression)) {
          extendsInterfaces.push(ext.expression.name);
        }
      });
    }

    // 提取 properties 和 methods
    node.body.body.forEach((member: any) => {
      if (t.isTSPropertySignature(member) && t.isIdentifier(member.key)) {
        const propInfo = this.extractPropertySignatureInfo(member);
        if (propInfo) {
          properties.push(propInfo);
        }
      } else if (t.isTSMethodSignature(member) && t.isIdentifier(member.key)) {
        const methodInfo = this.extractMethodSignatureInfo(member);
        if (methodInfo) {
          methods.push(methodInfo);
        }
      }
    });

    return {
      name: interfaceName,
      type: 'interface',
      properties,
      methods,
      implements: extendsInterfaces.length > 0 ? extendsInterfaces : undefined,
    };
  }

  /**
   * 提取屬性資訊
   */
  private extractPropertyInfo(member: any): PropertyInfo | null {
    if (!t.isIdentifier(member.key)) {
      return null;
    }

    const name = member.key.name;
    const visibility = this.getVisibility(member);
    const type = member.typeAnnotation
      ? this.getTypeString(member.typeAnnotation.typeAnnotation)
      : undefined;

    return {
      name,
      type,
      visibility,
      isStatic: member.static,
      isReadonly: member.readonly,
    };
  }

  /**
   * 提取屬性簽章資訊（介面）
   */
  private extractPropertySignatureInfo(member: any): PropertyInfo | null {
    if (!t.isIdentifier(member.key)) {
      return null;
    }

    const name = member.key.name;
    const type = member.typeAnnotation
      ? this.getTypeString(member.typeAnnotation.typeAnnotation)
      : undefined;

    return {
      name,
      type,
      visibility: 'public',
      isOptional: member.optional,
    };
  }

  /**
   * 提取方法資訊
   */
  private extractMethodInfo(member: any): MethodInfo | null {
    if (!t.isIdentifier(member.key)) {
      return null;
    }

    const name = member.key.name;
    const visibility = this.getVisibility(member);
    const parameters = member.params.map((param: any) => this.extractParameterInfo(param));
    const returnType = member.returnType
      ? this.getTypeString(member.returnType.typeAnnotation)
      : undefined;

    return {
      name,
      parameters,
      returnType,
      visibility,
      isStatic: member.static,
      isAbstract: member.abstract,
      isAsync: member.async,
    };
  }

  /**
   * 提取方法簽章資訊（介面）
   */
  private extractMethodSignatureInfo(member: any): MethodInfo | null {
    if (!t.isIdentifier(member.key)) {
      return null;
    }

    const name = member.key.name;
    const parameters = member.parameters.map((param: any) => this.extractParameterInfo(param));
    const returnType = member.typeAnnotation
      ? this.getTypeString(member.typeAnnotation.typeAnnotation)
      : undefined;

    return {
      name,
      parameters,
      returnType,
      visibility: 'public',
    };
  }

  /**
   * 提取參數資訊
   */
  private extractParameterInfo(param: any): ParameterInfo {
    let name = 'unknown';
    let type: string | undefined;
    let isOptional = false;

    if (t.isIdentifier(param)) {
      name = param.name;
      type =
        param.typeAnnotation && 'typeAnnotation' in param.typeAnnotation
          ? this.getTypeString((param.typeAnnotation as any).typeAnnotation)
          : undefined;
      isOptional = param.optional ?? false;
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      name = param.left.name;
      type =
        param.left.typeAnnotation && 'typeAnnotation' in param.left.typeAnnotation
          ? this.getTypeString((param.left.typeAnnotation as any).typeAnnotation)
          : undefined;
      isOptional = true;
    }

    return {
      name,
      type,
      isOptional,
    };
  }

  /**
   * 取得可見性修飾符
   */
  private getVisibility(member: any): 'public' | 'private' | 'protected' {
    if (member.accessibility) {
      return member.accessibility as 'public' | 'private' | 'protected';
    }
    return 'public';
  }

  /**
   * 取得型別字串
   */
  private getTypeString(typeAnnotation: any): string {
    if (t.isTSStringKeyword(typeAnnotation)) {
      return 'string';
    }
    if (t.isTSNumberKeyword(typeAnnotation)) {
      return 'number';
    }
    if (t.isTSBooleanKeyword(typeAnnotation)) {
      return 'boolean';
    }
    if (t.isTSVoidKeyword(typeAnnotation)) {
      return 'void';
    }
    if (t.isTSAnyKeyword(typeAnnotation)) {
      return 'any';
    }
    if (t.isTSTypeReference(typeAnnotation) && t.isIdentifier(typeAnnotation.typeName)) {
      return typeAnnotation.typeName.name;
    }
    if (t.isTSArrayType(typeAnnotation)) {
      return this.getTypeString(typeAnnotation.elementType) + '[]';
    }
    return 'unknown';
  }
}
