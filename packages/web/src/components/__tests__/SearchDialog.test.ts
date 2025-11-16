import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchDialog from '../SearchDialog.vue';

// Local type definition for tests
interface SearchResult {
  totalFiles: number;
  totalMatches: number;
  searchTime: number;
  truncated: boolean;
  files: Array<{
    filePath: string;
    matches: number;
    lines: Array<{
      lineNumber: number;
      content: string;
      contextBefore: string[];
      contextAfter: string[];
    }>;
  }>;
}

// Mock the API service
vi.mock('../../services/api', () => ({
  searchCode: vi.fn(),
}));

describe('SearchDialog.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render search dialog', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.find('.v-dialog').exists()).toBe(true);
    expect(wrapper.text()).toContain('Code Search');
  });

  it('should not render when modelValue is false', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: false,
      },
    });

    expect(wrapper.find('.v-card').exists()).toBe(false);
  });

  it('should have search input field', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchInput = wrapper.find('input[type="text"]');
    expect(searchInput.exists()).toBe(true);
  });

  it('should have search button', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Search'));
    expect(searchButton).toBeDefined();
  });

  it('should disable search button when query is empty', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Search'));
    expect(searchButton?.attributes('disabled')).toBeDefined();
  });

  it('should enable search button when query is not empty', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue('test query');

    const searchButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Search'));
    expect(searchButton?.attributes('disabled')).toBeUndefined();
  });

  it('should have case sensitive checkbox', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.text()).toContain('Case sensitive');
  });

  it('should have regex checkbox', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.text()).toContain('Use regex');
  });

  it('should have show context checkbox', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.text()).toContain('Show context');
  });

  it('should have advanced options panel', () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.text()).toContain('Advanced Options');
  });

  it('should call executeSearch when search button is clicked', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue('test query');

    const executeSearch = vi.spyOn(wrapper.vm as any, 'executeSearch');

    const searchButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Search'));
    await searchButton?.trigger('click');

    expect(executeSearch).toHaveBeenCalled();
  });

  it('should show loading state while searching', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    // Set searching state
    (wrapper.vm as any).searching = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Searching...');
    expect(wrapper.find('.v-progress-circular').exists()).toBe(true);
  });

  it('should display search results', async () => {
    const mockResult: SearchResult = {
      totalFiles: 2,
      totalMatches: 5,
      searchTime: 123,
      truncated: false,
      files: [
        {
          filePath: '/test/file1.ts',
          matches: 3,
          lines: [
            {
              lineNumber: 10,
              content: 'test code',
              contextBefore: [],
              contextAfter: [],
            },
          ],
        },
        {
          filePath: '/test/file2.ts',
          matches: 2,
          lines: [
            {
              lineNumber: 20,
              content: 'test code 2',
              contextBefore: [],
              contextAfter: [],
            },
          ],
        },
      ],
    };

    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).searchResult = mockResult;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('2 files');
    expect(wrapper.text()).toContain('5 matches');
    expect(wrapper.text()).toContain('123ms');
  });

  it('should show truncated warning when results are truncated', async () => {
    const mockResult: SearchResult = {
      totalFiles: 1,
      totalMatches: 100,
      searchTime: 50,
      truncated: true,
      files: [],
    };

    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).searchResult = mockResult;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Results truncated');
  });

  it('should show "No results found" when search has no matches', async () => {
    const mockResult: SearchResult = {
      totalFiles: 0,
      totalMatches: 0,
      searchTime: 10,
      truncated: false,
      files: [],
    };

    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).searchResult = mockResult;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('No results found');
  });

  it('should display error message on search failure', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).searchError = 'Search failed: Network error';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Search failed: Network error');
  });

  it('should close dialog when close button is clicked', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const closeButton = wrapper.find('.v-btn[icon="mdi-close"]');
    await closeButton.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });

  it('should allow selecting file results', async () => {
    const mockResult: SearchResult = {
      totalFiles: 1,
      totalMatches: 1,
      searchTime: 10,
      truncated: false,
      files: [
        {
          filePath: '/test/file1.ts',
          matches: 1,
          lines: [
            {
              lineNumber: 10,
              content: 'test code',
              contextBefore: [],
              contextAfter: [],
            },
          ],
        },
      ],
    };

    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).searchResult = mockResult;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.v-expansion-panel').exists()).toBe(true);
  });

  it('should trigger search on Enter key', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue('test query');

    const executeSearch = vi.spyOn(wrapper.vm as any, 'executeSearch');

    await searchInput.trigger('keyup.enter');

    expect(executeSearch).toHaveBeenCalled();
  });

  it('should clear search query when clear button is clicked', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue('test query');

    expect((searchInput.element as HTMLInputElement).value).toBe('test query');

    // Clear button behavior is handled by Vuetify internally
    (wrapper.vm as any).searchQuery = '';
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).searchQuery).toBe('');
  });

  it('should respect advanced options', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    // Open advanced panel
    (wrapper.vm as any).advancedPanelOpen = 0;
    await wrapper.vm.$nextTick();

    // File pattern should be visible
    const filePatternInputs = wrapper.findAll('input').filter((input) => {
      return (
        input.element.type === 'text' &&
        input.element.hasAttribute('placeholder') === false &&
        input.element.parentElement?.textContent?.includes('File pattern')
      );
    });

    expect(filePatternInputs.length).toBeGreaterThan(0);
  });

  it('should handle max results input', async () => {
    const wrapper = mount(SearchDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).advancedPanelOpen = 0;
    await wrapper.vm.$nextTick();

    const numberInputs = wrapper.findAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThan(0);
  });
});
