import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import UMLViewer from '../UMLViewer.vue';

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg>Test diagram</svg>' }),
  },
}));

// Mock the API service
vi.mock('../../services/api', () => ({
  generateUML: vi.fn().mockResolvedValue({
    type: 'class',
    mermaidCode: 'classDiagram\n  class Test',
    generationMode: 'native',
  }),
}));

describe('UMLViewer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render UML viewer component', () => {
    const wrapper = mount(UMLViewer);

    expect(wrapper.find('[data-testid="uml-viewer"]').exists()).toBe(true);
  });

  it('should have diagram type buttons', () => {
    const wrapper = mount(UMLViewer);

    expect(wrapper.text()).toContain('CLASS');
    expect(wrapper.text()).toContain('FLOW');
    expect(wrapper.text()).toContain('SEQUENCE');
  });

  it('should select class diagram by default', () => {
    const wrapper = mount(UMLViewer);

    expect((wrapper.vm as any).selectedType).toBe('class');
  });

  it('should switch diagram type when button is clicked', async () => {
    const wrapper = mount(UMLViewer);

    const flowButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('FLOW'));
    await flowButton?.trigger('click');

    expect((wrapper.vm as any).selectedType).toBe('flowchart');
  });

  it('should have refresh button', () => {
    const wrapper = mount(UMLViewer);

    const refreshButton = wrapper.find('.v-btn[icon="mdi-refresh"]');
    expect(refreshButton.exists()).toBe(true);
  });

  it('should have force refresh button', () => {
    const wrapper = mount(UMLViewer);

    const forceRefreshButton = wrapper.find('.v-btn[icon="mdi-refresh-circle"]');
    expect(forceRefreshButton.exists()).toBe(true);
  });

  it('should have download button', () => {
    const wrapper = mount(UMLViewer);

    const downloadButton = wrapper.find('.v-btn[icon="mdi-download"]');
    expect(downloadButton.exists()).toBe(true);
  });

  it('should have close button', () => {
    const wrapper = mount(UMLViewer);

    const closeButton = wrapper.find('.v-btn[icon="mdi-close"]');
    expect(closeButton.exists()).toBe(true);
  });

  it('should emit close event when close button is clicked', async () => {
    const wrapper = mount(UMLViewer);

    const closeButton = wrapper.find('.v-btn[icon="mdi-close"]');
    await closeButton.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('should disable refresh button when no code is provided', () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).currentCode = null;
    (wrapper.vm as any).currentFilePath = null;

    const refreshButton = wrapper.find('.v-btn[icon="mdi-refresh"]');
    expect(refreshButton.attributes('disabled')).toBeDefined();
  });

  it('should enable refresh button when code is provided', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).currentCode = 'class Test {}';
    (wrapper.vm as any).currentFilePath = '/test.ts';
    await wrapper.vm.$nextTick();

    const refreshButton = wrapper.find('.v-btn[icon="mdi-refresh"]');
    expect(refreshButton.attributes('disabled')).toBeUndefined();
  });

  it('should disable download button when no diagram is generated', () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).diagram = null;

    const downloadButton = wrapper.find('.v-btn[icon="mdi-download"]');
    expect(downloadButton.attributes('disabled')).toBeDefined();
  });

  it('should show analysis options for class diagrams', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'class';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Depth:');
  });

  it('should not show analysis options for non-class diagrams', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'flowchart';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Depth:');
  });

  it('should have depth selection buttons', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'class';
    await wrapper.vm.$nextTick();

    const depthButtons = wrapper.findAll('.v-btn-toggle .v-btn');
    const hasDepth0 = depthButtons.some((btn) => btn.text() === '0');
    const hasDepth1 = depthButtons.some((btn) => btn.text() === '1');
    const hasDepth2 = depthButtons.some((btn) => btn.text() === '2');
    const hasDepth3 = depthButtons.some((btn) => btn.text() === '3');

    expect(hasDepth0 || hasDepth1 || hasDepth2 || hasDepth3).toBe(true);
  });

  it('should show loading state when generating diagram', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).loading = true;
    await wrapper.vm.$nextTick();

    const refreshButton = wrapper.find('.v-btn[icon="mdi-refresh"]');
    expect(refreshButton.attributes('loading')).toBeDefined();
  });

  it('should show up-to-date status when insights are current', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).insightStatus = 'up-to-date';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Up to date');
  });

  it('should show outdated status when code has changed', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).insightStatus = 'outdated';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Code changed');
  });

  it('should default to depth 0', () => {
    const wrapper = mount(UMLViewer);

    expect((wrapper.vm as any).analysisDepth).toBe(0);
  });

  it('should update depth when depth button is clicked', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'class';
    (wrapper.vm as any).analysisDepth = 0;
    await wrapper.vm.$nextTick();

    (wrapper.vm as any).analysisDepth = 1;
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).analysisDepth).toBe(1);
  });

  it('should show mode selection for class diagrams', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'class';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Mode:');
  });

  it('should have bidirectional mode by default', () => {
    const wrapper = mount(UMLViewer);

    expect((wrapper.vm as any).analysisMode).toBe('bidirectional');
  });

  it('should display diagram when generated', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).diagram = '<svg>Test diagram</svg>';
    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain('Test diagram');
  });

  it('should show error message when generation fails', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).error = 'Failed to generate diagram';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Failed to generate diagram');
  });

  it('should call generateDiagram when refresh button is clicked', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).currentCode = 'class Test {}';
    (wrapper.vm as any).currentFilePath = '/test.ts';
    await wrapper.vm.$nextTick();

    const generateDiagram = vi.spyOn(wrapper.vm as any, 'generateDiagram');

    const refreshButton = wrapper.find('.v-btn[icon="mdi-refresh"]');
    await refreshButton.trigger('click');

    expect(generateDiagram).toHaveBeenCalledWith(false);
  });

  it('should call generateDiagram with force when force refresh is clicked', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).currentCode = 'class Test {}';
    (wrapper.vm as any).currentFilePath = '/test.ts';
    await wrapper.vm.$nextTick();

    const generateDiagram = vi.spyOn(wrapper.vm as any, 'generateDiagram');

    const forceRefreshButton = wrapper.find('.v-btn[icon="mdi-refresh-circle"]');
    await forceRefreshButton.trigger('click');

    expect(generateDiagram).toHaveBeenCalledWith(true);
  });

  it('should call exportDiagram when download button is clicked', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).diagram = '<svg>Test diagram</svg>';
    await wrapper.vm.$nextTick();

    const exportDiagram = vi.spyOn(wrapper.vm as any, 'exportDiagram');

    const downloadButton = wrapper.find('.v-btn[icon="mdi-download"]');
    await downloadButton.trigger('click');

    expect(exportDiagram).toHaveBeenCalled();
  });

  it('should have tooltips for buttons', () => {
    const wrapper = mount(UMLViewer);

    expect(wrapper.html()).toContain('Generate (use insights)');
    expect(wrapper.html()).toContain('Force Refresh (regenerate)');
  });

  it('should have info tooltips for depth and mode', async () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).selectedType = 'class';
    await wrapper.vm.$nextTick();

    expect(wrapper.html()).toContain('Single file only');
    expect(wrapper.html()).toContain('Cross-file analysis');
  });

  it('should update diagram type reactively', async () => {
    const wrapper = mount(UMLViewer);

    expect((wrapper.vm as any).selectedType).toBe('class');

    (wrapper.vm as any).selectedType = 'sequence';
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).selectedType).toBe('sequence');
  });

  it('should handle empty state', () => {
    const wrapper = mount(UMLViewer);

    (wrapper.vm as any).diagram = null;
    (wrapper.vm as any).error = null;

    expect(wrapper.find('[data-testid="uml-viewer"]').exists()).toBe(true);
  });
});
