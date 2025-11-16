/**
 * Sequence Analysis Service
 * Analyzes class interactions and method calls for sequence diagrams
 * Participants are classes/objects, messages are method calls
 */

import * as t from '@babel/types';
import traverseModule from '@babel/traverse';

// Correct way to import @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

/**
 * Represents a participant in the sequence diagram (class, function, or module)
 */
export interface SequenceParticipant {
  name: string;
  type: 'class' | 'function' | 'module'; // Classes are objects, function is for top-level functions, module is fallback
  lineNumber?: number;
}

/**
 * Represents an interaction/message in the sequence diagram
 */
export interface SequenceInteraction {
  from: string; // Calling class/module
  to: string; // Called class/module
  message: string; // Method name with arguments
  type: 'sync' | 'async' | 'return';
  lineNumber?: number;
}

/**
 * Result of sequence analysis
 */
export interface SequenceAnalysisResult {
  participants: SequenceParticipant[];
  interactions: SequenceInteraction[];
  entryPoints: string[]; // Entry point methods
}

/**
 * Sequence Analysis Service for extracting class interactions
 */
export class SequenceAnalysisService {
  private participants: Map<string, SequenceParticipant> = new Map();
  private interactions: SequenceInteraction[] = [];
  private classes: Map<string, Set<string>> = new Map(); // className -> methods
  private topLevelFunctions: Set<string> = new Set(); // Top-level function names
  private currentClass: string | null = null; // Current class/function being analyzed
  private currentMethod: string | null = null; // Current method being analyzed
  private entryPoints: Set<string> = new Set();

  /**
   * Analyze AST and extract sequence diagram information
   */
  analyze(ast: t.File): SequenceAnalysisResult {
    // Reset state
    this.participants.clear();
    this.interactions = [];
    this.classes.clear();
    this.topLevelFunctions.clear();
    this.currentClass = null;
    this.currentMethod = null;
    this.entryPoints.clear();

    // First pass: identify all classes and top-level functions
    this.identifyClassesAndFunctions(ast);

    // If no classes and no top-level functions found, add a "Module" participant as fallback
    if (this.classes.size === 0 && this.topLevelFunctions.size === 0) {
      this.addParticipant('Module', 'module');
    }

    // Second pass: analyze method calls and interactions
    this.analyzeMethodCalls(ast);

    return {
      participants: Array.from(this.participants.values()),
      interactions: this.interactions,
      entryPoints: Array.from(this.entryPoints),
    };
  }

  /**
   * First pass: identify all classes, their methods, and top-level functions
   */
  private identifyClassesAndFunctions(ast: t.File): void {
    traverse(ast, {
      ClassDeclaration: (path: any) => {
        const node = path.node as t.ClassDeclaration;
        if (node.id) {
          const className = node.id.name;
          this.classes.set(className, new Set());
          this.addParticipant(className, 'class', node.loc?.start.line);

          // Extract methods
          node.body.body.forEach((member) => {
            if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
              this.classes.get(className)?.add(member.key.name);
            }
          });
        }
      },
      FunctionDeclaration: (path: any) => {
        const node = path.node as t.FunctionDeclaration;
        // Only process top-level functions (not nested in classes)
        // Check if function is at program level
        const isTopLevel = path.parent.type === 'Program' || path.getFunctionParent() === null;
        if (node.id && isTopLevel) {
          const functionName = node.id.name;
          this.topLevelFunctions.add(functionName);
          this.addParticipant(functionName, 'function', node.loc?.start.line);
        }
      },
    });
  }

  /**
   * Second pass: analyze method calls between classes
   */
  private analyzeMethodCalls(ast: t.File): void {
    traverse(ast, {
      // Track class methods
      ClassMethod: {
        enter: (path: any) => {
          const node = path.node as t.ClassMethod;
          const classPath = path.findParent((p: any) => p.isClassDeclaration());

          if (classPath && t.isClassDeclaration(classPath.node) && classPath.node.id) {
            this.currentClass = classPath.node.id.name;
            this.currentMethod = t.isIdentifier(node.key) ? node.key.name : null;

            // Mark as entry point if it's a public method
            if (this.currentMethod && node.kind === 'method') {
              this.entryPoints.add(`${this.currentClass}.${this.currentMethod}`);
            }
          }
        },
        exit: () => {
          this.currentClass = null;
          this.currentMethod = null;
        },
      },

      // Track top-level functions
      FunctionDeclaration: {
        enter: (path: any) => {
          const node = path.node as t.FunctionDeclaration;
          // Only process top-level functions (when there are no classes)
          // Check if function is at program level (not nested in other functions or classes)
          const isTopLevel = path.parent.type === 'Program' || path.getFunctionParent() === null;
          if (this.classes.size === 0 && node.id && isTopLevel) {
            this.currentClass = node.id.name; // Use function name as "class"
            this.currentMethod = null; // Top-level, not a method
            this.entryPoints.add(node.id.name);
          }
        },
        exit: (path: any) => {
          const node = path.node as t.FunctionDeclaration;
          const isTopLevel = path.parent.type === 'Program' || path.getFunctionParent() === null;
          if (this.classes.size === 0 && node.id && isTopLevel && this.currentClass === node.id.name) {
            this.currentClass = null;
            this.currentMethod = null;
          }
        },
      },

      // Analyze function/method calls
      CallExpression: (path: any) => {
        const node = path.node as t.CallExpression;
        if (this.currentClass && this.currentMethod) {
          // Class method calls
          this.analyzeCallExpression(node, false);
        } else if (this.currentClass && this.classes.size === 0) {
          // Top-level function calls (currentMethod is null for top-level functions)
          this.analyzeCallExpression(node, false);
        }
      },

      // Analyze await expressions (async calls)
      AwaitExpression: (path: any) => {
        const node = path.node as t.AwaitExpression;
        if (t.isCallExpression(node.argument)) {
          if (this.currentClass && this.currentMethod) {
            // Class method async calls
            this.analyzeCallExpression(node.argument, true);
          } else if (this.currentClass && this.classes.size === 0) {
            // Top-level async function calls
            this.analyzeCallExpression(node.argument, true);
          }
        }
      },
    });
  }

  /**
   * Analyze a call expression and record the interaction
   */
  private analyzeCallExpression(node: t.CallExpression, isAsync: boolean): void {
    // For classes, we need both currentClass and currentMethod
    // For top-level functions, we only need currentClass (currentMethod is null)
    if (!this.currentClass) return;
    if (this.classes.size > 0 && !this.currentMethod) return; // In class mode, must have a method

    const callInfo = this.getCallInfo(node.callee);
    if (!callInfo) return;

    const { targetClass, methodName } = callInfo;

    // Skip built-in methods on built-in types (Array, Map, Set, etc.)
    if (this.isBuiltInMethod(targetClass, methodName)) return;

    // Add target class/function as participant if not already present
    if (!this.participants.has(targetClass)) {
      const participantType = this.topLevelFunctions.has(targetClass) ? 'function' : 'class';
      this.addParticipant(targetClass, participantType, node.loc?.start.line);
    }

    // Create interaction message (method call)
    const args = node.arguments.map((arg) => this.getExpressionLabel(arg)).join(', ');
    const message = args ? `${methodName}(${args})` : `${methodName}()`;

    const interactionType = isAsync ? 'async' : 'sync';

    // Add interaction from current class to target class
    this.addInteraction(
      this.currentClass,
      targetClass,
      message,
      interactionType,
      node.loc?.start.line
    );

    // Add return interaction
    this.addInteraction(
      targetClass,
      this.currentClass,
      'return',
      'return',
      node.loc?.start.line
    );
  }

  /**
   * Get call information (target class and method name)
   */
  private getCallInfo(
    callee: t.Expression | t.V8IntrinsicIdentifier
  ): { targetClass: string; methodName: string } | null {
    // Case 1: this.method() - call within same class
    if (t.isMemberExpression(callee)) {
      if (t.isThisExpression(callee.object)) {
        // this.method() - stays in same class
        if (t.isIdentifier(callee.property)) {
          return {
            targetClass: this.currentClass!,
            methodName: callee.property.name,
          };
        }
      } else if (t.isMemberExpression(callee.object)) {
        // this.property.method() - chained member expression
        // e.g., this.db.query()
        if (t.isThisExpression(callee.object.object) && t.isIdentifier(callee.object.property)) {
          const propertyName = callee.object.property.name;
          const methodName = t.isIdentifier(callee.property) ? callee.property.name : 'method';

          // Try to find the class of this property
          const targetClass = this.findClassForObject(propertyName);

          return {
            targetClass: targetClass || propertyName,
            methodName,
          };
        }
      } else if (t.isIdentifier(callee.object)) {
        // someObject.method() - call to another class instance
        const objectName = callee.object.name;
        const methodName = t.isIdentifier(callee.property) ? callee.property.name : 'method';

        // Try to find the class of this object
        const targetClass = this.findClassForObject(objectName);

        return {
          targetClass: targetClass || objectName,
          methodName,
        };
      }
    }

    // Case 2: ClassName.staticMethod() - static method call
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.object)) {
      const className = callee.object.name;
      const methodName = t.isIdentifier(callee.property) ? callee.property.name : 'method';

      // Check if this is a known class
      if (this.classes.has(className)) {
        return {
          targetClass: className,
          methodName,
        };
      }
    }

    // Case 3: functionName() - top-level function call
    if (t.isIdentifier(callee) && this.classes.size === 0) {
      // If this is a known top-level function, use it as the target
      if (this.topLevelFunctions.has(callee.name)) {
        return {
          targetClass: callee.name,
          methodName: callee.name, // For top-level functions, the function name is both the class and method
        };
      }
      // Fallback to Module if not a known function
      return {
        targetClass: 'Module',
        methodName: callee.name,
      };
    }

    // Case 4: new ClassName() - constructor call
    if (t.isNewExpression(callee) && t.isIdentifier(callee.callee)) {
      return {
        targetClass: callee.callee.name,
        methodName: 'constructor',
      };
    }

    return null;
  }

  /**
   * Check if a method call is on a built-in type
   * Returns true for built-in JavaScript/TypeScript types and their methods
   */
  private isBuiltInMethod(targetClass: string, methodName: string): boolean {
    // Don't filter out known user-defined classes or top-level functions
    if (this.classes.has(targetClass) || this.topLevelFunctions.has(targetClass)) {
      return false;
    }

    // Check if target class can be resolved to a known class (e.g., "db" -> "Database")
    const resolvedClass = this.findClassForObject(targetClass);
    if (resolvedClass && this.classes.has(resolvedClass)) {
      return false;
    }

    // Internal property names that should never create participants
    // These are common property names used in internal implementation
    const internalPropertyNames = new Set([
      'participants',
      'interactions',
      'classes',
      'entryPoints',
      'metadata',
      'properties',
      'methods',
      'relationships',
      'imports',
      'exports',
      'specifiers',
      'elements',
      'items',
      'nodes',
      'children',
      'child',
      'parent',
      'args',
      'params',
      'options',
      'config',
      'settings',
    ]);

    // Filter out internal property names immediately
    if (internalPropertyNames.has(targetClass.toLowerCase())) {
      return true;
    }

    // Common built-in methods that should be ignored
    const builtInMethods = new Set([
      'push',
      'pop',
      'shift',
      'unshift',
      'slice',
      'splice',
      'concat',
      'join',
      'map',
      'filter',
      'reduce',
      'forEach',
      'find',
      'findIndex',
      'some',
      'every',
      'includes',
      'indexOf',
      'lastIndexOf',
      'sort',
      'reverse',
      'set',
      'get',
      'has',
      'delete',
      'clear',
      'add',
      'values',
      'keys',
      'entries',
      'toString',
      'valueOf',
      'toJSON',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
    ]);

    // Common built-in type names (lowercase names that are commonly built-in types)
    const builtInTypeNames = new Set([
      'array',
      'map',
      'set',
      'console',
      'math',
      'json',
      'date',
      'regexp',
      'promise',
      'error',
      'arraybuffer',
      'dataview',
      'weakmap',
      'weakset',
    ]);

    // Check if target is a known built-in type and method is built-in
    const lowerTarget = targetClass.toLowerCase();
    if (builtInTypeNames.has(lowerTarget) && builtInMethods.has(methodName)) {
      return true;
    }

    // Filter out single-letter variable names (like 't', 'i', 'x', etc.)
    // These are almost never class names
    if (targetClass.length === 1) {
      return true;
    }

    // Filter out TypeScript/JavaScript type names that are commonly used as variables
    const commonTypeVariableNames = new Set([
      'typeann',
      'typeannotation',
      'node',
      'element',
      'item',
      'result',
      'data',
      'value',
      'obj',
      'arr',
      'str',
      'num',
      'bool',
      'fn',
      'func',
      'callback',
    ]);

    if (commonTypeVariableNames.has(lowerTarget)) {
      return true;
    }

    return false;
  }

  /**
   * Try to find the class type of an object variable
   * This is a simplified heuristic - looks for patterns like:
   * const obj = new ClassName()
   * this.obj = new ClassName()
   */
  private findClassForObject(objectName: string): string | null {
    // For now, return the capitalized object name as a heuristic
    // In a more sophisticated implementation, we'd track variable assignments
    const capitalized = objectName.charAt(0).toUpperCase() + objectName.slice(1);

    // Check if a class with this name exists
    if (this.classes.has(capitalized)) {
      return capitalized;
    }

    return null;
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
      return 'fn()';
    }
    if (t.isMemberExpression(node)) {
      if (t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
        return `${node.object.name}.${node.property.name}`;
      }
      return 'obj.prop';
    }
    return '...';
  }

  /**
   * Add a participant to the map
   */
  private addParticipant(
    name: string,
    type: 'class' | 'function' | 'module',
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
    this.interactions.push({
      from,
      to,
      message,
      type,
      lineNumber,
    });
  }
}
