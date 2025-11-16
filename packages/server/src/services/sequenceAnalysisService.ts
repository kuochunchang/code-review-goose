/**
 * Sequence Analysis Service
 * Analyzes function call sequences and generates sequence diagram data
 */

import * as t from '@babel/types';
import traverseModule from '@babel/traverse';

// Correct way to import @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

/**
 * Represents a participant in the sequence diagram
 */
export interface SequenceParticipant {
  name: string;
  type: 'class' | 'function' | 'object' | 'external';
  lineNumber?: number;
}

/**
 * Represents an interaction/message in the sequence diagram
 */
export interface SequenceInteraction {
  from: string;
  to: string;
  message: string;
  type: 'sync' | 'async' | 'return';
  lineNumber?: number;
}

/**
 * Result of sequence analysis
 */
export interface SequenceAnalysisResult {
  participants: SequenceParticipant[];
  interactions: SequenceInteraction[];
  entryPoints: string[]; // Main functions that start sequences
}

/**
 * Sequence Analysis Service for extracting function call sequences
 */
export class SequenceAnalysisService {
  private participants: Map<string, SequenceParticipant> = new Map();
  private interactions: SequenceInteraction[] = [];
  private currentContext: string[] = []; // Stack of current execution context
  private entryPoints: Set<string> = new Set();

  /**
   * Analyze AST and extract sequence diagram information
   */
  analyze(ast: t.File): SequenceAnalysisResult {
    // Reset state
    this.participants.clear();
    this.interactions = [];
    this.currentContext = [];
    this.entryPoints.clear();

    // First pass: identify all participants (classes, functions, etc.)
    this.identifyParticipants(ast);

    // Second pass: analyze function calls and interactions
    this.analyzeInteractions(ast);

    return {
      participants: Array.from(this.participants.values()),
      interactions: this.interactions,
      entryPoints: Array.from(this.entryPoints),
    };
  }

  /**
   * First pass: identify all participants
   */
  private identifyParticipants(ast: t.File): void {
    traverse(ast, {
      // Identify classes as participants
      ClassDeclaration: (path: any) => {
        const node = path.node as t.ClassDeclaration;
        if (node.id) {
          this.addParticipant(node.id.name, 'class', node.loc?.start.line);
        }
      },

      // Identify top-level functions as participants
      FunctionDeclaration: (path: any) => {
        const node = path.node as t.FunctionDeclaration;
        if (node.id) {
          this.addParticipant(node.id.name, 'function', node.loc?.start.line);

          // Top-level exported functions are potential entry points
          const parent = path.parent;
          if (t.isProgram(parent) || t.isExportNamedDeclaration(parent)) {
            this.entryPoints.add(node.id.name);
          }
        }
      },

      // Identify arrow functions assigned to variables
      VariableDeclarator: (path: any) => {
        const node = path.node as t.VariableDeclarator;
        if (
          t.isIdentifier(node.id) &&
          (t.isArrowFunctionExpression(node.init) || t.isFunctionExpression(node.init))
        ) {
          this.addParticipant(node.id.name, 'function', node.loc?.start.line);
        }
      },

      // Identify object expressions as participants (e.g., const api = { ... })
      ObjectExpression: (path: any) => {
        const parent = path.parent;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          this.addParticipant(parent.id.name, 'object', parent.loc?.start.line);
        }
      },
    });
  }

  /**
   * Second pass: analyze interactions and function calls
   */
  private analyzeInteractions(ast: t.File): void {
    traverse(ast, {
      // Track function declarations to establish context
      FunctionDeclaration: {
        enter: (path: any) => {
          const node = path.node as t.FunctionDeclaration;
          if (node.id) {
            this.currentContext.push(node.id.name);
          }
        },
        exit: (path: any) => {
          const node = path.node as t.FunctionDeclaration;
          if (node.id) {
            this.currentContext.pop();
          }
        },
      },

      // Track arrow functions
      ArrowFunctionExpression: {
        enter: (path: any) => {
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            this.currentContext.push(parent.id.name);
          } else {
            this.currentContext.push('anonymous');
          }
        },
        exit: () => {
          this.currentContext.pop();
        },
      },

      // Track class methods
      ClassMethod: {
        enter: (path: any) => {
          const node = path.node as t.ClassMethod;
          const classPath = path.findParent((p: any) => p.isClassDeclaration());
          if (classPath && t.isClassDeclaration(classPath.node) && classPath.node.id) {
            const className = classPath.node.id.name;
            const methodName = t.isIdentifier(node.key) ? node.key.name : 'unknown';
            this.currentContext.push(`${className}.${methodName}`);
          }
        },
        exit: () => {
          this.currentContext.pop();
        },
      },

      // Analyze function calls
      CallExpression: (path: any) => {
        const node = path.node as t.CallExpression;
        this.analyzeCallExpression(node);
      },

      // Analyze await expressions (async calls)
      AwaitExpression: (path: any) => {
        const node = path.node as t.AwaitExpression;
        if (t.isCallExpression(node.argument)) {
          this.analyzeCallExpression(node.argument, true);
        }
      },

      // Analyze return statements
      ReturnStatement: (path: any) => {
        const node = path.node as t.ReturnStatement;
        if (this.currentContext.length > 0) {
          const currentFunc = this.currentContext[this.currentContext.length - 1];
          const caller = this.currentContext[this.currentContext.length - 2];

          if (caller && currentFunc) {
            const returnValue = node.argument ? this.getExpressionLabel(node.argument) : 'void';
            this.addInteraction(
              currentFunc,
              caller,
              returnValue,
              'return',
              node.loc?.start.line
            );
          }
        }
      },
    });
  }

  /**
   * Analyze a call expression and record the interaction
   */
  private analyzeCallExpression(node: t.CallExpression, isAsync: boolean = false): void {
    if (this.currentContext.length === 0) return;

    const caller = this.currentContext[this.currentContext.length - 1];
    const callee = this.getCalleeInfo(node.callee);

    if (!callee) return;

    // Add callee as participant if not already present
    if (!this.participants.has(callee.name)) {
      this.addParticipant(callee.name, callee.type, node.loc?.start.line);
    }

    // Create interaction message
    const message = this.createCallMessage(node, callee.name);
    const interactionType = isAsync ? 'async' : 'sync';

    this.addInteraction(caller, callee.name, message, interactionType, node.loc?.start.line);

    // Also record the return (for better sequence diagrams)
    // Return shows completion of the function call
    this.addInteraction(callee.name, caller, 'return', 'return', node.loc?.start.line);
  }

  /**
   * Get callee information from various call patterns
   */
  private getCalleeInfo(
    callee: t.Expression | t.V8IntrinsicIdentifier
  ): { name: string; type: 'function' | 'class' | 'object' | 'external' } | null {
    // Simple function call: foo()
    if (t.isIdentifier(callee)) {
      const participant = this.participants.get(callee.name);
      return {
        name: callee.name,
        type: participant?.type || 'function',
      };
    }

    // Member expression: obj.method() or Class.staticMethod()
    if (t.isMemberExpression(callee)) {
      const objectName = this.getObjectName(callee.object);
      const propertyName = t.isIdentifier(callee.property)
        ? callee.property.name
        : 'unknown';

      if (objectName) {
        const fullName = `${objectName}.${propertyName}`;
        const participant = this.participants.get(objectName);
        return {
          name: fullName,
          type: participant?.type || 'object',
        };
      }
    }

    // New expression: new ClassName()
    if (t.isNewExpression(callee)) {
      if (t.isIdentifier(callee.callee)) {
        return {
          name: callee.callee.name,
          type: 'class',
        };
      }
    }

    return null;
  }

  /**
   * Get object name from member expression
   */
  private getObjectName(node: t.Expression | t.PrivateName): string | null {
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isThisExpression(node)) {
      // Get current class context
      const context = this.currentContext[this.currentContext.length - 1];
      if (context && context.includes('.')) {
        return context.split('.')[0];
      }
      return 'this';
    }
    if (t.isMemberExpression(node)) {
      return this.getObjectName(node.object);
    }
    return null;
  }

  /**
   * Create call message label
   */
  private createCallMessage(node: t.CallExpression, calleeName: string): string {
    const methodName = calleeName.includes('.') ? calleeName.split('.').pop() : calleeName;

    // Get argument summary
    const args = node.arguments.map((arg) => this.getExpressionLabel(arg)).join(', ');

    return args ? `${methodName}(${args})` : `${methodName}()`;
  }

  /**
   * Get a simple label for an expression
   */
  private getExpressionLabel(node: t.Node): string {
    if (t.isIdentifier(node)) {
      return node.name;
    }
    if (t.isStringLiteral(node)) {
      return `"${node.value}"`;
    }
    if (t.isNumericLiteral(node)) {
      return node.value.toString();
    }
    if (t.isBooleanLiteral(node)) {
      return node.value.toString();
    }
    if (t.isNullLiteral(node)) {
      return 'null';
    }
    if (t.isArrayExpression(node)) {
      return '[...]';
    }
    if (t.isObjectExpression(node)) {
      return '{...}';
    }
    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
      return '() => {}';
    }
    if (t.isCallExpression(node)) {
      const callee = this.getCalleeInfo(node.callee);
      return callee ? `${callee.name}()` : 'fn()';
    }
    if (t.isMemberExpression(node)) {
      const obj = this.getObjectName(node.object);
      const prop = t.isIdentifier(node.property) ? node.property.name : 'prop';
      return obj ? `${obj}.${prop}` : prop;
    }
    return '...';
  }

  /**
   * Add a participant to the map
   */
  private addParticipant(
    name: string,
    type: 'class' | 'function' | 'object' | 'external',
    lineNumber?: number
  ): void {
    if (!this.participants.has(name)) {
      this.participants.set(name, { name, type, lineNumber });
    }
  }

  /**
   * Add an interaction to the list
   */
  private addInteraction(
    from: string,
    to: string,
    message: string,
    type: 'sync' | 'async' | 'return',
    lineNumber?: number
  ): void {
    // Avoid self-calls for cleaner diagrams
    if (from === to) return;

    this.interactions.push({
      from,
      to,
      message,
      type,
      lineNumber,
    });
  }
}
