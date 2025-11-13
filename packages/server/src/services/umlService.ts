import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import { MermaidValidator } from './uml/mermaidValidator.js';
import { OOAnalysisService } from './ooAnalysisService.js';
import { CrossFileAnalysisService } from './crossFileAnalysisService.js';
import type { AIService } from './aiService.js';
import type { ProjectConfig } from '../types/config.js';
import type {
  ImportInfo,
  DependencyInfo as ASTDependencyInfo,
  CrossFileAnalysisMode,
  BidirectionalAnalysisResult,
} from '../types/ast.js';

// Correct way to import @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

// UML diagram type
export type DiagramType = 'class' | 'flowchart' | 'sequence' | 'dependency';

// UML generation mode
export type DiagramGenerationMode = 'native' | 'ai' | 'hybrid';

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
  private aiService?: AIService;
  private config?: ProjectConfig;

  constructor(aiService?: AIService, config?: ProjectConfig) {
    this.validator = new MermaidValidator();
    this.aiService = aiService;
    this.config = config;
  }

  /**
   * Generate UML diagram (with AI mode and fallback support)
   */
  async generateDiagram(code: string, type: DiagramType): Promise<UMLResult> {
    const mode = this.config?.uml?.generationMode || 'hybrid';
    const aiEnabled = this.shouldUseAI(type);

    try {
      // Choose generation strategy based on mode
      if (mode === 'ai' && aiEnabled) {
        return await this.generateWithAI(code, type);
      } else if (mode === 'hybrid' && aiEnabled) {
        return await this.generateWithHybrid(code, type);
      } else {
        return await this.generateWithNative(code, type);
      }
    } catch (error) {
      console.error(`Failed to generate ${type} diagram with ${mode} mode:`, error);

      // Fallback to native if AI fails
      if (mode !== 'native') {
        console.log('Falling back to native generation...');
        try {
          return await this.generateWithNative(code, type);
        } catch (nativeError) {
          throw new Error(`All generation methods failed: ${(error as Error).message}`);
        }
      }

      throw new Error(`Failed to generate UML diagram: ${(error as Error).message}`);
    }
  }

  /**
   * Generate cross-file class diagram using bidirectional dependency analysis
   *
   * @param filePath - Target file path to analyze
   * @param projectPath - Project root path
   * @param mode - Analysis mode (forward/reverse/bidirectional)
   * @param depth - Maximum traversal depth (1-3)
   * @returns UML class diagram with cross-file relationships
   */
  async generateCrossFileClassDiagram(
    filePath: string,
    projectPath: string,
    mode: CrossFileAnalysisMode = 'bidirectional',
    depth: 1 | 2 | 3 = 1
  ): Promise<UMLResult> {
    try {
      // Initialize cross-file analysis service
      const crossFileService = new CrossFileAnalysisService(projectPath);

      // Analyze based on mode
      let result: BidirectionalAnalysisResult;

      if (mode === 'bidirectional') {
        result = await crossFileService.analyzeBidirectional(filePath, depth);
      } else if (mode === 'forward') {
        const forwardResults = await crossFileService.analyzeForward(filePath, depth);
        // Convert forward results to bidirectional format
        result = {
          targetFile: filePath,
          forwardDeps: Array.from(forwardResults.values()).filter((r) => r.filePath !== filePath),
          reverseDeps: [],
          allClasses: [],
          relationships: [],
          stats: {
            totalFiles: forwardResults.size,
            totalClasses: 0,
            totalRelationships: 0,
            maxDepth: depth,
          },
        };
        // Extract classes and relationships
        for (const fileResult of forwardResults.values()) {
          result.allClasses.push(...fileResult.classes);
          result.relationships.push(...fileResult.relationships);
        }
        result.stats.totalClasses = result.allClasses.length;
        result.stats.totalRelationships = result.relationships.length;
      } else {
        // reverse mode
        const reverseResults = await crossFileService.analyzeReverse(filePath, depth);
        result = {
          targetFile: filePath,
          forwardDeps: [],
          reverseDeps: Array.from(reverseResults.values()).filter((r) => r.filePath !== filePath),
          allClasses: [],
          relationships: [],
          stats: {
            totalFiles: reverseResults.size,
            totalClasses: 0,
            totalRelationships: 0,
            maxDepth: depth,
          },
        };
        // Extract classes and relationships
        for (const fileResult of reverseResults.values()) {
          result.allClasses.push(...fileResult.classes);
          result.relationships.push(...fileResult.relationships);
        }
        result.stats.totalClasses = result.allClasses.length;
        result.stats.totalRelationships = result.relationships.length;
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
          mode,
          depth,
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

    // Add relationships
    for (const rel of result.relationships) {
      const symbol = this.getRelationshipSymbol(rel.type);
      const cardinality = rel.cardinality ? `"${rel.cardinality}"` : '';
      const label = rel.context ? `: ${rel.context}` : '';

      diagram += `  ${rel.from} ${symbol} ${cardinality} ${rel.to}${label}\n`;
    }

    return diagram;
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
   * Determine if AI should be used
   */
  private shouldUseAI(type: DiagramType): boolean {
    if (!this.aiService) {
      return false;
    }

    const enabledTypes = this.config?.uml?.aiOptions?.enabledTypes || ['sequence', 'dependency'];
    return enabledTypes.includes(type);
  }

  /**
   * Generate diagram using AI
   */
  private async generateWithAI(code: string, type: DiagramType): Promise<UMLResult> {
    if (!this.aiService) {
      throw new Error('AI service not available');
    }

    const provider = await (this.aiService as any).getProvider();
    if (!provider.generateDiagram) {
      throw new Error('AI provider does not support diagram generation');
    }

    const maxRetries = this.config?.uml?.aiOptions?.maxRetries || 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await provider.generateDiagram(code, type);

        if (!result.success || !result.mermaidCode) {
          throw new Error(result.error || 'AI generation failed');
        }

        // Validate generated Mermaid code
        const validation = this.validator.validate(result.mermaidCode);

        if (validation.valid) {
          return {
            type,
            mermaidCode: result.mermaidCode,
            generationMode: 'ai',
            metadata: result.metadata,
          };
        }

        // If auto-fix is enabled, attempt to fix
        if (this.config?.uml?.aiOptions?.autoFixSyntax) {
          const fixed = this.validator.autoFix(result.mermaidCode);
          const fixedValidation = this.validator.validate(fixed);

          if (fixedValidation.valid) {
            return {
              type,
              mermaidCode: fixed,
              generationMode: 'ai',
              metadata: {
                ...result.metadata,
                autoFixed: true,
              },
            };
          }
        }

        throw new Error(`Invalid Mermaid syntax: ${validation.errors.join(', ')}`);
      } catch (error) {
        lastError = error as Error;
        console.log(`AI generation attempt ${attempt + 1} failed:`, error);
      }
    }

    throw lastError || new Error('AI generation failed after retries');
  }

  /**
   * Generate diagram using hybrid mode
   */
  private async generateWithHybrid(code: string, type: DiagramType): Promise<UMLResult> {
    try {
      // Try AI generation first
      const aiResult = await this.generateWithAI(code, type);
      return {
        ...aiResult,
        generationMode: 'hybrid',
      };
    } catch (aiError) {
      console.log('AI generation failed in hybrid mode, falling back to native:', aiError);
      // AI failed, use Native
      const nativeResult = await this.generateWithNative(code, type);
      return {
        ...nativeResult,
        generationMode: 'hybrid',
        metadata: {
          ...nativeResult.metadata,
          fallbackReason: (aiError as Error).message,
        },
      };
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
    } else if (type === 'sequence' || type === 'dependency') {
      // Native mode does not support these complex diagrams yet
      throw new Error(`Native mode does not support ${type} diagrams. Please use AI mode.`);
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
