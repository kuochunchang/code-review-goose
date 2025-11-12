import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import path from 'path';
import fs from 'fs-extra';
import type { FileImport, FileExport, FileDependencyInfo } from '../types/ai.js';

// Correct way to import @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

export interface FileDependencyOptions {
  projectRoot: string; // Project root directory
  currentFilePath: string; // Path to the file being analyzed
}

/**
 * Service for analyzing file dependencies across project files
 * Focuses only on internal project dependencies, excludes node_modules
 */
export class FileDependencyService {
  /**
   * Analyze file dependencies for a given file
   * @param code - Source code to analyze
   * @param options - Analysis options (projectRoot, currentFilePath)
   * @returns FileDependencyInfo with imports, exports, dependents, and diagrams
   */
  async analyzeFileDependencies(
    code: string,
    options: FileDependencyOptions
  ): Promise<FileDependencyInfo> {
    try {
      const { projectRoot, currentFilePath } = options;

      // Parse code to AST
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        errorRecovery: true,
      });

      // Extract imports and exports
      const imports = this.extractImports(ast, currentFilePath, projectRoot);
      const exports = this.extractExports(ast);

      // Find files that depend on this file (dependents)
      const dependents = await this.findDependents(currentFilePath, projectRoot);

      // Generate Mermaid diagrams
      const classDiagram = this.generateClassDiagram(
        currentFilePath,
        imports,
        dependents,
        projectRoot
      );
      const sequenceDiagram = this.generateSequenceDiagram(currentFilePath, imports, projectRoot);

      return {
        imports,
        exports,
        dependents,
        classDiagram,
        sequenceDiagram,
      };
    } catch (error) {
      console.error('Error analyzing file dependencies:', error);
      // Return empty result on error
      return {
        imports: [],
        exports: [],
        dependents: [],
        classDiagram: 'classDiagram\n    note "Unable to analyze file dependencies"',
        sequenceDiagram: undefined,
      };
    }
  }

  /**
   * Extract import statements from AST
   * Only includes imports from project files (not node_modules)
   */
  private extractImports(
    ast: t.File,
    currentFilePath: string,
    projectRoot: string
  ): FileImport[] {
    const imports: FileImport[] = [];
    const currentDir = path.dirname(currentFilePath);

    traverse(ast, {
      ImportDeclaration: (nodePath: any) => {
        const source = nodePath.node.source.value;

        // Skip node_modules imports (starts with package names, not './' or '../')
        if (!source.startsWith('.') && !source.startsWith('/')) {
          return;
        }

        // Resolve relative path to absolute path
        const resolvedPath = path.resolve(currentDir, source);

        // Check if file exists (try common extensions)
        const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.vue'];
        let actualPath = '';
        for (const ext of possibleExtensions) {
          const testPath = resolvedPath + ext;
          if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
            actualPath = testPath;
            break;
          }
        }

        // If not found, try index files
        if (!actualPath) {
          for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
            const indexPath = path.join(resolvedPath, `index${ext}`);
            if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
              actualPath = indexPath;
              break;
            }
          }
        }

        // Skip if file not found or outside project root
        if (!actualPath || !actualPath.startsWith(projectRoot)) {
          return;
        }

        // Extract imported symbols
        const importedSymbols: string[] = [];
        nodePath.node.specifiers.forEach((spec: any) => {
          if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
            importedSymbols.push(spec.imported.name);
          } else if (t.isImportDefaultSpecifier(spec)) {
            importedSymbols.push('default');
          } else if (t.isImportNamespaceSpecifier(spec)) {
            importedSymbols.push('*');
          }
        });

        imports.push({
          filePath: path.relative(projectRoot, actualPath),
          importedSymbols,
          line: nodePath.node.loc?.start.line || 0,
        });
      },
    });

    return imports;
  }

  /**
   * Extract export statements from AST
   */
  private extractExports(ast: t.File): FileExport[] {
    const exports: FileExport[] = [];

    traverse(ast, {
      ExportNamedDeclaration: (nodePath: any) => {
        const declaration = nodePath.node.declaration;
        const line = nodePath.node.loc?.start.line || 0;

        if (t.isFunctionDeclaration(declaration) && declaration.id) {
          exports.push({
            name: declaration.id.name,
            type: 'function',
            line,
          });
        } else if (t.isClassDeclaration(declaration) && declaration.id) {
          exports.push({
            name: declaration.id.name,
            type: 'class',
            line,
          });
        } else if (t.isVariableDeclaration(declaration)) {
          declaration.declarations.forEach((decl) => {
            if (t.isIdentifier(decl.id)) {
              exports.push({
                name: decl.id.name,
                type: 'constant',
                line,
              });
            }
          });
        } else if (t.isTSInterfaceDeclaration(declaration)) {
          exports.push({
            name: declaration.id.name,
            type: 'interface',
            line,
          });
        } else if (t.isTSTypeAliasDeclaration(declaration)) {
          exports.push({
            name: declaration.id.name,
            type: 'type',
            line,
          });
        }

        // Handle export { name1, name2 }
        nodePath.node.specifiers.forEach((spec: any) => {
          if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
            exports.push({
              name: spec.exported.name,
              type: 'constant',
              line,
            });
          }
        });
      },
      ExportDefaultDeclaration: (nodePath: any) => {
        const line = nodePath.node.loc?.start.line || 0;
        const declaration = nodePath.node.declaration;

        let name = 'default';
        if (t.isIdentifier(declaration)) {
          name = declaration.name;
        } else if (t.isFunctionDeclaration(declaration) && declaration.id) {
          name = declaration.id.name;
        } else if (t.isClassDeclaration(declaration) && declaration.id) {
          name = declaration.id.name;
        }

        exports.push({
          name,
          type: 'default',
          line,
        });
      },
    });

    return exports;
  }

  /**
   * Find files that import the current file (dependents)
   */
  private async findDependents(currentFilePath: string, projectRoot: string): Promise<string[]> {
    const dependents: string[] = [];
    const relativePath = path.relative(projectRoot, currentFilePath);

    try {
      // Get all source files in the project
      const sourceFiles = await this.getAllSourceFiles(projectRoot);

      // Check each file for imports
      for (const file of sourceFiles) {
        if (file === currentFilePath) continue; // Skip self

        try {
          const content = await fs.readFile(file, 'utf-8');
          const imports = this.quickExtractImports(content, file, projectRoot);

          // Check if any import points to current file
          for (const imp of imports) {
            const importedAbsPath = path.resolve(projectRoot, imp.filePath);
            if (importedAbsPath === currentFilePath) {
              dependents.push(path.relative(projectRoot, file));
              break;
            }
          }
        } catch (err) {
          // Skip files that can't be parsed
          continue;
        }
      }
    } catch (error) {
      console.error('Error finding dependents:', error);
    }

    return dependents;
  }

  /**
   * Quick extraction of imports without full AST parsing (for performance)
   * Uses regex to find import statements
   */
  private quickExtractImports(
    content: string,
    filePath: string,
    projectRoot: string
  ): FileImport[] {
    const imports: FileImport[] = [];
    const fileDir = path.dirname(filePath);

    // Regex to match import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const source = match[1];

      // Skip node_modules
      if (!source.startsWith('.') && !source.startsWith('/')) {
        continue;
      }

      // Resolve path
      const resolvedPath = path.resolve(fileDir, source);

      // Try to find actual file
      const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.vue'];
      let actualPath = '';
      for (const ext of possibleExtensions) {
        const testPath = resolvedPath + ext;
        if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
          actualPath = testPath;
          break;
        }
      }

      if (actualPath && actualPath.startsWith(projectRoot)) {
        imports.push({
          filePath: path.relative(projectRoot, actualPath),
          importedSymbols: [],
          line: 0,
        });
      }
    }

    return imports;
  }

  /**
   * Get all source files in the project
   */
  private async getAllSourceFiles(projectRoot: string): Promise<string[]> {
    const sourceFiles: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

    const walkDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip node_modules, .git, dist, build, etc.
          if (
            entry.isDirectory() &&
            !['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out'].includes(
              entry.name
            )
          ) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              sourceFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't access
      }
    };

    await walkDir(projectRoot);
    return sourceFiles;
  }

  /**
   * Generate Mermaid class diagram showing file dependencies
   */
  private generateClassDiagram(
    currentFilePath: string,
    imports: FileImport[],
    dependents: string[],
    projectRoot: string
  ): string {
    const relativePath = path.relative(projectRoot, currentFilePath);
    const currentFileName = this.sanitizeFileName(relativePath);

    let diagram = 'classDiagram\n';
    diagram += `    class ${currentFileName} {\n`;
    diagram += `        <<Current File>>\n`;
    diagram += `    }\n`;

    // Add imported files
    imports.forEach((imp) => {
      const importFileName = this.sanitizeFileName(imp.filePath);
      diagram += `    class ${importFileName}\n`;
      diagram += `    ${currentFileName} ..> ${importFileName} : imports\n`;
    });

    // Add dependent files
    dependents.forEach((dep) => {
      const depFileName = this.sanitizeFileName(dep);
      diagram += `    class ${depFileName}\n`;
      diagram += `    ${depFileName} ..> ${currentFileName} : imports\n`;
    });

    // If no dependencies, add a note
    if (imports.length === 0 && dependents.length === 0) {
      diagram += `    note for ${currentFileName} "No project file dependencies found"\n`;
    }

    return diagram;
  }

  /**
   * Generate Mermaid sequence diagram showing cross-file method calls
   * This is a simplified version - full analysis would require deeper code analysis
   */
  private generateSequenceDiagram(
    currentFilePath: string,
    imports: FileImport[],
    projectRoot: string
  ): string | undefined {
    // Only generate if there are imports
    if (imports.length === 0) {
      return undefined;
    }

    const relativePath = path.relative(projectRoot, currentFilePath);
    const currentFileName = this.sanitizeFileName(relativePath);

    let diagram = 'sequenceDiagram\n';
    diagram += `    participant ${currentFileName}\n`;

    imports.forEach((imp) => {
      const importFileName = this.sanitizeFileName(imp.filePath);
      diagram += `    participant ${importFileName}\n`;

      // Show imports as method calls
      if (imp.importedSymbols.length > 0) {
        const symbols = imp.importedSymbols.slice(0, 3).join(', '); // Limit to 3 symbols
        diagram += `    ${currentFileName}->>${importFileName}: uses ${symbols}\n`;
      } else {
        diagram += `    ${currentFileName}->>${importFileName}: imports\n`;
      }
    });

    return diagram;
  }

  /**
   * Sanitize file name for Mermaid diagram
   * Replace special characters with underscores
   */
  private sanitizeFileName(filePath: string): string {
    return filePath
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
