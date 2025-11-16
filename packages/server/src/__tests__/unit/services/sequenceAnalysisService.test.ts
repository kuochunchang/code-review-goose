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
    it('should identify function participants', () => {
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

      expect(result.participants).toHaveLength(2);
      expect(result.participants.map((p) => p.name)).toContain('greet');
      expect(result.participants.map((p) => p.name)).toContain('main');
      expect(result.participants.find((p) => p.name === 'greet')?.type).toBe('function');
    });

    it('should identify class participants', () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }
        }

        const calc = new Calculator();
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('Calculator');
      expect(result.participants.find((p) => p.name === 'Calculator')?.type).toBe('class');
    });

    it('should identify arrow function participants', () => {
      const code = `
        const multiply = (a, b) => a * b;
        const calculate = () => multiply(2, 3);
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('multiply');
      expect(result.participants.map((p) => p.name)).toContain('calculate');
    });

    it('should identify object participants', () => {
      const code = `
        const api = {
          fetch() {
            return 'data';
          }
        };
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('api');
      expect(result.participants.find((p) => p.name === 'api')?.type).toBe('object');
    });

    it('should track simple function calls', () => {
      const code = `
        function helper() {
          return 42;
        }

        function main() {
          helper();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Each function call generates 2 interactions: call + return
      expect(result.interactions).toHaveLength(2);

      const callInteraction = result.interactions.find((i) => i.type === 'sync');
      expect(callInteraction).toBeDefined();
      expect(callInteraction?.from).toBe('main');
      expect(callInteraction?.to).toBe('helper');
      expect(callInteraction?.message).toContain('helper');

      const returnInteraction = result.interactions.find((i) => i.type === 'return');
      expect(returnInteraction).toBeDefined();
      expect(returnInteraction?.from).toBe('helper');
      expect(returnInteraction?.to).toBe('main');
    });

    it('should track method calls on classes', () => {
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

      const processValidateCall = result.interactions.find(
        (i) => i.from === 'Service.process' && i.to.includes('validate')
      );

      expect(processValidateCall).toBeDefined();
      expect(processValidateCall?.type).toBe('sync');
    });

    it('should track async function calls', () => {
      const code = `
        async function fetchData() {
          return { data: 'value' };
        }

        async function main() {
          await fetchData();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const asyncCall = result.interactions.find(
        (i) => i.from === 'main' && i.to === 'fetchData'
      );

      expect(asyncCall).toBeDefined();
      expect(asyncCall?.type).toBe('async');
    });

    it('should track return statements', () => {
      const code = `
        function calculate() {
          return 42;
        }

        function main() {
          calculate();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Should have both call and return interactions
      const returnInteractions = result.interactions.filter((i) => i.type === 'return');

      expect(returnInteractions.length).toBeGreaterThan(0);
      expect(returnInteractions.some((i) => i.from === 'calculate' && i.to === 'main')).toBe(true);
    });

    it('should handle calls with arguments', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }

        function main() {
          add(5, 10);
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const callInteraction = result.interactions.find(
        (i) => i.from === 'main' && i.to === 'add'
      );

      expect(callInteraction).toBeDefined();
      expect(callInteraction?.message).toContain('5');
      expect(callInteraction?.message).toContain('10');
    });

    it('should handle member expressions (obj.method)', () => {
      const code = `
        const utils = {
          log(msg) {
            console.log(msg);
          }
        };

        function main() {
          utils.log('Hello');
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const methodCall = result.interactions.find((i) => i.to.includes('utils'));

      expect(methodCall).toBeDefined();
      expect(methodCall?.message).toContain('log');
    });

    it('should identify entry points (top-level functions)', () => {
      const code = `
        export function main() {
          helper();
        }

        function helper() {
          return 'help';
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.entryPoints).toContain('main');
    });

    it('should handle nested function calls', () => {
      const code = `
        function c() {
          return 3;
        }

        function b() {
          return c();
        }

        function a() {
          return b();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Each call generates 2 interactions (call + return): a->b, b->a, b->c, c->b
      expect(result.interactions.length).toBeGreaterThanOrEqual(4);
      expect(result.interactions.some((i) => i.from === 'a' && i.to === 'b')).toBe(true);
      expect(result.interactions.some((i) => i.from === 'b' && i.to === 'c')).toBe(true);
      expect(result.interactions.some((i) => i.from === 'b' && i.to === 'a' && i.type === 'return')).toBe(true);
      expect(result.interactions.some((i) => i.from === 'c' && i.to === 'b' && i.type === 'return')).toBe(true);
    });

    it('should avoid self-calls', () => {
      const code = `
        function recursive(n) {
          if (n > 0) {
            recursive(n - 1);
          }
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      // Self-calls should be filtered out
      const selfCall = result.interactions.find(
        (i) => i.from === 'recursive' && i.to === 'recursive'
      );

      expect(selfCall).toBeUndefined();
    });

    it('should handle empty code gracefully', () => {
      const code = ``;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants).toHaveLength(0);
      expect(result.interactions).toHaveLength(0);
      expect(result.entryPoints).toHaveLength(0);
    });

    it('should handle code with no function calls', () => {
      const code = `
        const x = 42;
        const y = "hello";
        let z = true;
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants).toHaveLength(0);
      expect(result.interactions).toHaveLength(0);
    });

    it('should handle TypeScript class with constructor dependency injection', () => {
      const code = `
        class Database {
          query() {
            return [];
          }
        }

        class UserService {
          constructor(private db: Database) {}

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

      const dbCall = result.interactions.find((i) => i.to.includes('query'));
      expect(dbCall).toBeDefined();
    });

    it('should handle complex expressions as arguments', () => {
      const code = `
        function process(data) {
          return data;
        }

        function main() {
          process({ key: 'value', items: [1, 2, 3] });
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      const call = result.interactions.find((i) => i.from === 'main' && i.to === 'process');

      expect(call).toBeDefined();
      expect(call?.message).toContain('process');
    });

    it('should handle chained method calls', () => {
      const code = `
        class Builder {
          setName(name) {
            return this;
          }

          setAge(age) {
            return this;
          }

          build() {
            return {};
          }
        }

        function main() {
          const builder = new Builder();
          builder.setName('John').setAge(30).build();
        }
      `;

      const ast = parseCode(code);
      const service = new SequenceAnalysisService();
      const result = service.analyze(ast);

      expect(result.participants.map((p) => p.name)).toContain('Builder');
      expect(result.interactions.length).toBeGreaterThan(0);
    });
  });
});
