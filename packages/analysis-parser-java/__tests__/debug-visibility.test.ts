/**
 * Debug visibility extraction
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import { JavaASTConverter } from '../src/JavaASTConverter.js';

describe('Debug Visibility', () => {
  it('should extract modifiers correctly', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `
      public class User {
        private String name;
        protected int age;
        public String email;
      }
    `;

    const tree = parser.parse(code);
    const converter = new JavaASTConverter();
    const ast = converter.convert(tree.rootNode, 'User.java');

    console.log('\nProperties:');
    ast.classes[0].properties.forEach((prop) => {
      console.log(`  ${prop.name}: ${prop.visibility}`);
    });
  });
});
