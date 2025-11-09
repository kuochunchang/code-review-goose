import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUIStore } from '../../stores/ui';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('theme management', () => {
    it('should have dark theme as default', () => {
      const store = useUIStore();
      expect(store.theme).toBe('dark');
    });

    it('should toggle theme from dark to light', () => {
      const store = useUIStore();
      store.toggleTheme();
      expect(store.theme).toBe('light');
    });

    it('should toggle theme from light to dark', () => {
      const store = useUIStore();
      store.theme = 'light';
      store.toggleTheme();
      expect(store.theme).toBe('dark');
    });

    it('should load theme from localStorage', () => {
      localStorageMock.setItem('goose-theme', 'light');

      const store = useUIStore();
      store.loadTheme();

      expect(store.theme).toBe('light');
    });

    it('should save theme to localStorage when changed', async () => {
      const store = useUIStore();

      store.theme = 'light';

      // Wait for the watch effect to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(localStorageMock.getItem('goose-theme')).toBe('light');
    });

    it('should ignore invalid theme values from localStorage', () => {
      localStorageMock.setItem('goose-theme', 'invalid');

      const store = useUIStore();
      store.loadTheme();

      // Should keep default theme
      expect(store.theme).toBe('dark');
    });
  });

  describe('snackbar management', () => {
    it('should show snackbar with default settings', () => {
      const store = useUIStore();
      store.showSnackbar('Test message');

      expect(store.snackbar.show).toBe(true);
      expect(store.snackbar.message).toBe('Test message');
      expect(store.snackbar.color).toBe('info');
      expect(store.snackbar.timeout).toBe(3000);
    });

    it('should show snackbar with custom color', () => {
      const store = useUIStore();
      store.showSnackbar('Error message', 'error');

      expect(store.snackbar.show).toBe(true);
      expect(store.snackbar.message).toBe('Error message');
      expect(store.snackbar.color).toBe('error');
    });

    it('should show snackbar with custom timeout', () => {
      const store = useUIStore();
      store.showSnackbar('Success message', 'success', 5000);

      expect(store.snackbar.show).toBe(true);
      expect(store.snackbar.timeout).toBe(5000);
    });

    it('should hide snackbar', () => {
      const store = useUIStore();
      store.showSnackbar('Test message');
      expect(store.snackbar.show).toBe(true);

      store.hideSnackbar();
      expect(store.snackbar.show).toBe(false);
    });
  });
});
