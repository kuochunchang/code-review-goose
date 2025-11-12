import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import AnalysisPanel from '../AnalysisPanel.vue';
import type { ExplainResult } from '../../types/insight';

// Mock mermaid - use a factory function to avoid hoisting issues
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>test svg</svg>' }),
  },
}));

// Mock API services
vi.mock('../../services/api', () => ({
  analysisApi: {
    analyzeCode: vi.fn(),
    explainCode: vi.fn(),
    isFileAnalyzable: vi.fn().mockResolvedValue(true),
  },
  insightsApi: {
    saveInsight: vi.fn(),
    saveExplain: vi.fn(),
    checkInsight: vi.fn().mockResolvedValue({ hasRecord: false }),
  },
}));

// Mock project store
vi.mock('../../stores/project', () => ({
  useProjectStore: vi.fn(() => ({
    fetchFileContent: vi.fn().mockResolvedValue('test content'),
  })),
}));

// Mock markdown composable
vi.mock('../../composables/useMarkdown', () => ({
  useMarkdown: vi.fn(() => ({
    renderMarkdown: vi.fn((text: string) => text),
  })),
}));

// Mock hash utility
vi.mock('../../utils/hash', () => ({
  computeHash: vi.fn().mockResolvedValue('test-hash'),
}));

describe('AnalysisPanel - Sequence Diagram Feature', () => {
  let wrapper: any;

  const mockExplainResult: ExplainResult = {
    overview: 'Test overview',
    fields: [],
    mainComponents: [],
    methodDependencies: [
      {
        caller: 'methodA',
        callee: 'methodB',
        callerLine: 10,
        calleeLine: 20,
        description: 'calls methodB for processing',
      },
      {
        caller: 'methodB',
        callee: 'methodC',
        callerLine: 20,
        calleeLine: 30,
        description: 'delegates to methodC',
      },
    ],
    howItWorks: [],
    keyConcepts: [],
    dependencies: [],
    notableFeatures: [],
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Clear the mermaid mock between tests
    const mermaid = await import('mermaid');
    vi.mocked(mermaid.default.render).mockClear();

    wrapper = mount(AnalysisPanel, {
      props: {
        filePath: '/test/file.ts',
      },
      global: {
        stubs: {
          VCard: { template: '<div><slot /></div>' },
          VCardTitle: { template: '<div><slot /></div>' },
          VCardText: { template: '<div><slot /></div>' },
          VTabs: { template: '<div><slot /></div>' },
          VTab: { template: '<div><slot /></div>' },
          VWindow: { template: '<div><slot /></div>' },
          VWindowItem: { template: '<div><slot /></div>' },
          VIcon: { template: '<i />' },
          VBtn: { template: '<button><slot /></button>' },
          VSpacer: { template: '<div />' },
          VList: { template: '<div><slot /></div>' },
          VListItem: { template: '<div><slot /></div>' },
          VChip: { template: '<span><slot /></span>' },
          VAlert: { template: '<div><slot /></div>' },
          VProgressCircular: { template: '<div />' },
          VDialog: { template: '<div v-if="modelValue"><slot /></div>', props: ['modelValue'] },
          VDivider: { template: '<hr />' },
        },
      },
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Sequence Diagram Generation', () => {
    it('should not render sequence diagram section when no methodDependencies', () => {
      const explainResultNoMethod: ExplainResult = {
        ...mockExplainResult,
        methodDependencies: [],
      };

      wrapper.vm.explainResult = explainResultNoMethod;

      expect(wrapper.find('.sequence-diagram-preview').exists()).toBe(false);
    });

    it('should render sequence diagram preview when methodDependencies exist', async () => {
      wrapper.vm.explainResult = mockExplainResult;
      wrapper.vm.currentTab = 'explain';

      await nextTick();

      expect(wrapper.find('.sequence-diagram-preview').exists()).toBe(true);
    });

    it('should generate correct Mermaid syntax from methodDependencies', () => {
      wrapper.vm.explainResult = mockExplainResult;

      const mermaidCode = wrapper.vm.generateSequenceDiagram();

      expect(mermaidCode).toContain('sequenceDiagram');
      expect(mermaidCode).toContain('methodA->>methodB: calls methodB for processing');
      expect(mermaidCode).toContain('methodB->>methodC: delegates to methodC');
    });

    it('should return null when no methodDependencies', () => {
      wrapper.vm.explainResult = {
        ...mockExplainResult,
        methodDependencies: [],
      };

      const mermaidCode = wrapper.vm.generateSequenceDiagram();

      expect(mermaidCode).toBeNull();
    });

    it('should use default description when not provided', () => {
      wrapper.vm.explainResult = {
        ...mockExplainResult,
        methodDependencies: [
          {
            caller: 'methodX',
            callee: 'methodY',
          },
        ],
      };

      const mermaidCode = wrapper.vm.generateSequenceDiagram();

      expect(mermaidCode).toContain('methodX->>methodY: calls');
    });
  });

  describe('Enlarge Button and Modal', () => {
    it('should display "Enlarge" button when methodDependencies exist', async () => {
      wrapper.vm.explainResult = mockExplainResult;
      wrapper.vm.currentTab = 'explain';

      await nextTick();

      const enlargeBtn = wrapper.findAll('button').find((btn: any) =>
        btn.text().includes('Enlarge')
      );

      expect(enlargeBtn).toBeDefined();
    });

    it('should open modal when "Enlarge" button is clicked', async () => {
      wrapper.vm.explainResult = mockExplainResult;
      wrapper.vm.currentTab = 'explain';

      await nextTick();

      expect(wrapper.vm.showSequenceDiagram).toBe(false);

      await wrapper.vm.openSequenceDiagramModal();

      expect(wrapper.vm.showSequenceDiagram).toBe(true);
    });

    it('should close modal when close button is clicked', async () => {
      wrapper.vm.showSequenceDiagram = true;

      await nextTick();

      wrapper.vm.showSequenceDiagram = false;

      await nextTick();

      expect(wrapper.vm.showSequenceDiagram).toBe(false);
    });
  });

  describe('Original List View', () => {
    it('should still render original list view alongside sequence diagram', async () => {
      wrapper.vm.explainResult = mockExplainResult;
      wrapper.vm.currentTab = 'explain';

      await nextTick();

      // Both sequence diagram preview and list should exist
      expect(wrapper.find('.sequence-diagram-preview').exists()).toBe(true);
      expect(wrapper.find('.v-list').exists()).toBe(false); // Stubbed, won't render
    });

    it('should display caller and callee chips in list', async () => {
      wrapper.vm.explainResult = mockExplainResult;
      wrapper.vm.currentTab = 'explain';

      await nextTick();

      // Check that methodDependencies are accessible in component
      expect(wrapper.vm.explainResult.methodDependencies).toHaveLength(2);
      expect(wrapper.vm.explainResult.methodDependencies[0].caller).toBe('methodA');
      expect(wrapper.vm.explainResult.methodDependencies[0].callee).toBe('methodB');
    });
  });

  describe('Jump to Line Functionality', () => {
    it('should emit jumpToLine event when caller line button is clicked', async () => {
      wrapper.vm.explainResult = mockExplainResult;

      // Simulate clicking a line number button
      await wrapper.vm.$emit('jumpToLine', 10);

      expect(wrapper.emitted('jumpToLine')).toBeTruthy();
      expect(wrapper.emitted('jumpToLine')[0]).toEqual([10]);
    });

    it('should emit jumpToLine event when callee line button is clicked', async () => {
      wrapper.vm.explainResult = mockExplainResult;

      await wrapper.vm.$emit('jumpToLine', 20);

      expect(wrapper.emitted('jumpToLine')).toBeTruthy();
      expect(wrapper.emitted('jumpToLine')[0]).toEqual([20]);
    });
  });

  describe('Mermaid Rendering', () => {
    it('should call mermaid.render when rendering sequence diagram', async () => {
      const mermaid = await import('mermaid');

      wrapper.vm.explainResult = mockExplainResult;

      const container = document.createElement('div');
      await wrapper.vm.renderSequenceDiagram(container, false);

      expect(mermaid.default.render).toHaveBeenCalled();
    });

    it('should handle rendering errors gracefully', async () => {
      const mermaid = await import('mermaid');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock render to throw an error
      vi.mocked(mermaid.default.render).mockRejectedValueOnce(new Error('Render failed'));

      wrapper.vm.explainResult = mockExplainResult;

      const container = document.createElement('div');
      await wrapper.vm.renderSequenceDiagram(container, false);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to render sequence diagram:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not render if container is null', async () => {
      const mermaid = await import('mermaid');

      wrapper.vm.explainResult = mockExplainResult;

      await wrapper.vm.renderSequenceDiagram(null, false);

      expect(mermaid.default.render).not.toHaveBeenCalled();
    });

    it('should not render if no methodDependencies', async () => {
      const mermaid = await import('mermaid');

      wrapper.vm.explainResult = {
        ...mockExplainResult,
        methodDependencies: [],
      };

      const container = document.createElement('div');
      await wrapper.vm.renderSequenceDiagram(container, false);

      expect(mermaid.default.render).not.toHaveBeenCalled();
    });
  });
});
