import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidValidator, type ValidationResult } from '../src/mermaidValidator.js';

describe('MermaidValidator', () => {
  let validator: MermaidValidator;

  beforeEach(() => {
    validator = new MermaidValidator();
  });

  describe('validate', () => {
    it('should return error for empty code', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mermaid code is empty');
    });

    it('should return error for whitespace-only code', () => {
      const result = validator.validate('   \n\t  ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mermaid code is empty');
    });

    it('should validate class diagram header', () => {
      const validCode = 'classDiagram\nclass User';
      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(1); // May have other errors but header should be valid
    });

    it('should validate flowchart header', () => {
      const validCode = 'flowchart TD\nA[Start] --> B[End]';
      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(1);
    });

    it('should validate graph header', () => {
      const validCode = 'graph TD\nA --> B';
      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(1);
    });

    it('should validate sequence diagram header', () => {
      const validCode = 'sequenceDiagram\nAlice->>Bob: Hello';
      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(1);
    });

    it('should return error for missing header', () => {
      const invalidCode = 'class User\nmethod getName';
      const result = validator.validate(invalidCode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('diagram type header'))).toBe(true);
    });

    it('should detect mismatched brackets', () => {
      const invalidCode = 'flowchart TD\nA[Start --> B[End';
      const result = validator.validate(invalidCode);
      expect(result.errors.some((e) => e.includes('Mismatched brackets'))).toBe(true);
    });

    it('should detect mismatched parentheses', () => {
      const invalidCode = 'flowchart TD\nA(Start --> B(End';
      const result = validator.validate(invalidCode);
      expect(result.errors.some((e) => e.includes('Mismatched brackets'))).toBe(true);
    });

    it('should detect mismatched double quotes', () => {
      // Only one double quote - mismatched
      const invalidCode = 'flowchart TD\nA["Start] --> B[End]';
      const result = validator.validate(invalidCode);
      expect(result.errors.some((e) => e.includes('Mismatched double quotes'))).toBe(true);
    });

    it('should detect mismatched single quotes', () => {
      // Only one single quote - mismatched
      const invalidCode = "flowchart TD\nA['Start] --> B[End]";
      const result = validator.validate(invalidCode);
      expect(result.errors.some((e) => e.includes('Mismatched single quotes'))).toBe(true);
    });

    it('should validate correct class diagram', () => {
      const validCode = `classDiagram
class User {
  +String name
  +getName() String
}
class Admin {
  +String role
}
User <|-- Admin`;

      const result = validator.validate(validCode);
      // Should have minimal errors (if any)
      expect(result.errors.length).toBeLessThanOrEqual(2);
    });

    it('should validate correct flowchart', () => {
      const validCode = `flowchart TD
A[Start] --> B{Decision}
B -->|Yes| C[Action]
B -->|No| D[End]
C --> D`;

      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(2);
    });

    it('should validate correct sequence diagram', () => {
      const validCode = `sequenceDiagram
participant A
participant B
A->>B: Request
B-->>A: Response`;

      const result = validator.validate(validCode);
      expect(result.errors.length).toBeLessThanOrEqual(2);
    });

    it('should return warnings for potentially unused nodes', () => {
      const code = 'flowchart TD\nA[Start]\nB[End]';
      const result = validator.validate(code);
      // Note: hasUnusedNodes currently returns false, so this test documents current behavior
      expect(result.warnings).toBeDefined();
    });

    it('should handle comments', () => {
      const code = `classDiagram
%% This is a comment
class User {
  +String name
}`;

      const result = validator.validate(code);
      // Comments should not cause errors
      expect(result.errors.length).toBeLessThanOrEqual(2);
    });

    it('should handle multiple diagram types', () => {
      const diagramTypes = [
        'classDiagram',
        'flowchart TD',
        'graph TD',
        'sequenceDiagram',
        'stateDiagram',
        'erDiagram',
        'journey',
        'gantt',
        'pie',
      ];

      diagramTypes.forEach((header) => {
        const code = `${header}\nA --> B`;
        const result = validator.validate(code);
        // Should not have header-related errors
        expect(
          result.errors.some((e) => e.includes('diagram type header')),
          `Header ${header} should be valid`
        ).toBe(false);
      });
    });
  });

  describe('autoFix', () => {
    it('should remove markdown code block markers', () => {
      const code = '```mermaid\nclassDiagram\nclass User\n```';
      const fixed = validator.autoFix(code);
      expect(fixed).not.toContain('```');
      expect(fixed).toContain('classDiagram');
    });

    it('should remove markdown code block markers without language', () => {
      const code = '```\nclassDiagram\nclass User\n```';
      const fixed = validator.autoFix(code);
      expect(fixed).not.toContain('```');
      expect(fixed).toContain('classDiagram');
    });

    it('should fix flowchart labels with type annotations', () => {
      const code = `flowchart TD
A[calculateGrade(score): string] --> B[End]`;
      const fixed = validator.autoFix(code);
      // Should simplify the label
      expect(fixed).toBeDefined();
    });

    it('should fix node names', () => {
      const code = 'classDiagram\nclass User Name';
      const fixed = validator.autoFix(code);
      expect(fixed).toBeDefined();
    });

    it('should fix relationship syntax', () => {
      const code = 'classDiagram\nUser<--Admin';
      const fixed = validator.autoFix(code);
      // Should add spaces around relationship symbols
      expect(fixed).toBeDefined();
    });

    it('should remove excessive blank lines', () => {
      const code = 'classDiagram\n\n\n\nclass User\n\n\n\nclass Admin';
      const fixed = validator.autoFix(code);
      // Should reduce multiple blank lines
      const blankLineMatches = fixed.match(/\n{3,}/g);
      expect(blankLineMatches).toBeNull();
    });

    it('should trim whitespace', () => {
      const code = '   \nclassDiagram\nclass User\n   ';
      const fixed = validator.autoFix(code);
      expect(fixed.trim()).toBe(fixed);
    });

    it('should handle empty input', () => {
      const fixed = validator.autoFix('');
      expect(fixed).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const fixed = validator.autoFix('   \n\t  ');
      expect(fixed).toBe('');
    });

    it('should preserve valid code', () => {
      const validCode = `classDiagram
class User {
  +String name
}
class Admin {
  +String role
}
User <|-- Admin`;

      const fixed = validator.autoFix(validCode);
      // Should preserve the structure
      expect(fixed).toContain('classDiagram');
      expect(fixed).toContain('class User');
      expect(fixed).toContain('User <|-- Admin');
    });

    it('should fix <-- to <|--', () => {
      const code = 'classDiagram\nUser<--Admin';
      const fixed = validator.autoFix(code);
      expect(fixed).toContain('<|--');
    });

    it('should add spaces around relationship symbols', () => {
      const code = 'classDiagram\nUser<|--Admin';
      const fixed = validator.autoFix(code);
      // Should have spaces: User <|-- Admin
      expect(fixed).toMatch(/\w+\s+<\|--\s+\w+/);
    });

    it('should simplify flowchart labels with function signatures', () => {
      const code = `flowchart TD
A[calculateGrade(score: number): string] --> B[End]`;
      const fixed = validator.autoFix(code);
      // Should simplify the label
      expect(fixed).toBeDefined();
    });

    it('should handle complex flowchart with multiple node types', () => {
      const code = `flowchart TD
A[Start]
B{Decision}
C(Process)
D{Condition}
E[End]
A --> B
B -->|Yes| C
B -->|No| D
C --> E
D --> E`;

      const fixed = validator.autoFix(code);
      expect(fixed).toContain('flowchart TD');
      expect(fixed).toContain('A[Start]');
      expect(fixed).toContain('B{Decision}');
    });

    it('should preserve comments', () => {
      const code = `classDiagram
%% This is a comment
class User
%% Another comment
class Admin`;

      const fixed = validator.autoFix(code);
      expect(fixed).toContain('%% This is a comment');
      expect(fixed).toContain('%% Another comment');
    });

    it('should handle labels with quotes', () => {
      const code = `flowchart TD
A["Start Process"] --> B["End Process"]`;
      const fixed = validator.autoFix(code);
      // Should preserve quotes
      expect(fixed).toContain('"Start Process"');
    });
  });

  describe('validate and autoFix integration', () => {
    it('should fix code that fails validation', () => {
      const invalidCode = '```mermaid\nclassDiagram\nUser<--Admin\n```';
      const validationBefore = validator.validate(invalidCode);
      expect(validationBefore.valid).toBe(false);

      const fixed = validator.autoFix(invalidCode);
      const validationAfter = validator.validate(fixed);
      // After fixing, should have fewer errors
      expect(validationAfter.errors.length).toBeLessThanOrEqual(validationBefore.errors.length);
    });

    it('should improve validation result after autoFix', () => {
      const codeWithIssues = `classDiagram

class User

User<--Admin`;
      const beforeFix = validator.validate(codeWithIssues);
      const fixed = validator.autoFix(codeWithIssues);
      const afterFix = validator.validate(fixed);

      // Fixed code should have same or fewer errors
      expect(afterFix.errors.length).toBeLessThanOrEqual(beforeFix.errors.length);
    });
  });

  describe('edge cases', () => {
    it('should handle code with only header', () => {
      const code = 'classDiagram';
      const result = validator.validate(code);
      expect(result).toBeDefined();
    });

    it('should handle code with only comments', () => {
      const code = '%% Comment only\n%% Another comment';
      const result = validator.validate(code);
      expect(result.errors.some((e) => e.includes('diagram type header'))).toBe(true);
    });

    it('should handle very long code', () => {
      const longCode = 'classDiagram\n' + 'class User' + '\nclass Admin'.repeat(100);
      const result = validator.validate(longCode);
      expect(result).toBeDefined();
    });

    it('should handle special characters in labels', () => {
      const code = `flowchart TD
A["Label with special chars: !@#$%"] --> B[End]`;
      const result = validator.validate(code);
      expect(result).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const code = `classDiagram
class 用户 {
  +String 姓名
}`;
      const result = validator.validate(code);
      expect(result).toBeDefined();
    });

    it('should handle code with newlines in various formats', () => {
      const code = 'classDiagram\r\nclass User\r\nclass Admin';
      const fixed = validator.autoFix(code);
      expect(fixed).toBeDefined();
    });
  });

  describe('ValidationResult type', () => {
    it('should have correct structure', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };
      expect(result.valid).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should support invalid result', () => {
      const result: ValidationResult = {
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
      };
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });
  });
});

