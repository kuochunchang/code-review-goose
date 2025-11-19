import { describe, it, expect } from 'vitest';
import {
  isSupportedLanguage,
  getLanguageName,
  getSupportedLanguagesList,
  isDiagramTypeSupported,
  getUnsupportedDiagramTypeMessage,
  SUPPORTED_LANGUAGE_IDS,
} from '../utils/language-support.js';

describe('language-support', () => {
  describe('isSupportedLanguage', () => {
    it('should return true for TypeScript', () => {
      expect(isSupportedLanguage('typescript')).toBe(true);
    });

    it('should return true for JavaScript', () => {
      expect(isSupportedLanguage('javascript')).toBe(true);
    });

    it('should return true for TypeScript React', () => {
      expect(isSupportedLanguage('typescriptreact')).toBe(true);
    });

    it('should return true for JavaScript React', () => {
      expect(isSupportedLanguage('javascriptreact')).toBe(true);
    });

    it('should return true for Java', () => {
      expect(isSupportedLanguage('java')).toBe(true);
    });

    it('should return true for Python', () => {
      expect(isSupportedLanguage('python')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('plaintext')).toBe(false);
      expect(isSupportedLanguage('html')).toBe(false);
      expect(isSupportedLanguage('css')).toBe(false);
    });
  });

  describe('getLanguageName', () => {
    it('should return correct language names', () => {
      expect(getLanguageName('typescript')).toBe('TypeScript');
      expect(getLanguageName('javascript')).toBe('JavaScript');
      expect(getLanguageName('typescriptreact')).toBe('TypeScript React');
      expect(getLanguageName('javascriptreact')).toBe('JavaScript React');
      expect(getLanguageName('java')).toBe('Java');
      expect(getLanguageName('python')).toBe('Python');
    });

    it('should return language ID for unknown languages', () => {
      expect(getLanguageName('unknown')).toBe('unknown');
    });
  });

  describe('getSupportedLanguagesList', () => {
    it('should return list of supported languages', () => {
      const list = getSupportedLanguagesList();
      expect(list).toContain('TypeScript');
      expect(list).toContain('JavaScript');
      expect(list).toContain('Java');
      expect(list).toContain('Python');
    });
  });

  describe('isDiagramTypeSupported', () => {
    it('should support class diagrams for all languages', () => {
      SUPPORTED_LANGUAGE_IDS.forEach((lang) => {
        expect(isDiagramTypeSupported(lang, 'class')).toBe(true);
      });
    });

    it('should support sequence diagrams for TypeScript/JavaScript', () => {
      expect(isDiagramTypeSupported('typescript', 'sequence')).toBe(true);
      expect(isDiagramTypeSupported('javascript', 'sequence')).toBe(true);
      expect(isDiagramTypeSupported('typescriptreact', 'sequence')).toBe(true);
      expect(isDiagramTypeSupported('javascriptreact', 'sequence')).toBe(true);
    });

    it('should not support sequence diagrams for Java/Python', () => {
      expect(isDiagramTypeSupported('java', 'sequence')).toBe(false);
      expect(isDiagramTypeSupported('python', 'sequence')).toBe(false);
    });

    it('should support flowchart for TypeScript/JavaScript', () => {
      expect(isDiagramTypeSupported('typescript', 'flowchart')).toBe(true);
      expect(isDiagramTypeSupported('javascript', 'flowchart')).toBe(true);
      expect(isDiagramTypeSupported('typescriptreact', 'flowchart')).toBe(true);
      expect(isDiagramTypeSupported('javascriptreact', 'flowchart')).toBe(true);
    });

    it('should not support flowchart for Java/Python', () => {
      expect(isDiagramTypeSupported('java', 'flowchart')).toBe(false);
      expect(isDiagramTypeSupported('python', 'flowchart')).toBe(false);
    });

    it('should return false for unsupported language', () => {
      expect(isDiagramTypeSupported('plaintext', 'class')).toBe(false);
      expect(isDiagramTypeSupported('plaintext', 'sequence')).toBe(false);
      expect(isDiagramTypeSupported('plaintext', 'flowchart')).toBe(false);
    });
  });

  describe('getUnsupportedDiagramTypeMessage', () => {
    it('should return message for unsupported sequence diagram', () => {
      const message = getUnsupportedDiagramTypeMessage('java', 'sequence');
      expect(message).toContain('sequence diagrams');
      expect(message).toContain('Java');
      expect(message).toContain('TypeScript/JavaScript');
    });

    it('should return message for unsupported flowchart', () => {
      const message = getUnsupportedDiagramTypeMessage('python', 'flowchart');
      expect(message).toContain('flowchart');
      expect(message).toContain('Python');
      expect(message).toContain('TypeScript/JavaScript');
    });

    it('should return message for unsupported class diagram', () => {
      const message = getUnsupportedDiagramTypeMessage('plaintext', 'class');
      expect(message).toContain('class diagrams');
      expect(message).toContain('plaintext');
    });
  });
});

