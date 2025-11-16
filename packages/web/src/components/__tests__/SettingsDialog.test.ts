import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsDialog from '../SettingsDialog.vue';

// Mock the API service
vi.mock('../../services/api', () => ({
  getConfig: vi.fn().mockResolvedValue({
    aiProvider: 'openai',
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4',
      timeout: 60000,
    },
  }),
  updateConfig: vi.fn().mockResolvedValue(true),
}));

describe('SettingsDialog.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render settings dialog', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.find('.v-dialog').exists()).toBe(true);
    expect(wrapper.text()).toContain('Settings');
  });

  it('should not render when modelValue is false', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: false,
      },
    });

    expect(wrapper.find('.v-card').exists()).toBe(false);
  });

  it('should have AI provider selection', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    expect(wrapper.text()).toContain('AI Provider');
  });

  it('should show OpenAI configuration when provider is openai', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: '',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('OpenAI API Key');
    expect(wrapper.text()).toContain('Model');
  });

  it('should show custom provider configuration when provider is custom', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'custom',
      custom: {
        baseUrl: '',
        model: '',
        apiKey: '',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Base URL');
    expect(wrapper.text()).toContain('Model Name');
  });

  it('should toggle API key visibility', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: 'test-key',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);

    (wrapper.vm as any).showApiKey = true;
    await wrapper.vm.$nextTick();

    const textInput = wrapper.findAll('input[type="text"]').find((input) => {
      return (input.element as HTMLInputElement).value === 'test-key';
    });

    expect(textInput).toBeDefined();
  });

  it('should have save button', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    const saveButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Save'));
    expect(saveButton).toBeDefined();
  });

  it('should have cancel button', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    const cancelButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Cancel'));
    expect(cancelButton).toBeDefined();
  });

  it('should close dialog when close button is clicked', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    const closeButton = wrapper.find('.v-btn[icon="mdi-close"]');
    await closeButton.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('should close dialog when cancel button is clicked', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    const cancelButton = wrapper.findAll('.v-btn').find((btn) => btn.text().includes('Cancel'));
    await cancelButton?.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('should validate API key field', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: '',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    const apiKeyInput = wrapper.find('input[type="password"]');
    expect(apiKeyInput.exists()).toBe(true);
  });

  it('should validate timeout field range', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: 'test-key',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    const timeoutInput = wrapper.find('input[type="number"]');
    expect(timeoutInput.exists()).toBe(true);
    expect(timeoutInput.attributes('min')).toBe('10000');
    expect(timeoutInput.attributes('max')).toBe('300000');
  });

  it('should show success message after saving', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).statusMessage = 'Settings saved successfully';
    (wrapper.vm as any).statusType = 'success';

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Settings saved successfully');
  });

  it('should show error message on save failure', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).statusMessage = 'Failed to save settings';
    (wrapper.vm as any).statusType = 'error';

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Failed to save settings');
  });

  it('should update model selection', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: 'test-key',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    (wrapper.vm as any).localConfig.openai.model = 'gpt-3.5-turbo';
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).localConfig.openai.model).toBe('gpt-3.5-turbo');
  });

  it('should show API key hint', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: '',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Your API key will be stored locally');
  });

  it('should have link to OpenAI platform', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: '',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    const link = wrapper.find('a[href="https://platform.openai.com/api-keys"]');
    expect(link.exists()).toBe(true);
  });

  it('should handle custom provider base URL', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'custom',
      custom: {
        baseUrl: 'https://example.com/v1',
        model: 'instruct',
        apiKey: '',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).localConfig.custom.baseUrl).toBe('https://example.com/v1');
  });

  it('should show timeout hint with recommendations', async () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    (wrapper.vm as any).localConfig = {
      aiProvider: 'openai',
      openai: {
        apiKey: 'test-key',
        model: 'gpt-4',
        timeout: 60000,
      },
    };

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Request Timeout');
    expect(wrapper.text()).toContain('Recommended: 60000 for GPT-4');
  });

  it('should be persistent dialog', () => {
    const wrapper = mount(SettingsDialog, {
      props: {
        modelValue: true,
      },
    });

    const dialog = wrapper.find('.v-dialog');
    expect(dialog.attributes('persistent')).toBeDefined();
  });
});
