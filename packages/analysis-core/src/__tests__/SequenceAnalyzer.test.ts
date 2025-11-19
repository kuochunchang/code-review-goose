import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '@babel/parser';
import { SequenceAnalyzer } from '../analyzers/SequenceAnalyzer.js';

describe('SequenceAnalyzer', () => {
  let analyzer: SequenceAnalyzer;

  beforeEach(() => {
    analyzer = new SequenceAnalyzer();
  });

  describe('analyze - class methods', () => {
    it('should identify class participants', () => {
      const code = `
        class UserService {
          getUser() {
            return { name: 'test' };
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('UserService');
      expect(result.participants[0].type).toBe('class');
    });

    it('should track method calls within same class', () => {
      const code = `
        class Service {
          methodA() {
            this.methodB();
          }
          methodB() {
            return true;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const methodBCall = result.interactions.find(
        (i) => i.from === 'Service' && i.to === 'Service' && i.message === 'methodB()'
      );
      expect(methodBCall).toBeDefined();
      expect(methodBCall?.type).toBe('sync');
    });

    it('should track method calls to other class instances', () => {
      const code = `
        class Controller {
          constructor(private service: UserService) {}

          execute() {
            this.service.getUser();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const serviceCall = result.interactions.find(
        (i) => i.from === 'Controller' && i.to === 'UserService' && i.message === 'getUser()'
      );
      expect(serviceCall).toBeDefined();
    });

    it('should track async method calls', () => {
      const code = `
        class Service {
          async fetchData() {
            await this.getData();
          }
          async getData() {
            return {};
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const asyncCall = result.interactions.find(
        (i) => i.from === 'Service' && i.to === 'Service' && i.type === 'async'
      );
      expect(asyncCall).toBeDefined();
    });

    it('should track method calls with arguments', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
          calculate() {
            this.add(1, 2);
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const addCall = result.interactions.find((i) => i.message === 'add(1, 2)');
      expect(addCall).toBeDefined();
    });

    it('should identify entry points', () => {
      const code = `
        class Service {
          publicMethod() {
            this.privateMethod();
          }
          privateMethod() {
            return true;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      expect(result.entryPoints).toContain('Service.publicMethod');
      expect(result.entryPoints).toContain('Service.privateMethod');
    });
  });

  describe('analyze - top-level functions', () => {
    it('should identify function participants', () => {
      const code = `
        function processData() {
          return true;
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('processData');
      expect(result.participants[0].type).toBe('function');
    });

    it('should track function to function calls', () => {
      const code = `
        function main() {
          helper();
        }
        function helper() {
          return true;
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const helperCall = result.interactions.find(
        (i) => i.from === 'main' && i.to === 'helper'
      );
      expect(helperCall).toBeDefined();
    });
  });

  describe('analyze - property type tracking', () => {
    it('should track property assignments with new instances', () => {
      const code = `
        class Service {
          db: Database;

          constructor() {
            this.db = new Database();
          }

          query() {
            this.db.execute();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const dbCall = result.interactions.find(
        (i) => i.from === 'Service' && i.to === 'Database' && i.message === 'execute()'
      );
      expect(dbCall).toBeDefined();
    });

    it('should track constructor parameter types', () => {
      const code = `
        class Controller {
          service: UserService;

          constructor(service: UserService) {
            this.service = service;
          }

          execute() {
            this.service.getUser();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const serviceCall = result.interactions.find(
        (i) => i.from === 'Controller' && i.to === 'UserService'
      );
      expect(serviceCall).toBeDefined();
    });
  });

  describe('analyze - import tracking', () => {
    it('should track imported classes', () => {
      const code = `
        import { UserService } from './services';

        class Controller {
          service: UserService;

          constructor() {
            this.service = new UserService();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      // UserService should be tracked even though it's imported
      const hasUserService = result.participants.some((p) => p.name === 'UserService');
      expect(hasUserService).toBe(true);
    });
  });

  describe('analyze - filtering built-in methods', () => {
    it('should filter out Array methods', () => {
      const code = `
        class Service {
          process() {
            const arr = [1, 2, 3];
            arr.push(4);
            arr.map(x => x * 2);
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      // Should not create participants for Array methods
      const hasArrayParticipant = result.participants.some(
        (p) => p.name.toLowerCase() === 'array'
      );
      expect(hasArrayParticipant).toBe(false);
    });

    it('should filter out console methods', () => {
      const code = `
        class Service {
          log() {
            console.log('test');
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const hasConsoleParticipant = result.participants.some(
        (p) => p.name.toLowerCase() === 'console'
      );
      expect(hasConsoleParticipant).toBe(false);
    });

    it('should filter out built-in type methods', () => {
      const code = `
        class Service {
          process() {
            const str = 'hello';
            str.toUpperCase();

            const num = 42;
            num.toString();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const hasStringParticipant = result.participants.some(
        (p) => p.name.toLowerCase() === 'string'
      );
      const hasNumberParticipant = result.participants.some(
        (p) => p.name.toLowerCase() === 'number'
      );
      expect(hasStringParticipant).toBe(false);
      expect(hasNumberParticipant).toBe(false);
    });
  });

  describe('analyze - complex scenarios', () => {
    it('should handle chained method calls', () => {
      const code = `
        class Service {
          db: Database;

          query() {
            this.db.connection.execute();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      // Should track the immediate property call
      expect(result.interactions.length).toBeGreaterThan(0);
    });

    it('should handle static method calls', () => {
      const code = `
        class MathUtils {
          static add(a, b) {
            return a + b;
          }
        }

        class Calculator {
          calculate() {
            MathUtils.add(1, 2);
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const staticCall = result.interactions.find(
        (i) => i.from === 'Calculator' && i.to === 'MathUtils' && i.message === 'add(1, 2)'
      );
      expect(staticCall).toBeDefined();
    });

    it('should handle return interactions', () => {
      const code = `
        class Service {
          process() {
            this.helper();
          }
          helper() {
            return true;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      const returnInteraction = result.interactions.find(
        (i) => i.from === 'Service' && i.to === 'Service' && i.type === 'return'
      );
      expect(returnInteraction).toBeDefined();
    });
  });

  describe('analyze - edge cases', () => {
    it('should handle empty class', () => {
      const code = `
        class EmptyClass {}
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('EmptyClass');
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle class with no method calls', () => {
      const code = `
        class SimpleClass {
          getValue() {
            return 42;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      expect(result.participants).toHaveLength(1);
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle files with no classes or functions', () => {
      const code = `
        const x = 1;
        const y = 2;
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      // Should create a Module participant as fallback
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('Module');
      expect(result.participants[0].type).toBe('module');
    });

    it('should handle interface declarations', () => {
      const code = `
        interface IService {
          getData(): void;
        }

        class Service implements IService {
          getData() {
            this.helper();
          }
          helper() {}
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);

      // Should only track the class, not the interface
      const serviceParticipant = result.participants.find((p) => p.name === 'Service');
      expect(serviceParticipant).toBeDefined();
      expect(serviceParticipant?.type).toBe('class');
    });
  });

  describe('analyze - literal and expression handling', () => {
    it('should handle boolean literals', () => {
      const code = `
        class Test {
          check() {
            return true;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle null literals', () => {
      const code = `
        class Test {
          getValue() {
            return null;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle array expressions', () => {
      const code = `
        class Test {
          getItems() {
            return [1, 2, 3];
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle object expressions', () => {
      const code = `
        class Test {
          getConfig() {
            return { key: 'value' };
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle arrow function expressions', () => {
      const code = `
        class Test {
          process() {
            const fn = () => {};
            fn();
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle call expressions', () => {
      const code = `
        class Test {
          process() {
            this.helper();
          }
          helper() {}
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });

    it('should handle member expressions', () => {
      const code = `
        class Test {
          process() {
            const obj = { prop: 'value' };
            return obj.prop;
          }
        }
      `;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const result = analyzer.analyze(ast);
      expect(result).toBeDefined();
    });
  });
});
