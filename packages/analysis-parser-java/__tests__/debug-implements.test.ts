/**
 * Debug implements extraction
 */

import { describe, it } from 'vitest';
import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';

describe('Debug Implements', () => {
  it('should inspect super_interfaces field', () => {
    const parser = new Parser();
    parser.setLanguage(Java);

    const code = `class Dog implements IAnimal {}`;

    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    const classNode = rootNode.children.find((c: any) => c.type === 'class_declaration');
    if (classNode) {
      console.log('Class children:', classNode.children.map((c: any) => `${c.type}: ${c.text.substring(0, 30)}`));
      
      const superInterfacesNode = classNode.children.find((c: any) => c.type === 'super_interfaces');
      console.log('Has super_interfaces node:', !!superInterfacesNode);
      if (superInterfacesNode) {
        console.log('super_interfaces text:', superInterfacesNode.text);
        console.log('super_interfaces children:', superInterfacesNode.children.map((c: any) => `${c.type}: ${c.text.substring(0, 30)}`));
      }
    }
  });
});
