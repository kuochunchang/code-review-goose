/**
 * Debug field declaration structure
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

describe('Debug Field Declaration', () => {
  it('should inspect field with modifiers', () => {
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
    const rootNode = tree.rootNode;

    const classNode = rootNode.children.find((c) => c.type === 'class_declaration');
    if (classNode) {
      const bodyNode = classNode.children.find((c) => c.type === '{' || c.type === 'class_body');
      if (bodyNode) {
        const fields = bodyNode.children.filter((c: any) => c.type === 'field_declaration');
        fields.forEach((field: any) => {
          console.log('\nField:', field.text.substring(0, 50));
          console.log('Field children:', field.children.map((c: any) => `${c.type}: ${c.text.substring(0, 20)}`));
        });
      }
    }
  });
});
