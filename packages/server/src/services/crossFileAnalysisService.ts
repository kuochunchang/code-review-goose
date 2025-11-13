import * as fs from 'fs-extra';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { PathResolver } from './pathResolver';
import { OOAnalysisService } from './ooAnalysisService';
import type {
  FileAnalysisResult,
  ClassInfo,
  ImportInfo,
  DependencyInfo,
  PropertyInfo,
  MethodInfo,
  ParameterInfo,
} from '../types/ast';

/**
 * CrossFileAnalysisService - 跨檔案依賴分析服務
 *
 * 功能：
 * - Forward mode: 追蹤檔案的正向依賴（該檔案 import 了哪些檔案）
 * - 支援多層深度追蹤（depth 1-3）
 * - 循環依賴偵測
 * - AST 快取（基於檔案 mtime）
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
  async analyzeForward(filePath: string, maxDepth: 1 | 2 | 3): Promise<Map<string, FileAnalysisResult>> {
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
  private async cacheAnalysis(filePath: string, ast: any, analysis: FileAnalysisResult): Promise<void> {
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
    const extendsClass = node.superClass && t.isIdentifier(node.superClass) ? node.superClass.name : undefined;

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
      isAbstract: node.abstract,
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
    const type = member.typeAnnotation ? this.getTypeString(member.typeAnnotation.typeAnnotation) : undefined;

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
    const type = member.typeAnnotation ? this.getTypeString(member.typeAnnotation.typeAnnotation) : undefined;

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
    const returnType = member.returnType ? this.getTypeString(member.returnType.typeAnnotation) : undefined;

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
    const returnType = member.typeAnnotation ? this.getTypeString(member.typeAnnotation.typeAnnotation) : undefined;

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
      type = param.typeAnnotation ? this.getTypeString(param.typeAnnotation.typeAnnotation) : undefined;
      isOptional = param.optional;
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      name = param.left.name;
      type = param.left.typeAnnotation ? this.getTypeString(param.left.typeAnnotation.typeAnnotation) : undefined;
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
