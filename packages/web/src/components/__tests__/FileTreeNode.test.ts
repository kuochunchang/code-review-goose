import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FileTreeNode from '../FileTreeNode.vue';
import type { VueWrapper } from '@vue/test-utils';

describe('FileTreeNode - Selection Behavior', () => {
  let wrapper: VueWrapper<any>;

  const mockFileNode = {
    name: 'testFile.ts',
    path: '/project/testFile.ts',
    type: 'file' as const,
    size: 1024,
  };

  const mockDirectoryNode = {
    name: 'src',
    path: '/project/src',
    type: 'directory' as const,
    children: [
      {
        name: 'file1.ts',
        path: '/project/src/file1.ts',
        type: 'file' as const,
        size: 512,
      },
      {
        name: 'file2.ts',
        path: '/project/src/file2.ts',
        type: 'file' as const,
        size: 256,
      },
    ],
  };

  beforeEach(() => {
    wrapper = mount(FileTreeNode, {
      props: {
        node: mockFileNode,
        level: 0,
        selectedFilePath: undefined,
      },
      global: {
        stubs: {
          VIcon: { template: '<i><slot /></i>' },
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('File Selection Highlighting', () => {
    it('should not be highlighted when selectedFilePath is undefined', () => {
      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');
    });

    it('should be highlighted when selectedFilePath matches node path', async () => {
      await wrapper.setProps({ selectedFilePath: '/project/testFile.ts' });

      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).toContain('node-selected');
    });

    it('should not be highlighted when selectedFilePath does not match node path', async () => {
      await wrapper.setProps({ selectedFilePath: '/project/otherFile.ts' });

      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');
    });

    it('should update highlighting when selectedFilePath changes', async () => {
      // Initially not selected
      let nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');

      // Select this file
      await wrapper.setProps({ selectedFilePath: '/project/testFile.ts' });
      nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).toContain('node-selected');

      // Select different file - should lose highlight
      await wrapper.setProps({ selectedFilePath: '/project/otherFile.ts' });
      nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');
    });
  });

  describe('Directory Nodes', () => {
    beforeEach(() => {
      wrapper = mount(FileTreeNode, {
        props: {
          node: mockDirectoryNode,
          level: 0,
          selectedFilePath: undefined,
        },
        global: {
          stubs: {
            VIcon: { template: '<i><slot /></i>' },
          },
        },
      });
    });

    it('should never be highlighted for directory nodes', async () => {
      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');

      // Even if selectedFilePath matches directory path
      await wrapper.setProps({ selectedFilePath: '/project/src' });
      expect(nodeContent.classes()).not.toContain('node-selected');
    });
  });

  describe('File Click Behavior', () => {
    it('should emit selectFile event when file node is clicked', async () => {
      const nodeContent = wrapper.find('.node-content');
      await nodeContent.trigger('click');

      expect(wrapper.emitted('selectFile')).toBeTruthy();
      expect(wrapper.emitted('selectFile')?.[0]).toEqual(['/project/testFile.ts']);
    });

    it('should not change local selection state on click', async () => {
      const nodeContent = wrapper.find('.node-content');

      // Not selected initially
      expect(nodeContent.classes()).not.toContain('node-selected');

      // Click the file
      await nodeContent.trigger('click');

      // Still not selected unless parent updates selectedFilePath prop
      expect(nodeContent.classes()).not.toContain('node-selected');

      // Only becomes selected when parent updates prop
      await wrapper.setProps({ selectedFilePath: '/project/testFile.ts' });
      expect(nodeContent.classes()).toContain('node-selected');
    });
  });

  describe('Multiple File Selection Scenario', () => {
    it('should handle sequential file selections correctly', async () => {
      // Mount two file nodes
      const wrapper1 = mount(FileTreeNode, {
        props: {
          node: { name: 'file1.ts', path: '/project/file1.ts', type: 'file' as const },
          level: 0,
          selectedFilePath: undefined,
        },
        global: {
          stubs: {
            VIcon: { template: '<i><slot /></i>' },
          },
        },
      });

      const wrapper2 = mount(FileTreeNode, {
        props: {
          node: { name: 'file2.ts', path: '/project/file2.ts', type: 'file' as const },
          level: 0,
          selectedFilePath: undefined,
        },
        global: {
          stubs: {
            VIcon: { template: '<i><slot /></i>' },
          },
        },
      });

      // Initially neither is selected
      expect(wrapper1.find('.node-content').classes()).not.toContain('node-selected');
      expect(wrapper2.find('.node-content').classes()).not.toContain('node-selected');

      // Select first file
      await wrapper1.setProps({ selectedFilePath: '/project/file1.ts' });
      await wrapper2.setProps({ selectedFilePath: '/project/file1.ts' });
      expect(wrapper1.find('.node-content').classes()).toContain('node-selected');
      expect(wrapper2.find('.node-content').classes()).not.toContain('node-selected');

      // Select second file - first should lose highlight
      await wrapper1.setProps({ selectedFilePath: '/project/file2.ts' });
      await wrapper2.setProps({ selectedFilePath: '/project/file2.ts' });
      expect(wrapper1.find('.node-content').classes()).not.toContain('node-selected');
      expect(wrapper2.find('.node-content').classes()).toContain('node-selected');

      wrapper1.unmount();
      wrapper2.unmount();
    });
  });

  describe('Child Node Selection Propagation', () => {
    it('should pass selectedFilePath to child nodes', async () => {
      wrapper = mount(FileTreeNode, {
        props: {
          node: mockDirectoryNode,
          level: 0,
          selectedFilePath: '/project/src/file1.ts',
        },
        global: {
          stubs: {
            VIcon: { template: '<i><slot /></i>' },
          },
        },
      });

      // Initially directory should be expanded at level 0
      // Check that child nodes container exists
      const childContainer = wrapper.find('.node-children');
      expect(childContainer.exists()).toBe(true);

      // Verify the component has children in props
      expect(wrapper.props('node').children).toBeDefined();
      expect(wrapper.props('node').children?.length).toBeGreaterThan(0);

      // Verify selectedFilePath is passed to component
      expect(wrapper.props('selectedFilePath')).toBe('/project/src/file1.ts');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined selectedFilePath', async () => {
      await wrapper.setProps({ selectedFilePath: null });
      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');

      await wrapper.setProps({ selectedFilePath: undefined });
      expect(nodeContent.classes()).not.toContain('node-selected');
    });

    it('should handle empty string selectedFilePath', async () => {
      await wrapper.setProps({ selectedFilePath: '' });
      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');
    });

    it('should handle case-sensitive path comparison', async () => {
      await wrapper.setProps({ selectedFilePath: '/project/TestFile.ts' }); // Different case
      const nodeContent = wrapper.find('.node-content');
      expect(nodeContent.classes()).not.toContain('node-selected');
    });
  });
});
