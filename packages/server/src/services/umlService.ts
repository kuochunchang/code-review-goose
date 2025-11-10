import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import { MermaidValidator } from './uml/mermaidValidator.js';
import type { AIService } from './aiService.js';
import type { ProjectConfig } from '../types/config.js';

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
}

// Property information
export interface PropertyInfo {
  name: string;
  type?: string;
  visibility: 'public' | 'private' | 'protected';
}

// Method information
export interface MethodInfo {
  name: string;
  parameters: ParameterInfo[];
  returnType?: string;
  visibility: 'public' | 'private' | 'protected';
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
    dependencies?: DependencyInfo[];
    sequences?: SequenceInfo[];
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

    // Generate Mermaid class diagram syntax
    const mermaidCode = this.generateMermaidClassDiagram(classes);

    return {
      type: 'class',
      mermaidCode,
      generationMode: 'native',
      metadata: { classes },
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
      }
    });

    return {
      name: className,
      type: 'class',
      properties,
      methods,
      extends: extendsClass,
      implements: implementsInterfaces.length > 0 ? implementsInterfaces : undefined,
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

    return {
      name: node.key.name,
      type: this.getTypeAnnotation(node.typeAnnotation),
      visibility: this.getVisibility(node),
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
   * Get type annotation
   */
  private getTypeAnnotation(typeAnnotation: any): string | undefined {
    if (!typeAnnotation) return undefined;

    if (t.isTSTypeAnnotation(typeAnnotation)) {
      const tsType = typeAnnotation.typeAnnotation;

      if (t.isTSStringKeyword(tsType)) return 'string';
      if (t.isTSNumberKeyword(tsType)) return 'number';
      if (t.isTSBooleanKeyword(tsType)) return 'boolean';
      if (t.isTSVoidKeyword(tsType)) return 'void';
      if (t.isTSAnyKeyword(tsType)) return 'any';

      if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
        return tsType.typeName.name;
      }

      if (t.isTSArrayType(tsType)) {
        const elementType = this.getTypeAnnotation({ typeAnnotation: tsType.elementType });
        return elementType ? `${elementType}[]` : 'Array';
      }
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
   * Generate Mermaid class diagram syntax
   */
  private generateMermaidClassDiagram(classes: ClassInfo[]): string {
    let mermaid = 'classDiagram\n';

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

    // Generate relationships
    classes.forEach((classInfo) => {
      // Inheritance relationship
      if (classInfo.extends) {
        mermaid += `  ${classInfo.extends} <|-- ${classInfo.name}\n`;
      }

      // Implementation relationship
      if (classInfo.implements) {
        classInfo.implements.forEach((interfaceName) => {
          mermaid += `  ${interfaceName} <|.. ${classInfo.name}\n`;
        });
      }
    });

    return mermaid;
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
