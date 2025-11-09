/**
 * Configuration-related type definitions
 */

export interface ProjectConfig {
  aiProvider?: 'openai' | 'claude' | 'gemini' | 'ollama';
  openai?: {
    apiKey: string;
    model: string;
    timeout?: number; // Request timeout in milliseconds (default: 60000)
  };
  claude?: {
    apiKey: string;
    model: string;
    timeout?: number; // Request timeout in milliseconds (default: 60000)
  };
  gemini?: {
    apiKey: string;
    model: string;
    timeout?: number; // Request timeout in milliseconds (default: 60000)
  };
  ollama?: {
    baseUrl: string;
    model: string;
    timeout?: number; // Request timeout in milliseconds (default: 60000)
  };
  ignorePatterns?: string[];
  maxFileSize?: number;
  analyzableFileExtensions?: string[]; // File extensions that can be analyzed by AI
  uml?: UMLConfig;
}

export interface UMLConfig {
  // Generation mode: native (AST parsing), ai (AI generation), hybrid (mixed)
  generationMode: 'native' | 'ai' | 'hybrid';

  // AI generation options
  aiOptions?: {
    // Diagram types enabled for AI
    enabledTypes: string[];

    // Auto-fix syntax errors
    autoFixSyntax: boolean;

    // Maximum retry attempts
    maxRetries: number;
  };

  // Native generation options
  nativeOptions?: {
    // Include private members
    includePrivateMembers: boolean;

    // Analyze import dependencies
    analyzeImports: boolean;
  };
}

export const DEFAULT_CONFIG: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: '',
    model: 'gpt-4',
    timeout: 60000, // 60 seconds default timeout
  },
  ignorePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  // Common programming language file extensions
  analyzableFileExtensions: [
    // JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    // Vue
    '.vue',
    // Python
    '.py', '.pyw',
    // Java
    '.java',
    // Go
    '.go',
    // Rust
    '.rs',
    // C/C++
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
    // C#
    '.cs',
    // PHP
    '.php',
    // Ruby
    '.rb',
    // Swift
    '.swift',
    // Kotlin
    '.kt', '.kts',
    // Scala
    '.scala',
    // R
    '.r', '.R',
    // Dart
    '.dart',
    // HTML/CSS
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    // SQL
    '.sql',
    // Shell
    '.sh', '.bash', '.zsh',
    // Config files (may contain logic)
    '.yaml', '.yml', '.json',
  ],
  uml: {
    generationMode: 'hybrid',
    aiOptions: {
      enabledTypes: ['sequence', 'dependency'],
      autoFixSyntax: true,
      maxRetries: 2,
    },
    nativeOptions: {
      includePrivateMembers: false,
      analyzeImports: true,
    },
  },
};
