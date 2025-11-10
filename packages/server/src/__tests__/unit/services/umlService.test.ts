import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UMLService } from '../../../services/umlService.js';
import type { AIService } from '../../../services/aiService.js';
import type { ProjectConfig } from '../../../types/config.js';

describe('UMLService', () => {
  let umlService: UMLService;
  let mockAIService: Partial<AIService>;

  beforeEach(() => {
    mockAIService = {
      getProvider: vi.fn(),
    };
  });

  describe('Constructor', () => {
    it('should create instance without AI service', () => {
      umlService = new UMLService();
      expect(umlService).toBeDefined();
    });

    it('should create instance with AI service', () => {
      umlService = new UMLService(mockAIService as AIService);
      expect(umlService).toBeDefined();
    });

    it('should create instance with config', () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'hybrid',
          aiOptions: {
            enabledTypes: ['class', 'flowchart'],
            maxRetries: 3,
            autoFixSyntax: true,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);
      expect(umlService).toBeDefined();
    });
  });

  describe('generateDiagram - Native Mode', () => {
    beforeEach(() => {
      umlService = new UMLService();
    });

    it('should generate class diagram for simple class', async () => {
      const code = `
        class User {
          name: string;
          age: number;

          constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
          }

          greet(): void {
            console.log('Hello');
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.type).toBe('class');
      expect(result.generationMode).toBe('native');
      expect(result.mermaidCode).toContain('classDiagram');
      expect(result.mermaidCode).toContain('class User');
      expect(result.mermaidCode).toContain('+name string');
      expect(result.mermaidCode).toContain('+age number');
      expect(result.mermaidCode).toContain('+greet() void');
      expect(result.metadata?.classes).toHaveLength(1);
      expect(result.metadata?.classes?.[0].name).toBe('User');
    });

    it('should generate class diagram with inheritance', async () => {
      const code = `
        class Animal {
          name: string;
        }

        class Dog extends Animal {
          bark(): void {}
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('Animal <|-- Dog');
      expect(result.metadata?.classes).toHaveLength(2);
    });

    it('should generate class diagram with interface implementation', async () => {
      const code = `
        interface Flyable {
          fly(): void;
        }

        class Bird implements Flyable {
          fly(): void {}
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('<<interface>>');
      expect(result.mermaidCode).toContain('Flyable <|.. Bird');
      expect(result.metadata?.classes).toHaveLength(2);
    });

    it('should generate class diagram with private and protected members', async () => {
      const code = `
        class SecureClass {
          private secret: string;
          protected internal: number;
          public open: boolean;

          private doPrivate(): void {}
          protected doProtected(): void {}
          public doPublic(): void {}
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('-secret string');
      expect(result.mermaidCode).toContain('#internal number');
      expect(result.mermaidCode).toContain('+open boolean');
    });

    it('should generate class diagram with array types', async () => {
      const code = `
        class Container {
          items: string[];
          numbers: number[];
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      // Array types should be preserved as "type[]"
      expect(result.mermaidCode).toContain('Container');
      expect(result.mermaidCode).toContain('items');
      expect(result.mermaidCode).toContain('numbers');
    });

    it('should generate class diagram with methods having parameters', async () => {
      const code = `
        class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }

          multiply(x: number, y: number): number {
            return x * y;
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('add(number a, number b) number');
      expect(result.mermaidCode).toContain('multiply(number x, number y) number');
    });

    it('should generate flowchart for simple function', async () => {
      const code = `
        function greet() {
          console.log('Hello');
          return 'done';
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.type).toBe('flowchart');
      expect(result.generationMode).toBe('native');
      expect(result.mermaidCode).toContain('flowchart TD');
      expect(result.mermaidCode).toContain('Start: greet');
      expect(result.metadata?.functions).toContain('greet');
    });

    it('should generate flowchart with if statement', async () => {
      const code = `
        function checkAge(age: number) {
          if (age > 18) {
            console.log('Adult');
          } else {
            console.log('Minor');
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Condition');
      expect(result.mermaidCode).toContain('Yes');
      expect(result.mermaidCode).toContain('No');
    });

    it('should generate flowchart with loop', async () => {
      const code = `
        function countToTen() {
          for (let i = 0; i < 10; i++) {
            console.log(i);
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('For loop');
      expect(result.mermaidCode).toContain('Continue');
    });

    it('should generate flowchart with while loop', async () => {
      const code = `
        function waitForCondition() {
          while (true) {
            break;
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('While loop');
    });

    it('should generate flowchart for arrow function', async () => {
      const code = `
        const myFunc = () => {
          console.log('Arrow function');
        };
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('myFunc');
    });

    it('should generate flowchart for class method', async () => {
      const code = `
        class MyClass {
          myMethod() {
            return true;
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.metadata?.functions).toContain('myMethod');
    });

    it('should generate simple flowchart when no functions found', async () => {
      const code = `
        const x = 1;
        const y = 2;
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Code execution');
    });

    it('should throw error for sequence diagram in native mode', async () => {
      const code = 'class Test {}';

      await expect(umlService.generateDiagram(code, 'sequence')).rejects.toThrow(
        'Native mode does not support sequence diagrams'
      );
    });

    it('should throw error for dependency diagram in native mode', async () => {
      const code = 'class Test {}';

      await expect(umlService.generateDiagram(code, 'dependency')).rejects.toThrow(
        'Native mode does not support dependency diagrams'
      );
    });

    it('should handle parsing errors gracefully', async () => {
      const code = 'this is not valid code {{{';

      await expect(umlService.generateDiagram(code, 'class')).rejects.toThrow(
        'Code parsing failed'
      );
    });
  });

  describe('generateDiagram - AI Mode', () => {
    let mockProvider: any;

    beforeEach(() => {
      mockProvider = {
        generateDiagram: vi.fn(),
      };
      mockAIService.getProvider = vi.fn().mockResolvedValue(mockProvider);
    });

    it('should generate diagram using AI when mode is ai', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'ai',
          aiOptions: {
            enabledTypes: ['class'],
            maxRetries: 1,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);

      mockProvider.generateDiagram.mockResolvedValue({
        success: true,
        mermaidCode: 'classDiagram\n  class Test',
        metadata: {},
      });

      const result = await umlService.generateDiagram('class Test {}', 'class');

      expect(result.generationMode).toBe('ai');
      expect(mockProvider.generateDiagram).toHaveBeenCalled();
    });

    it('should retry AI generation on failure', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'ai',
          aiOptions: {
            enabledTypes: ['class'],
            maxRetries: 2,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);

      mockProvider.generateDiagram
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({
          success: true,
          mermaidCode: 'classDiagram\n  class Test',
        });

      const result = await umlService.generateDiagram('class Test {}', 'class');

      expect(result.generationMode).toBe('ai');
      expect(mockProvider.generateDiagram).toHaveBeenCalledTimes(3);
    });

    it('should fall back to native when AI fails', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'ai',
          aiOptions: {
            enabledTypes: ['class'],
            maxRetries: 1,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);

      mockProvider.generateDiagram.mockRejectedValue(new Error('AI failed'));

      const result = await umlService.generateDiagram('class Test {}', 'class');

      expect(result.generationMode).toBe('native');
    });

    it('should fall back to native when AI service is not available', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'ai',
          aiOptions: {
            enabledTypes: ['class'],
          },
        },
      };
      umlService = new UMLService(undefined, config);

      // Should fall back to native since AI is not available
      const result = await umlService.generateDiagram('class Test {}', 'class');
      expect(result.generationMode).toBe('native');
    });
  });

  describe('generateDiagram - Hybrid Mode', () => {
    let mockProvider: any;

    beforeEach(() => {
      mockProvider = {
        generateDiagram: vi.fn(),
      };
      mockAIService.getProvider = vi.fn().mockResolvedValue(mockProvider);
    });

    it('should use AI first in hybrid mode', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'hybrid',
          aiOptions: {
            enabledTypes: ['class'],
            maxRetries: 1,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);

      mockProvider.generateDiagram.mockResolvedValue({
        success: true,
        mermaidCode: 'classDiagram\n  class Test',
      });

      const result = await umlService.generateDiagram('class Test {}', 'class');

      expect(result.generationMode).toBe('hybrid');
      expect(mockProvider.generateDiagram).toHaveBeenCalled();
    });

    it('should fall back to native when AI fails in hybrid mode', async () => {
      const config: ProjectConfig = {
        aiProvider: 'openai',
        ignorePatterns: [],
        projectPath: '/test',
        uml: {
          generationMode: 'hybrid',
          aiOptions: {
            enabledTypes: ['class'],
            maxRetries: 1,
          },
        },
      };
      umlService = new UMLService(mockAIService as AIService, config);

      mockProvider.generateDiagram.mockRejectedValue(new Error('AI failed'));

      const result = await umlService.generateDiagram('class Test {}', 'class');

      expect(result.generationMode).toBe('hybrid');
      expect(result.metadata?.fallbackReason).toContain('AI failed');
    });
  });

  describe('Interface Handling', () => {
    beforeEach(() => {
      umlService = new UMLService();
    });

    it('should handle interface with extends', async () => {
      const code = `
        interface Base {
          id: number;
        }

        interface Extended extends Base {
          name: string;
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.metadata?.classes).toHaveLength(2);
      expect(result.mermaidCode).toContain('Base <|-- Extended');
    });

    it('should handle interface with methods', async () => {
      const code = `
        interface Service {
          get(id: string): Promise<any>;
          create(data: any): Promise<any>;
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('get(');
      expect(result.mermaidCode).toContain('create(');
    });
  });

  describe('Complex Type Handling', () => {
    beforeEach(() => {
      umlService = new UMLService();
    });

    it('should handle void return type', async () => {
      const code = `
        class Test {
          method(): void {}
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('void');
    });

    it('should handle any type', async () => {
      const code = `
        class Test {
          data: any;
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('any');
    });

    it('should handle boolean type', async () => {
      const code = `
        class Test {
          flag: boolean;
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('boolean');
    });

    it('should handle custom type references', async () => {
      const code = `
        class Test {
          user: User;
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('User');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      umlService = new UMLService();
    });

    it('should handle empty class', async () => {
      const code = 'class Empty {}';

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('class Empty');
      expect(result.metadata?.classes?.[0].properties).toHaveLength(0);
      expect(result.metadata?.classes?.[0].methods).toHaveLength(0);
    });

    it('should handle class with only constructor', async () => {
      const code = `
        class Test {
          constructor() {}
        }
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('class Test');
    });

    it('should handle multiple interfaces', async () => {
      const code = `
        interface A {}
        interface B {}
        interface C {}
      `;

      const result = await umlService.generateDiagram(code, 'class');

      expect(result.metadata?.classes).toHaveLength(3);
    });

    it('should handle return statement in flowchart', async () => {
      const code = `
        function test() {
          const x = 1;
          return x;
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Return');
    });

    it('should handle try-catch in flowchart', async () => {
      const code = `
        function test() {
          try {
            doSomething();
          } catch (e) {
            console.error(e);
          }
        }
      `;

      const result = await umlService.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Try-catch');
    });
  });
});
