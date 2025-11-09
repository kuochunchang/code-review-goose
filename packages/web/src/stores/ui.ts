import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>('dark');
  const snackbar = ref({
    show: false,
    message: '',
    color: 'info',
    timeout: 3000,
  });

  // Load theme from localStorage
  const loadTheme = () => {
    const savedTheme = localStorage.getItem('goose-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme.value = savedTheme;
    }
  };

  // Save theme to localStorage
  watch(theme, (newTheme) => {
    localStorage.setItem('goose-theme', newTheme);
  });

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  };

  const showSnackbar = (message: string, color: string = 'info', timeout: number = 3000) => {
    snackbar.value = {
      show: true,
      message,
      color,
      timeout,
    };
  };

  const hideSnackbar = () => {
    snackbar.value.show = false;
  };

  return {
    theme,
    snackbar,
    loadTheme,
    toggleTheme,
    showSnackbar,
    hideSnackbar,
  };
});
