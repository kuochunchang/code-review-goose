/**
 * Debug modifiers extraction
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

describe('Debug Modifiers', () => {
  it('should inspect modifiers field', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `
      class User {
        private String name;
      }
    `;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    const classNode = rootNode.children.find((c: any) => c.type === 'class_declaration');
    if (classNode) {
      const bodyNode = classNode.children.find((c: any) => c.type === '{' || c.type === 'class_body');
      if (bodyNode) {
        const fieldNode = bodyNode.children.find((c: any) => c.type === 'field_declaration');
        if (fieldNode) {
          console.log('Field node type:', fieldNode.type);
          console.log('Has modifiers field:', !!fieldNode.childForFieldName('modifiers'));
          console.log('Field children:', fieldNode.children.map((c: any) => `${c.type}: ${c.text.substring(0, 20)}`));
          
          const modifiersNode = fieldNode.childForFieldName('modifiers');
          if (modifiersNode) {
            console.log('Modifiers node children:', modifiersNode.children.map((c: any) => `${c.type}: ${c.text}`));
          } else {
            console.log('No modifiers field, checking direct children:');
            fieldNode.children.forEach((c: any) => {
              if (c.type === 'modifiers' || c.type === 'modifier') {
                console.log(`  Found ${c.type}: ${c.text}`);
                console.log(`    Children:`, c.children?.map((cc: any) => `${cc.type}: ${cc.text}`));
              }
            });
          }
        }
      }
    }
  });
});
