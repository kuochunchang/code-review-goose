/**
 * Unit tests for SequenceAnalysisService
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { SequenceAnalysisService } from '../../../services/sequenceAnalysisService.js';

describe('SequenceAnalysisService', () => {
  const parseCode = (code: string) => {
    return parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
    });
  };

  describe('analyze', () => {
    it('should identify class participants', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
        }

        class Display {
          show(value) {
            console.log(value);
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('Calculator');
      expect(result.participants.map((p) => p.name)).toContain('Display');
      expect(result.participants.find((p) => p.name === 'Calculator')?.type).toBe('class');
      expect(result.participants.find((p) => p.name === 'Display')?.type).toBe('class');
    });

    it('should use separate participants for top-level functions', () => {
      const code = `
        function greet() {
          return "Hello";
        }

        function main() {
          greet();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Top-level functions should each be a separate participant
      expect(result.participants).toHaveLength(2);
      expect(result.participants.map((p) => p.name)).toContain('greet');
      expect(result.participants.map((p) => p.name)).toContain('main');
      expect(result.participants.find((p) => p.name === 'greet')?.type).toBe('function');
      expect(result.participants.find((p) => p.name === 'main')?.type).toBe('function');
    });

    it('should track method calls between classes', () => {
      const code = `
        class Service {
          query() {
            return 'data';
          }
        }

        class Controller {
          handle() {
            const service = new Service();
            service.query();
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should have interactions between Controller and Service
      const queryCall = result.interactions.find(
        (i) => i.from === 'Controller' && i.message.includes('query')
      );

      expect(queryCall).toBeDefined();
      expect(queryCall?.type).toBe('sync');
    });

    it('should track this.method() calls within same class', () => {
      const code = `
        class Service {
          process() {
            this.validate();
          }

          validate() {
            return true;
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // this.validate() should show Service calling itself
      const validateCall = result.interactions.find(
        (i) => i.from === 'Service' && i.to === 'Service' && i.message.includes('validate')
      );

      expect(validateCall).toBeDefined();
      expect(validateCall?.type).toBe('sync');
    });

    it('should track async method calls', () => {
      const code = `
        class Database {
          async query() {
            return { data: 'value' };
          }
        }

        class Service {
          async fetch() {
            const db = new Database();
            await db.query();
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const asyncCall = result.interactions.find(
        (i) => i.from === 'Service' && i.message.includes('query')
      );

      expect(asyncCall).toBeDefined();
      expect(asyncCall?.type).toBe('async');
    });

    it('should track return interactions', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
        }

        class App {
          run() {
            const calc = new Calculator();
            calc.add(1, 2);
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should have both call and return interactions
      const returnInteractions = result.interactions.filter((i) => i.type === 'return');

      expect(returnInteractions.length).toBeGreaterThan(0);
    });

    it('should handle method calls with arguments', () => {
      const code = `
        class Math {
          add(a, b) {
            return a + b;
          }
        }

        class Calculator {
          compute() {
            const math = new Math();
            math.add(5, 10);
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const callInteraction = result.interactions.find(
        (i) => i.from === 'Calculator' && i.message.includes('add')
      );

      expect(callInteraction).toBeDefined();
      expect(callInteraction?.message).toContain('5');
      expect(callInteraction?.message).toContain('10');
    });

    it('should identify entry points (class methods)', () => {
      const code = `
        class Application {
          start() {
            this.initialize();
          }

          initialize() {
            return 'initialized';
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // All public methods are entry points
      expect(result.entryPoints.length).toBeGreaterThan(0);
      expect(result.entryPoints.some((e) => e.includes('Application'))).toBe(true);
    });

    it('should handle nested method calls', () => {
      const code = `
        class A {
          method() {
            const b = new B();
            b.method();
          }
        }

        class B {
          method() {
            const c = new C();
            c.method();
          }
        }

        class C {
          method() {
            return 'done';
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should have interactions: A->B, B->C
      expect(result.interactions.length).toBeGreaterThan(0);
      expect(result.interactions.some((i) => i.from === 'A' && i.message.includes('method'))).toBe(true);
      expect(result.interactions.some((i) => i.from === 'B' && i.message.includes('method'))).toBe(true);
    });

    it('should handle empty code gracefully', () => {
      const code = ``;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should create Module participant for empty code
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('Module');
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle code with no method calls', () => {
      const code = `
        class Data {
          constructor() {
            this.value = 42;
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should have Data participant but no interactions
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].name).toBe('Data');
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle TypeScript class with this.property.method() calls', () => {
      const code = `
        class Database {
          query() {
            return [];
          }
        }

        class UserService {
          constructor() {
            this.db = new Database();
          }

          getUsers() {
            return this.db.query();
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('Database');
      expect(result.participants.map((p) => p.name)).toContain('UserService');

      // Should have call from UserService to db.query()
      const dbCall = result.interactions.find(
        (i) => i.from === 'UserService' && i.message.includes('query')
      );
      expect(dbCall).toBeDefined();
    });
  });
});
