/**
 * Debug test to inspect tree-sitter Java AST structure
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

describe('Debug Java AST Structure', () => {
  it('should inspect simple class AST', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `
      public class User {
        private String name;
        public int age;
      }
    `;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    console.log('Root node type:', rootNode.type);
    console.log('Root node children:', rootNode.children.map((c) => c.type));

    // Find class declaration
    const findClass = (node: any): any => {
      if (node.type === 'class_declaration') {
        return node;
      }
      for (const child of node.children) {
        const found = findClass(child);
        if (found) return found;
      }
      return null;
    };

    const classNode = findClass(rootNode);
    if (classNode) {
      console.log('\nClass node fields:');
      console.log('name:', classNode.childForFieldName('name')?.text);
      console.log('superclass:', classNode.childForFieldName('superclass')?.text);
      console.log('interfaces:', classNode.childForFieldName('interfaces')?.text);
      console.log('body:', classNode.childForFieldName('body')?.children.map((c: any) => c.type));

      const bodyNode = classNode.childForFieldName('body');
      if (bodyNode) {
        console.log('\nBody children:');
        bodyNode.children.forEach((child: any) => {
          console.log(`  - ${child.type}:`, child.text.substring(0, 50));
        });
      }
    }
  });

  it('should inspect import AST', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `import java.util.List;`;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    console.log('\nImport node:');
    const importNode = rootNode.children.find((c) => c.type === 'import_declaration');
    if (importNode) {
      console.log('Import fields:', Object.keys(importNode));
      console.log('Import children:', importNode.children.map((c: any) => c.type));
      console.log('Import text:', importNode.text);
    }
  });
});
