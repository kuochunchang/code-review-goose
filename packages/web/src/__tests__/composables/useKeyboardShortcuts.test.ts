import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import {
  formatShortcut,
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from '../../composables/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockNavigator: any;

  beforeEach(() => {
    // Mock navigator.platform
    mockNavigator = vi.spyOn(navigator, 'platform', 'get');
  });

  afterEach(() => {
    mockNavigator.mockRestore();
  });

  describe('keyboard event handling', () => {
    it('should trigger handler when correct key combination is pressed', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          ctrl: true,
          description: 'Save',
          handler,
        },
      ];

      // Create a test component that uses the composable
      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      // Simulate Ctrl+S key press on Windows
      mockNavigator.mockReturnValue('Win32');
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledOnce();

      wrapper.unmount();
    });

    it('should trigger handler with Cmd key on Mac', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          ctrl: true,
          description: 'Save',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      // Simulate Cmd+S key press on Mac
      mockNavigator.mockReturnValue('MacIntel');
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        shiftKey: false,
        altKey: false,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();

      wrapper.unmount();
    });

    it('should handle Shift modifier', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'k',
          ctrl: true,
          shift: true,
          description: 'Open Command Palette',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      mockNavigator.mockReturnValue('Win32');
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledOnce();

      wrapper.unmount();
    });

    it('should handle Alt modifier', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'f',
          alt: true,
          description: 'File menu',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      mockNavigator.mockReturnValue('Win32');
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: false,
        shiftKey: false,
        altKey: true,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledOnce();

      wrapper.unmount();
    });

    it('should not trigger if modifiers do not match', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          ctrl: true,
          description: 'Save',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      mockNavigator.mockReturnValue('Win32');
      // Press 's' without Ctrl
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      });

      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('should be case-insensitive for key matching', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          ctrl: true,
          description: 'Save',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);

      mockNavigator.mockReturnValue('Win32');
      // Press 'S' (uppercase)
      const event = new KeyboardEvent('keydown', {
        key: 'S',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      });

      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledOnce();

      wrapper.unmount();
    });

    it('should remove event listener on unmount', async () => {
      const handler = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 's',
          ctrl: true,
          description: 'Save',
          handler,
        },
      ];

      const TestComponent = defineComponent({
        setup() {
          useKeyboardShortcuts(shortcuts);
          return () => h('div', 'test');
        },
      });

      const wrapper = mount(TestComponent);
      wrapper.unmount();

      mockNavigator.mockReturnValue('Win32');
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      });

      window.dispatchEvent(event);

      // Handler should not be called after unmount
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('formatShortcut', () => {
    it('should format shortcut for Windows', () => {
      mockNavigator.mockReturnValue('Win32');

      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrl: true,
        description: 'Save',
        handler: () => {},
      };

      const formatted = formatShortcut(shortcut);
      expect(formatted).toBe('Ctrl + S');
    });

    it('should format shortcut for Mac', () => {
      mockNavigator.mockReturnValue('MacIntel');

      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrl: true,
        description: 'Save',
        handler: () => {},
      };

      const formatted = formatShortcut(shortcut);
      expect(formatted).toBe('⌘ + S');
    });

    it('should format shortcut with Shift on Windows', () => {
      mockNavigator.mockReturnValue('Win32');

      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrl: true,
        shift: true,
        description: 'Command',
        handler: () => {},
      };

      const formatted = formatShortcut(shortcut);
      expect(formatted).toBe('Ctrl + Shift + K');
    });

    it('should format shortcut with Alt on Mac', () => {
      mockNavigator.mockReturnValue('MacIntel');

      const shortcut: KeyboardShortcut = {
        key: 'f',
        alt: true,
        description: 'File',
        handler: () => {},
      };

      const formatted = formatShortcut(shortcut);
      expect(formatted).toBe('⌥ + F');
    });

    it('should format complex shortcut on Mac', () => {
      mockNavigator.mockReturnValue('MacIntel');

      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrl: true,
        shift: true,
        alt: true,
        description: 'Complex',
        handler: () => {},
      };

      const formatted = formatShortcut(shortcut);
      expect(formatted).toBe('⌘ + ⇧ + ⌥ + K');
    });
  });
});
