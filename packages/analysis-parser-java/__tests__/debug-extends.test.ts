/**
 * Debug extends and implements
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

describe('Debug Extends and Implements', () => {
  it('should inspect extends AST', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `class Dog extends Animal {}`;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    const classNode = rootNode.children.find((c) => c.type === 'class_declaration');
    if (classNode) {
      console.log('Class children:', classNode.children.map((c: any) => `${c.type}: ${c.text.substring(0, 30)}`));
    }
  });

  it('should inspect implements AST', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `class Dog implements IAnimal {}`;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    const classNode = rootNode.children.find((c) => c.type === 'class_declaration');
    if (classNode) {
      console.log('Class children:', classNode.children.map((c: any) => `${c.type}: ${c.text.substring(0, 30)}`));
    }
  });
});
