import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs-extra';
import path from 'path';
import type {
  DependencyInfo as ASTDependencyInfo,
  BidirectionalAnalysisResult,
  FileAnalysisResult,
  ImportInfo,
} from '../types/ast.js';
import type { ProjectConfig } from '../types/config.js';
import type { AIService } from './aiService.js';
import { CrossFileAnalysisService } from './crossFileAnalysisService.js';
import { OOAnalysisService } from './ooAnalysisService.js';
import { SequenceAnalysisService } from './sequenceAnalysisService.js';
import { MermaidValidator } from './uml/mermaidValidator.js';

// Correct way to import @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

// UML diagram type (native mode only)
export type DiagramType = 'class' | 'flowchart' | 'sequence';

// UML generation mode (only native is supported)
export type DiagramGenerationMode = 'native';

// Class information
export interface ClassInfo {
  name: string;
  type: 'class' | 'interface';
  properties: PropertyInfo[];
  methods: MethodInfo[];
  extends?: string;
  implements?: string[];
  lineNumber?: number;
  constructorParams?: ParameterInfo[];
}

// Property information
export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
  lineNumber?: number;
  isArray?: boolean;
  isClassType?: boolean;
}

// Method information
export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  visibility: 'public' | 'private' | 'protected';
  lineNumber?: number;
}

// Parameter information
export interface ParameterInfo {
  name: string;
  type?: string;
}

// Flowchart node
export interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'process' | 'decision' | 'loop';
  label: string;
  next?: string[];
}

// UML generation result
export interface UMLResult {
  type: DiagramType;
  mermaidCode: string;
  generationMode: DiagramGenerationMode;
  metadata?: {
    classes?: ClassInfo[];
    functions?: string[];
    dependencies?: DependencyInfo[] | ASTDependencyInfo[];
    sequences?: SequenceInfo[];
    imports?: ImportInfo[];
    fallbackReason?: string;
    autoFixed?: boolean;
    [key: string]: any;
  };
}

// Dependency information
export interface DependencyInfo {
  from: string;
  to: string;
  type: 'import' | 'composition' | 'aggregation' | 'usage';
}

// Sequence diagram information
export interface SequenceInfo {
  participant: string;
  interactions: InteractionInfo[];
}

export interface InteractionInfo {
  from: string;
  to: string;
  message: string;
  type: 'sync' | 'async' | 'return';
}

export class UMLService {
  private validator: MermaidValidator;

  constructor() {
    this.validator = new MermaidValidator();
  }

  /**
   * Generate UML diagram (native mode only)
   */
  async generateDiagram(code: string, type: DiagramType): Promise<UMLResult> {
    try {
      return await this.generateWithNative(code, type);
    } catch (error) {
      throw new Error(`Failed to generate ${type} diagram: ${(error as Error).message}`);
    }
  }

  /**
   * Generate UML diagram with unified interface for both single-file and cross-file analysis
   *
   * @param filePath - Target file path to analyze (relative to project root)
   * @param projectPath - Project root path
   * @param type - Diagram type: 'class', 'flowchart', 'sequence', or 'dependency'
   * @param options - Generation options
   * @param options.depth - Analysis depth: 0 = single file only, 1-3 = cross-file analysis (default: 0)
   * @param options.mode - Analysis mode for cross-file: 'bidirectional', 'forward', or 'reverse' (default: 'bidirectional')
   * @param options.aiMode - AI generation mode override (uses config if not specified)
   * @returns UML diagram with consistent metadata structure
   */
  async generateUnifiedDiagram(
    filePath: string,
    projectPath: string,
    type: DiagramType,
    options?: {
      depth?: number;
      mode?: 'bidirectional' | 'forward' | 'reverse';
      aiMode?: DiagramGenerationMode;
    }
  ): Promise<UMLResult> {
    const depth = options?.depth ?? 0;
    const mode = options?.mode ?? 'bidirectional';

    try {
      // Validate depth parameter
      if (depth < 0 || depth > 3) {
        throw new Error('Depth must be between 0 (single file) and 3 (cross-file)');
      }

      // For class diagrams, support both single-file and cross-file analysis
      if (type === 'class') {
        if (depth === 0) {
          // Single-file class diagram
          return await this.generateSingleFileClassDiagram(filePath, projectPath);
        } else {
          // Cross-file class diagram
          return await this.generateCrossFileClassDiagram(
            filePath,
            projectPath,
            depth as 1 | 2 | 3,
            mode
          );
        }
      }

      // For other diagram types, currently only support single-file (depth = 0)
      if (depth > 0) {
        throw new Error(
          `Cross-file analysis (depth > 0) is only supported for class diagrams. Type '${type}' only supports depth=0`
        );
      }

      // Single-file analysis for flowchart, sequence, dependency
      return await this.generateSingleFileDiagram(filePath, projectPath, type);
    } catch (error) {
      throw new Error(
        `Failed to generate ${type} diagram (depth=${depth}): ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate single-file class diagram from file path
   */
  private async generateSingleFileClassDiagram(
    filePath: string,
    projectPath: string
  ): Promise<UMLResult> {
    // Read file content
    const fullPath = path.join(projectPath, filePath);
    const code = await fs.readFile(fullPath, 'utf-8');

    // Use existing generateDiagram for single-file class diagram
    const result = await this.generateDiagram(code, 'class');

    // Add depth metadata
    return {
      ...result,
      metadata: {
        ...result.metadata,
        depth: 0,
        singleFile: true,
        filePath,
      },
    };
  }

  /**
   * Generate single-file diagram (flowchart, sequence, dependency) from file path
   */
  private async generateSingleFileDiagram(
    filePath: string,
    projectPath: string,
    type: DiagramType
  ): Promise<UMLResult> {
    // Read file content
    const fullPath = path.join(projectPath, filePath);
    const code = await fs.readFile(fullPath, 'utf-8');

    // Use existing generateDiagram for single-file analysis
    const result = await this.generateDiagram(code, type);

    // Add depth metadata
    return {
      ...result,
      metadata: {
        ...result.metadata,
        depth: 0,
        singleFile: true,
        filePath,
      },
    };
  }

  /**
   * Generate cross-file class diagram with specified analysis mode
   *
   * @param filePath - Target file path to analyze
   * @param projectPath - Project root path
   * @param depth - Maximum traversal depth (1-3)
   * @param mode - Analysis mode: 'forward', 'reverse', or 'bidirectional'
   * @returns UML class diagram with cross-file relationships
   */
  async generateCrossFileClassDiagram(
    filePath: string,
    projectPath: string,
    depth: 1 | 2 | 3 = 1,
    mode: 'forward' | 'reverse' | 'bidirectional' = 'bidirectional'
  ): Promise<UMLResult> {
    try {
      // Initialize cross-file analysis service
      const crossFileService = new CrossFileAnalysisService(projectPath);

      // Use specified analysis mode
      let result;
      switch (mode) {
        case 'forward': {
          const forwardResults = await crossFileService.analyzeForward(filePath, depth);
          result = this.convertForwardResultsToBidirectional(filePath, forwardResults);
          break;
        }
        case 'reverse': {
          const reverseResults = await crossFileService.analyzeReverse(filePath, depth);
          result = this.convertReverseResultsToBidirectional(filePath, reverseResults);
          break;
        }
        case 'bidirectional':
        default:
          result = await crossFileService.analyzeBidirectional(filePath, depth);
          break;
      }

      // Generate Mermaid diagram
      const mermaidCode = this.generateCrossFileMermaidDiagram(result);

      // Validate
      const validation = await this.validator.validate(mermaidCode);
      if (!validation.valid) {
        console.warn('Cross-file class diagram validation warnings:', validation.errors);
      }

      return {
        type: 'class',
        mermaidCode: mermaidCode,
        generationMode: 'native',
        metadata: {
          depth,
          mode,
          singleFile: false,
          filePath,
          analysis: {
            targetFile: result.targetFile,
            totalFiles: result.stats.totalFiles,
            totalClasses: result.stats.totalClasses,
            totalRelationships: result.stats.totalRelationships,
            forwardDeps: result.forwardDeps.length,
            reverseDeps: result.reverseDeps.length,
          },
          validation,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to generate cross-file class diagram: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate Mermaid class diagram from bidirectional analysis result
   */
  private generateCrossFileMermaidDiagram(result: BidirectionalAnalysisResult): string {
    let diagram = 'classDiagram\n';

    // Add note about analysis scope
    diagram += `  note "Analysis: ${result.stats.totalFiles} files, ${result.stats.totalClasses} classes, ${result.stats.totalRelationships} relationships"\n\n`;

    // Create a set of class names that exist in the diagram
    const classNames = new Set(result.allClasses.map((cls) => cls.name));

    // Add all classes
    for (const cls of result.allClasses) {
      diagram += `  class ${cls.name} {\n`;

      // Add properties
      for (const prop of cls.properties) {
        const visibility = prop.visibility === 'private' ? '-' : prop.visibility === 'protected' ? '#' : '+';
        diagram += `    ${visibility}${prop.type} ${prop.name}\n`;
      }

      // Add methods
      for (const method of cls.methods) {
        const visibility = method.visibility === 'private' ? '-' : method.visibility === 'protected' ? '#' : '+';
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
        diagram += `    ${visibility}${method.name}(${params}): ${method.returnType}\n`;
      }

      diagram += `  }\n\n`;
    }

    // Add relationships - only include relationships where both ends exist in the diagram
    for (const rel of result.relationships) {
      // Skip relationships that reference classes not included in this depth
      if (!classNames.has(rel.from) || !classNames.has(rel.to)) {
        continue;
      }

      const symbol = this.getRelationshipSymbol(rel.type);
      const cardinality = rel.cardinality ? `"${rel.cardinality}"` : '';
      const label = rel.context ? `: ${rel.context}` : '';

      diagram += `  ${rel.from} ${symbol} ${cardinality} ${rel.to}${label}\n`;
    }

    return diagram;
  }

  /**
   * Convert forward analysis results to bidirectional format
   */
  private convertForwardResultsToBidirectional(
    targetFile: string,
    forwardResults: Map<string, FileAnalysisResult>
  ): BidirectionalAnalysisResult {
    const forwardDeps: FileAnalysisResult[] = [];
    const allClasses: ClassInfo[] = [];
    const allRelationships: ASTDependencyInfo[] = [];
    const classSet = new Set<string>();
    const relationshipSet = new Set<string>();

    for (const [path, result] of forwardResults.entries()) {
      if (path !== targetFile) {
        forwardDeps.push(result);
      }

      for (const cls of result.classes) {
        const key = `${result.filePath}:${cls.name}`;
        if (!classSet.has(key)) {
          classSet.add(key);
          allClasses.push(cls);
        }
      }

      for (const rel of result.relationships) {
        const key = `${rel.from}:${rel.to}:${rel.type}:${rel.context || ''}`;
        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          allRelationships.push(rel);
        }
      }
    }

    const maxDepth = Math.max(...Array.from(forwardResults.values()).map((r) => r.depth));

    return {
      targetFile,
      forwardDeps,
      reverseDeps: [],
      allClasses,
      relationships: allRelationships,
      stats: {
        totalFiles: forwardResults.size,
        totalClasses: allClasses.length,
        totalRelationships: allRelationships.length,
        maxDepth,
      },
    };
  }

  /**
   * Convert reverse analysis results to bidirectional format
   */
  private convertReverseResultsToBidirectional(
    targetFile: string,
    reverseResults: Map<string, FileAnalysisResult>
  ): BidirectionalAnalysisResult {
    const reverseDeps: FileAnalysisResult[] = [];
    const allClasses: ClassInfo[] = [];
    const allRelationships: ASTDependencyInfo[] = [];
    const classSet = new Set<string>();
    const relationshipSet = new Set<string>();

    for (const [path, result] of reverseResults.entries()) {
      if (path !== targetFile) {
        reverseDeps.push(result);
      }

      for (const cls of result.classes) {
        const key = `${result.filePath}:${cls.name}`;
        if (!classSet.has(key)) {
          classSet.add(key);
          allClasses.push(cls);
        }
      }

      for (const rel of result.relationships) {
        const key = `${rel.from}:${rel.to}:${rel.type}:${rel.context || ''}`;
        if (!relationshipSet.has(key)) {
          relationshipSet.add(key);
          allRelationships.push(rel);
        }
      }
    }

    const maxDepth = Math.max(...Array.from(reverseResults.values()).map((r) => r.depth));

    return {
      targetFile,
      forwardDeps: [],
      reverseDeps,
      allClasses,
      relationships: allRelationships,
      stats: {
        totalFiles: reverseResults.size,
        totalClasses: allClasses.length,
        totalRelationships: allRelationships.length,
        maxDepth,
      },
    };
  }

  /**
   * Get Mermaid relationship symbol
   */
  private getRelationshipSymbol(type: string): string {
    switch (type) {
      case 'inheritance':
        return '<|--';
      case 'realization':
        return '<|..';
      case 'composition':
        return '*--';
      case 'aggregation':
        return 'o--';
      case 'association':
        return '-->';
      case 'dependency':
        return '..>';
      case 'injection':
        return '..>';
      default:
        return '-->';
    }
  }

  /**
   * Generate diagram using native AST parsing
   */
  private async generateWithNative(code: string, type: DiagramType): Promise<UMLResult> {
    // Parse code to AST
    const ast = this.parseCode(code);

    if (type === 'class') {
      return this.generateClassDiagram(ast, code);
    } else if (type === 'flowchart') {
      return this.generateFlowchart(ast, code);
    } else if (type === 'sequence') {
      return this.generateSequenceDiagram(ast, code);
    }

    throw new Error(`Unsupported diagram type: ${type}`);
  }

  /**
   * Parse code to AST
   */
  private parseCode(code: string): t.File {
    try {
      return parse(code, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
        ],
      });
    } catch (error) {
      throw new Error(`Code parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate class diagram
   */
  private generateClassDiagram(ast: t.File, _code: string): UMLResult {
    const classes: ClassInfo[] = [];
    const ooAnalysisService = new OOAnalysisService();

    // Extract imports for dependency analysis
    const imports = ooAnalysisService.extractImports(ast);

    // Traverse AST to extract class information
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

    // Analyze OO relationships (composition, aggregation, dependency, etc.)
    const ooAnalysis = ooAnalysisService.analyze(classes, imports);

    // Generate Mermaid class diagram syntax with OO relationships
    const mermaidCode = this.generateMermaidClassDiagram(classes, ooAnalysis.relationships);

    return {
      type: 'class',
      mermaidCode,
      generationMode: 'native',
      metadata: {
        classes,
        dependencies: ooAnalysis.relationships,
        imports,
      },
    };
  }

  /**
   * Extract class information
   */
  private extractClassInfo(node: t.ClassDeclaration): ClassInfo | null {
    if (!node.id) return null;

    const className = node.id.name;
    const properties: PropertyInfo[] = [];
    const methods: MethodInfo[] = [];
    let constructorParams: ParameterInfo[] | undefined;

    // Extract inheritance relationship
    let extendsClass: string | undefined;
    if (node.superClass && t.isIdentifier(node.superClass)) {
      extendsClass = node.superClass.name;
    }

    // Extract implemented interfaces
    const implementsInterfaces: string[] = [];
    if (node.implements) {
      node.implements.forEach((impl) => {
        if (t.isTSExpressionWithTypeArguments(impl) && t.isIdentifier(impl.expression)) {
          implementsInterfaces.push(impl.expression.name);
        }
      });
    }

    // Traverse class members
    node.body.body.forEach((member) => {
      if (t.isClassProperty(member)) {
        const prop = this.extractProperty(member);
        if (prop) properties.push(prop);
      } else if (t.isClassMethod(member)) {
        const method = this.extractMethod(member);
        if (method) methods.push(method);
        // Extract constructor parameters for dependency injection analysis
        if (method && method.name === 'constructor') {
          constructorParams = method.parameters;
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
      lineNumber: node.loc?.start.line,
      constructorParams,
    };
  }

  /**
   * Extract interface information
   */
  private extractInterfaceInfo(node: t.TSInterfaceDeclaration): ClassInfo {
    const interfaceName = node.id.name;
    const properties: PropertyInfo[] = [];
    const methods: MethodInfo[] = [];

    // Extract extended interfaces
    const extendsInterfaces: string[] = [];
    if (node.extends) {
      node.extends.forEach((ext) => {
        if (t.isIdentifier(ext.expression)) {
          extendsInterfaces.push(ext.expression.name);
        }
      });
    }

    // Traverse interface members
    node.body.body.forEach((member) => {
      if (t.isTSPropertySignature(member)) {
        if (t.isIdentifier(member.key)) {
          properties.push({
            name: member.key.name,
            type: this.getTypeAnnotation(member.typeAnnotation),
            visibility: 'public',
          });
        }
      } else if (t.isTSMethodSignature(member)) {
        if (t.isIdentifier(member.key)) {
          methods.push({
            name: member.key.name,
            parameters: this.extractParameters(member.parameters as any),
            returnType: this.getTypeAnnotation(member.typeAnnotation),
            visibility: 'public',
          });
        }
      }
    });

    return {
      name: interfaceName,
      type: 'interface',
      properties,
      methods,
      extends: extendsInterfaces.length > 0 ? extendsInterfaces[0] : undefined,
    };
  }

  /**
   * Extract property information
   */
  private extractProperty(node: t.ClassProperty): PropertyInfo | null {
    if (!t.isIdentifier(node.key)) return null;

    const typeStr = this.getTypeAnnotation(node.typeAnnotation);
    const isArray = typeStr
      ? typeStr.endsWith('[]') || typeStr.startsWith('Array<') || typeStr === 'Array'
      : false;
    const isClassType = typeStr ? this.isClassTypeName(typeStr) : false;

    return {
      name: node.key.name,
      type: typeStr,
      visibility: this.getVisibility(node),
      lineNumber: node.loc?.start.line,
      isArray,
      isClassType,
    };
  }

  /**
   * Extract method information
   */
  private extractMethod(node: t.ClassMethod): MethodInfo | null {
    if (!t.isIdentifier(node.key)) return null;

    return {
      name: node.key.name,
      parameters: this.extractParameters(node.params),
      returnType: this.getTypeAnnotation(node.returnType),
      visibility: this.getVisibility(node),
      lineNumber: node.loc?.start.line,
    };
  }

  /**
   * Extract parameter information
   */
  private extractParameters(params: any[]): ParameterInfo[] {
    return params.map((param) => {
      if (t.isIdentifier(param)) {
        return {
          name: param.name,
          type: this.getTypeAnnotation(param.typeAnnotation),
        };
      }
      return { name: 'unknown' };
    });
  }

  /**
   * Get type annotation from TypeScript type annotation node
   */
  private getTypeAnnotation(typeAnnotation: any): string | undefined {
    if (!typeAnnotation) return undefined;

    if (t.isTSTypeAnnotation(typeAnnotation)) {
      return this.getTSTypeString(typeAnnotation.typeAnnotation);
    }

    return undefined;
  }

  /**
   * Get string representation of TypeScript type
   */
  private getTSTypeString(tsType: any): string | undefined {
    if (!tsType) return undefined;

    // Primitive types
    if (t.isTSStringKeyword(tsType)) return 'string';
    if (t.isTSNumberKeyword(tsType)) return 'number';
    if (t.isTSBooleanKeyword(tsType)) return 'boolean';
    if (t.isTSVoidKeyword(tsType)) return 'void';
    if (t.isTSAnyKeyword(tsType)) return 'any';
    if (t.isTSNullKeyword(tsType)) return 'null';
    if (t.isTSUndefinedKeyword(tsType)) return 'undefined';

    // Type reference (e.g., Wheel, Engine, Array<T>)
    if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
      const typeName = tsType.typeName.name;

      // Handle generic types like Array<Wheel>
      if (tsType.typeParameters && tsType.typeParameters.params.length > 0) {
        const typeArgs = tsType.typeParameters.params
          .map((param: any) => this.getTSTypeString(param))
          .filter((arg: string | undefined) => arg !== undefined)
          .join(', ');

        if (typeArgs) {
          return `${typeName}<${typeArgs}>`;
        }
      }

      return typeName;
    }

    // Array type (e.g., Wheel[])
    if (t.isTSArrayType(tsType)) {
      const elementType = this.getTSTypeString(tsType.elementType);
      return elementType ? `${elementType}[]` : 'Array';
    }

    // Union type (e.g., string | null)
    if (t.isTSUnionType(tsType)) {
      const types = tsType.types
        .map((type: any) => this.getTSTypeString(type))
        .filter((t: string | undefined) => t !== undefined)
        .join(' | ');
      return types || undefined;
    }

    return undefined;
  }

  /**
   * Get visibility
   */
  private getVisibility(node: any): 'public' | 'private' | 'protected' {
    if (node.accessibility) {
      return node.accessibility;
    }
    if (node.key && t.isPrivateName(node.key)) {
      return 'private';
    }
    return 'public';
  }

  /**
   * Check if a type name represents a class (not a primitive type)
   */
  private isClassTypeName(typeName: string): boolean {
    const primitiveTypes = [
      'string',
      'number',
      'boolean',
      'null',
      'undefined',
      'void',
      'any',
      'unknown',
      'never',
      'bigint',
      'symbol',
    ];

    const builtInTypes = [
      'Array',
      'Map',
      'Set',
      'WeakMap',
      'WeakSet',
      'Promise',
      'Date',
      'RegExp',
      'Error',
    ];

    // Remove array brackets and generic type arguments
    const baseType = typeName.replace(/\[\]/g, '').replace(/<.*>/g, '').trim();

    // Check if it's a primitive type
    if (primitiveTypes.includes(baseType.toLowerCase())) {
      return false;
    }

    // Check if it's a built-in type
    if (builtInTypes.includes(baseType)) {
      return false;
    }

    // Class names typically start with uppercase letter
    return baseType.length > 0 && baseType[0] === baseType[0].toUpperCase();
  }

  /**
   * Generate Mermaid class diagram syntax
   */
  private generateMermaidClassDiagram(
    classes: ClassInfo[],
    dependencies?: ASTDependencyInfo[]
  ): string {
    let mermaid = 'classDiagram\n';

    // If no classes found, generate a placeholder to avoid empty diagram
    if (classes.length === 0) {
      mermaid += '  class NoClassesFound\n';
      mermaid += '  NoClassesFound : <<No classes or interfaces found>>\n';
      mermaid += '  NoClassesFound : +This file may not contain\n';
      mermaid += '  NoClassesFound : +any class definitions\n';
      return mermaid;
    }

    // Generate each class/interface
    classes.forEach((classInfo) => {
      const prefix = classInfo.type === 'interface' ? '<<interface>>' : '';

      // Class definition
      mermaid += `  class ${classInfo.name}\n`;

      // If it's an interface, add marker
      if (classInfo.type === 'interface') {
        mermaid += `  ${classInfo.name} : ${prefix}\n`;
      }

      // Add properties
      classInfo.properties.forEach((prop) => {
        const visibility = this.getVisibilitySymbol(prop.visibility);
        const type = prop.type ? ` ${prop.type}` : '';
        mermaid += `  ${classInfo.name} : ${visibility}${prop.name}${type}\n`;
      });

      // Add methods
      classInfo.methods.forEach((method) => {
        const visibility = this.getVisibilitySymbol(method.visibility);
        // Mermaid doesn't support TypeScript-style "name: type" in parameters
        // Use "type name" format instead
        const params = method.parameters
          .map((p) => {
            if (p.type) {
              return `${p.type} ${p.name}`;
            }
            return p.name;
          })
          .join(', ');
        const returnType = method.returnType ? ` ${method.returnType}` : '';
        mermaid += `  ${classInfo.name} : ${visibility}${method.name}(${params})${returnType}\n`;
      });

      mermaid += '\n';
    });

    // Generate inheritance and implementation relationships
    classes.forEach((classInfo) => {
      // Inheritance relationship (solid line with hollow arrow)
      if (classInfo.extends) {
        mermaid += `  ${classInfo.extends} <|-- ${classInfo.name}\n`;
      }

      // Implementation relationship (dashed line with hollow arrow)
      if (classInfo.implements) {
        classInfo.implements.forEach((interfaceName) => {
          mermaid += `  ${interfaceName} <|.. ${classInfo.name}\n`;
        });
      }
    });

    // Generate OO relationship dependencies (composition, aggregation, etc.)
    if (dependencies && dependencies.length > 0) {
      // Filter out external dependencies (only show internal class relationships)
      const internalDeps = dependencies.filter(
        (dep) => !dep.isExternal && this.classExists(dep.to, classes)
      );

      internalDeps.forEach((dep) => {
        const { from, to, type, cardinality, context } = dep;

        // Generate Mermaid syntax based on relationship type
        switch (type) {
          case 'composition': // Solid diamond ◆ (strong ownership)
            // A *-- B : cardinality (A owns B, B's lifecycle controlled by A)
            mermaid += `  ${from} *-- "${cardinality || '1'}" ${to}`;
            if (context) {
              mermaid += ` : ${context}`;
            }
            mermaid += '\n';
            break;

          case 'aggregation': // Hollow diamond ◇ (weak ownership)
            // A o-- B : cardinality (A uses B, but B can exist independently)
            mermaid += `  ${from} o-- "${cardinality || '*'}" ${to}`;
            if (context) {
              mermaid += ` : ${context}`;
            }
            mermaid += '\n';
            break;

          case 'dependency': // Dashed arrow (uses/depends on)
            // A ..> B (method uses B as parameter or return type)
            mermaid += `  ${from} ..> ${to}`;
            if (context) {
              mermaid += ` : ${context}`;
            }
            mermaid += '\n';
            break;

          case 'association': // Solid arrow (references)
            // A --> B : cardinality (A references B)
            mermaid += `  ${from} --> "${cardinality || '1'}" ${to}`;
            if (context) {
              mermaid += ` : ${context}`;
            }
            mermaid += '\n';
            break;

          case 'injection': // Dependency injection (special dependency)
            // A ..> B : <<inject>> (dependency injection)
            mermaid += `  ${from} ..> ${to} : <<inject>>`;
            if (context) {
              mermaid += ` ${context}`;
            }
            mermaid += '\n';
            break;

          default:
            // Fallback to basic dependency
            mermaid += `  ${from} ..> ${to}\n`;
        }
      });
    }

    return mermaid;
  }

  /**
   * Check if a class exists in the classes list
   */
  private classExists(className: string, classes: ClassInfo[]): boolean {
    return classes.some((cls) => cls.name === className);
  }

  /**
   * Get visibility symbol
   */
  private getVisibilitySymbol(visibility: 'public' | 'private' | 'protected'): string {
    switch (visibility) {
      case 'public':
        return '+';
      case 'private':
        return '-';
      case 'protected':
        return '#';
      default:
        return '+';
    }
  }

  /**
   * Generate sequence diagram using AST analysis
   */
  private generateSequenceDiagram(ast: t.File, _code: string): UMLResult {
    const sequenceAnalysisService = new SequenceAnalysisService();
    const analysis = sequenceAnalysisService.analyze(ast);

    // Generate Mermaid sequence diagram syntax
    const mermaidCode = this.generateMermaidSequenceDiagram(analysis);

    // Extract metadata for backward compatibility
    const sequences: SequenceInfo[] = this.convertToSequenceInfo(analysis);

    return {
      type: 'sequence',
      mermaidCode,
      generationMode: 'native',
      metadata: {
        sequences,
        participants: analysis.participants,
        interactions: analysis.interactions,
        entryPoints: analysis.entryPoints,
      },
    };
  }

  /**
   * Generate Mermaid sequence diagram syntax
   */
  private generateMermaidSequenceDiagram(analysis: {
    participants: Array<{ name: string; type: string }>;
    interactions: Array<{ from: string; to: string; message: string; type: string }>;
    entryPoints: string[];
  }): string {
    let mermaid = 'sequenceDiagram\n';

    // If no interactions found, generate a placeholder
    if (analysis.interactions.length === 0) {
      mermaid += '  participant NoCode\n';
      mermaid += '  Note over NoCode: No function calls detected\n';
      return mermaid;
    }

    // Add participants in order
    const addedParticipants = new Set<string>();
    for (const participant of analysis.participants) {
      if (!addedParticipants.has(participant.name)) {
        mermaid += `  participant ${this.sanitizeParticipantName(participant.name)}\n`;
        addedParticipants.add(participant.name);
      }
    }

    mermaid += '\n';

    // Add interactions
    for (const interaction of analysis.interactions) {
      const from = this.sanitizeParticipantName(interaction.from);
      const to = this.sanitizeParticipantName(interaction.to);
      const message = this.sanitizeMessage(interaction.message);

      // Choose arrow type based on interaction type
      let arrow = '->>';
      if (interaction.type === 'async') {
        arrow = '-)';
      } else if (interaction.type === 'return') {
        arrow = '-->>';
      }

      mermaid += `  ${from}${arrow}${to}: ${message}\n`;
    }

    return mermaid;
  }

  /**
   * Sanitize participant name for Mermaid
   */
  private sanitizeParticipantName(name: string): string {
    // Replace dots with underscores for nested names (e.g., Class.method -> Class_method)
    return name.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Sanitize message for Mermaid
   */
  private sanitizeMessage(message: string): string {
    // Escape special characters that might break Mermaid syntax
    return message.replace(/"/g, '\\"');
  }

  /**
   * Convert analysis result to legacy SequenceInfo format for backward compatibility
   */
  private convertToSequenceInfo(analysis: {
    participants: Array<{ name: string }>;
    interactions: Array<{ from: string; to: string; message: string; type: string }>;
  }): SequenceInfo[] {
    const participantMap = new Map<string, SequenceInfo>();

    // Initialize all participants
    for (const participant of analysis.participants) {
      participantMap.set(participant.name, {
        participant: participant.name,
        interactions: [],
      });
    }

    // Group interactions by participant
    for (const interaction of analysis.interactions) {
      const fromInfo = participantMap.get(interaction.from);
      if (fromInfo) {
        fromInfo.interactions.push({
          from: interaction.from,
          to: interaction.to,
          message: interaction.message,
          type: interaction.type as 'sync' | 'async' | 'return',
        });
      }
    }

    return Array.from(participantMap.values());
  }

  /**
   * Generate flowchart
   */
  private generateFlowchart(ast: t.File, _code: string): UMLResult {
    const functions: string[] = [];
    let mainFlowchart = '';

    // Find main functions
    traverse(ast, {
      FunctionDeclaration: (path: any) => {
        const node = path.node;
        if (node.id) {
          const funcName = node.id.name;
          functions.push(funcName);

          // Generate flowchart for the first function found
          if (!mainFlowchart) {
            mainFlowchart = this.generateFunctionFlowchart(node, funcName);
          }
        }
      },
      ArrowFunctionExpression: (path: any) => {
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          const funcName = parent.id.name;
          functions.push(funcName);

          if (!mainFlowchart) {
            mainFlowchart = this.generateArrowFunctionFlowchart(path.node, funcName);
          }
        }
      },
      ClassMethod: (path: any) => {
        const node = path.node;
        if (t.isIdentifier(node.key)) {
          const methodName = node.key.name;
          functions.push(methodName);

          if (!mainFlowchart) {
            mainFlowchart = this.generateFunctionFlowchart(node, methodName);
          }
        }
      },
    });

    // If no function found, generate a simple flowchart
    if (!mainFlowchart) {
      mainFlowchart = this.generateSimpleFlowchart();
    }

    return {
      type: 'flowchart',
      mermaidCode: mainFlowchart,
      generationMode: 'native',
      metadata: { functions },
    };
  }

  /**
   * Generate function flowchart
   */
  private generateFunctionFlowchart(
    node: t.FunctionDeclaration | t.ClassMethod,
    name: string
  ): string {
    let flowchart = 'flowchart TD\n';
    let nodeId = 0;

    const getNextId = () => `node${nodeId++}`;

    const startId = getNextId();
    flowchart += `  ${startId}([Start: ${name}])\n`;

    let currentId = startId;
    let endId = '';

    // Process function body
    if (node.body && t.isBlockStatement(node.body)) {
      const bodyStatements = node.body.body;

      bodyStatements.forEach((statement) => {
        const nextId = getNextId();

        if (t.isIfStatement(statement)) {
          // Conditional branch
          flowchart += `  ${nextId}{${this.getStatementLabel(statement)}}\n`;
          flowchart += `  ${currentId} --> ${nextId}\n`;

          const trueId = getNextId();
          const falseId = getNextId();

          flowchart += `  ${trueId}[True branch]\n`;
          flowchart += `  ${falseId}[False branch]\n`;
          flowchart += `  ${nextId} -->|Yes| ${trueId}\n`;
          flowchart += `  ${nextId} -->|No| ${falseId}\n`;

          currentId = nextId;
        } else if (t.isWhileStatement(statement) || t.isForStatement(statement)) {
          // Loop
          flowchart += `  ${nextId}{${this.getStatementLabel(statement)}}\n`;
          flowchart += `  ${currentId} --> ${nextId}\n`;

          const loopBodyId = getNextId();
          flowchart += `  ${loopBodyId}[Loop body]\n`;
          flowchart += `  ${nextId} -->|Continue| ${loopBodyId}\n`;
          flowchart += `  ${loopBodyId} --> ${nextId}\n`;

          currentId = nextId;
        } else if (t.isReturnStatement(statement)) {
          // Return statement
          flowchart += `  ${nextId}[Return]\n`;
          flowchart += `  ${currentId} --> ${nextId}\n`;
          currentId = nextId;
        } else {
          // General statement
          const label = this.getStatementLabel(statement);
          if (label) {
            flowchart += `  ${nextId}[${label}]\n`;
            flowchart += `  ${currentId} --> ${nextId}\n`;
            currentId = nextId;
          }
        }
      });
    }

    // End node
    endId = getNextId();
    flowchart += `  ${endId}([End])\n`;
    flowchart += `  ${currentId} --> ${endId}\n`;

    return flowchart;
  }

  /**
   * Generate arrow function flowchart
   */
  private generateArrowFunctionFlowchart(_node: t.ArrowFunctionExpression, name: string): string {
    let flowchart = 'flowchart TD\n';
    flowchart += `  start([Start: ${name}])\n`;
    flowchart += `  process[Function body]\n`;
    flowchart += `  end([End])\n`;
    flowchart += `  start --> process\n`;
    flowchart += `  process --> end\n`;

    return flowchart;
  }

  /**
   * Generate simple flowchart
   */
  private generateSimpleFlowchart(): string {
    return `flowchart TD
  start([Start])
  process[Code execution]
  end([End])
  start --> process
  process --> end
`;
  }

  /**
   * Get statement label
   */
  private getStatementLabel(statement: t.Statement): string {
    if (t.isIfStatement(statement)) {
      return 'Condition';
    } else if (t.isWhileStatement(statement)) {
      return 'While loop';
    } else if (t.isForStatement(statement)) {
      return 'For loop';
    } else if (t.isReturnStatement(statement)) {
      return 'Return';
    } else if (t.isVariableDeclaration(statement)) {
      return 'Variable declaration';
    } else if (t.isExpressionStatement(statement)) {
      return 'Expression';
    } else if (t.isTryStatement(statement)) {
      return 'Try-catch';
    }

    return 'Process';
  }
}
