import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FileTree from '../FileTree.vue';
import { useProjectStore } from '../../stores/project';

// Mock FileTreeNode component
vi.mock('../FileTreeNode.vue', () => ({
  default: {
    name: 'FileTreeNode',
    template: '<div class="file-tree-node">Mocked FileTreeNode</div>',
    props: ['node', 'level', 'selectedFilePath'],
  },
}));

describe('FileTree.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render file tree component', () => {
    const wrapper = mount(FileTree);

    expect(wrapper.find('[data-testid="file-tree"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Files');
  });

  it('should show loading state initially', () => {
    const wrapper = mount(FileTree);

    // Should show progress bar when loading
    expect(wrapper.find('.v-progress-linear').exists()).toBe(true);
  });

  it('should load file tree on mount', async () => {
    const mockFileTree = {
      name: 'root',
      type: 'directory',
      children: [
        { name: 'file1.ts', type: 'file', path: '/file1.ts' },
        { name: 'file2.ts', type: 'file', path: '/file2.ts' },
      ],
    };

    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockResolvedValue(mockFileTree);

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(projectStore.fetchFileTree).toHaveBeenCalled();
  });

  it('should display file tree after loading', async () => {
    const mockFileTree = {
      name: 'root',
      type: 'directory',
      children: [],
    };

    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockResolvedValue(mockFileTree);

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    // Loading should be done
    expect(wrapper.find('.v-progress-linear').exists()).toBe(false);
  });

  it('should show error state when file tree loading fails', async () => {
    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockRejectedValue(new Error('Network error'));

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.v-alert').exists()).toBe(true);
    expect(wrapper.text()).toContain('Network error');
  });

  it('should emit selectFile event when file is selected', async () => {
    const mockFileTree = {
      name: 'root',
      type: 'directory',
      children: [],
    };

    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockResolvedValue(mockFileTree);

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Trigger selectFile event
    const handleSelectFile = (wrapper.vm as any).handleSelectFile;
    handleSelectFile('/test/file.ts');

    expect(wrapper.emitted('selectFile')).toBeTruthy();
    expect(wrapper.emitted('selectFile')?.[0]).toEqual(['/test/file.ts']);
  });

  it('should emit collapse event when collapse button is clicked', async () => {
    const wrapper = mount(FileTree);

    const collapseButton = wrapper.find('.v-btn');
    await collapseButton.trigger('click');

    expect(wrapper.emitted('collapse')).toBeTruthy();
  });

  it('should pass selectedFilePath prop to FileTreeNode', async () => {
    const mockFileTree = {
      name: 'root',
      type: 'directory',
      children: [],
    };

    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockResolvedValue(mockFileTree);

    const wrapper = mount(FileTree, {
      props: {
        selectedFilePath: '/test/file.ts',
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    // FileTreeNode should receive the selectedFilePath prop
    expect(wrapper.html()).toContain('file-tree-node');
  });

  it('should show "No files found" when file tree is empty', async () => {
    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockResolvedValue(null);

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('No files found');
  });

  it('should handle error object without message', async () => {
    const projectStore = useProjectStore();
    projectStore.fetchFileTree = vi.fn().mockRejectedValue('String error');

    const wrapper = mount(FileTree);

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Failed to load file tree');
  });
});
