import { vi } from 'vitest';

export default {
  pathExists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  writeJSON: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
  ensureDir: vi.fn(),
  remove: vi.fn(),
  copy: vi.fn(),
  open: vi.fn(),
  read: vi.fn(),
  close: vi.fn(),
};

export const pathExists = vi.fn();
export const readFile = vi.fn();
export const writeFile = vi.fn();
export const writeJSON = vi.fn();
export const stat = vi.fn();
export const readdir = vi.fn();
export const ensureDir = vi.fn();
export const remove = vi.fn();
export const copy = vi.fn();
export const open = vi.fn();
export const read = vi.fn();
export const close = vi.fn();
