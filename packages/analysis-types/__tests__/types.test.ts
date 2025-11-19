import { describe, it, expect } from 'vitest';
import type {
  // Language support
  SupportedLanguage,
  // Import/Export
  ImportInfo,
  ExportInfo,
  // Object-Oriented relationships
  OORelationshipType,
  Cardinality,
  DependencyInfo,
  // Class structure
  PropertyInfo,
  ParameterInfo,
  MethodInfo,
  ResolvedTypeInfo,
  ClassInfo,
  InterfaceInfo,
  FunctionInfo,
  // Unified AST
  UnifiedAST,
  ASTCacheEntry,
  // Analysis results
  OOAnalysisResult,
  CrossFileAnalysisOptions,
  FileAnalysisResult,
  BidirectionalAnalysisResult,
  // Import index
  ImportIndex,
  ImportIndexOptions,
  CrossFileDependencyGraph,
} from '../src/ast.js';
import type { IFileProvider, ICacheProvider } from '../src/providers.js';
import type {
  DiagramType,
  DiagramGenerationMode,
  FlowNode,
  InteractionInfo,
  SequenceInfo,
  SimpleDependencyInfo,
  UMLResult,
  UMLDiagrams,
} from '../src/uml.js';

describe('analysis-types', () => {
  describe('Type exports', () => {
    it('should export SupportedLanguage type', () => {
      const languages: SupportedLanguage[] = ['javascript', 'typescript', 'java', 'python', 'go'];
      expect(languages).toHaveLength(5);
    });

    it('should export OORelationshipType type', () => {
      const relationships: OORelationshipType[] = [
        'inheritance',
        'realization',
        'composition',
        'aggregation',
        'dependency',
        'association',
        'injection',
      ];
      expect(relationships).toHaveLength(7);
    });

    it('should export Cardinality type', () => {
      const cardinalities: Cardinality[] = ['1', '0..1', '1..*', '*', '0..*'];
      expect(cardinalities).toHaveLength(5);
    });

    it('should export DiagramType type', () => {
      const diagramTypes: DiagramType[] = ['class', 'flowchart', 'sequence'];
      expect(diagramTypes).toHaveLength(3);
    });

    it('should export DiagramGenerationMode type', () => {
      const modes: DiagramGenerationMode[] = ['native'];
      expect(modes).toHaveLength(1);
    });
  });

  describe('ImportInfo interface', () => {
    it('should create valid ImportInfo object', () => {
      const importInfo: ImportInfo = {
        source: './utils',
        specifiers: ['helper', 'helper2'],
        isDefault: false,
        isNamespace: false,
        isDynamic: false,
        lineNumber: 1,
      };
      expect(importInfo.source).toBe('./utils');
      expect(importInfo.specifiers).toHaveLength(2);
    });

    it('should support default import', () => {
      const importInfo: ImportInfo = {
        source: 'react',
        specifiers: ['React'],
        isDefault: true,
        isNamespace: false,
        isDynamic: false,
        lineNumber: 1,
      };
      expect(importInfo.isDefault).toBe(true);
    });

    it('should support namespace import', () => {
      const importInfo: ImportInfo = {
        source: 'react',
        specifiers: [],
        isDefault: false,
        isNamespace: true,
        namespaceAlias: 'React',
        isDynamic: false,
        lineNumber: 1,
      };
      expect(importInfo.isNamespace).toBe(true);
      expect(importInfo.namespaceAlias).toBe('React');
    });

    it('should support type-only import', () => {
      const importInfo: ImportInfo = {
        source: './types',
        specifiers: ['User'],
        isDefault: false,
        isNamespace: false,
        isDynamic: false,
        isTypeOnly: true,
        lineNumber: 1,
      };
      expect(importInfo.isTypeOnly).toBe(true);
    });
  });

  describe('ExportInfo interface', () => {
    it('should create valid ExportInfo object', () => {
      const exportInfo: ExportInfo = {
        name: 'User',
        isDefault: false,
        isReExport: false,
        exportType: 'class',
        lineNumber: 1,
      };
      expect(exportInfo.name).toBe('User');
      expect(exportInfo.exportType).toBe('class');
    });

    it('should support re-export', () => {
      const exportInfo: ExportInfo = {
        name: 'User',
        isDefault: false,
        isReExport: true,
        source: './user',
        exportType: 'class',
        lineNumber: 1,
      };
      expect(exportInfo.isReExport).toBe(true);
      expect(exportInfo.source).toBe('./user');
    });

    it('should support visibility modifier', () => {
      const exportInfo: ExportInfo = {
        name: 'User',
        isDefault: false,
        isReExport: false,
        exportType: 'class',
        visibility: 'public',
        lineNumber: 1,
      };
      expect(exportInfo.visibility).toBe('public');
    });
  });

  describe('DependencyInfo interface', () => {
    it('should create valid DependencyInfo object', () => {
      const dependency: DependencyInfo = {
        from: 'Car',
        to: 'Engine',
        type: 'composition',
        cardinality: '1',
        lineNumber: 10,
      };
      expect(dependency.from).toBe('Car');
      expect(dependency.type).toBe('composition');
    });

    it('should support external dependencies', () => {
      const dependency: DependencyInfo = {
        from: 'User',
        to: 'Date',
        type: 'dependency',
        isExternal: true,
        sourceModule: 'java.util',
        lineNumber: 5,
      };
      expect(dependency.isExternal).toBe(true);
      expect(dependency.sourceModule).toBe('java.util');
    });
  });

  describe('PropertyInfo interface', () => {
    it('should create valid PropertyInfo object', () => {
      const property: PropertyInfo = {
        name: 'name',
        type: 'string',
        visibility: 'private',
        lineNumber: 5,
      };
      expect(property.name).toBe('name');
      expect(property.visibility).toBe('private');
    });

    it('should support optional properties', () => {
      const property: PropertyInfo = {
        name: 'email',
        type: 'string',
        visibility: 'public',
        isOptional: true,
        isReadonly: true,
        lineNumber: 6,
      };
      expect(property.isOptional).toBe(true);
      expect(property.isReadonly).toBe(true);
    });

    it('should support resolved type info', () => {
      const resolvedType: ResolvedTypeInfo = {
        typeName: 'Person',
        isArray: false,
        isPrimitive: false,
        isClassType: true,
        isInterfaceType: false,
        isExternal: false,
      };
      const property: PropertyInfo = {
        name: 'owner',
        type: 'Person',
        visibility: 'public',
        resolvedType,
        lineNumber: 7,
      };
      expect(property.resolvedType?.isClassType).toBe(true);
    });
  });

  describe('MethodInfo interface', () => {
    it('should create valid MethodInfo object', () => {
      const method: MethodInfo = {
        name: 'getName',
        parameters: [],
        returnType: 'string',
        visibility: 'public',
        lineNumber: 10,
      };
      expect(method.name).toBe('getName');
      expect(method.parameters).toHaveLength(0);
    });

    it('should support parameters', () => {
      const method: MethodInfo = {
        name: 'setName',
        parameters: [
          {
            name: 'name',
            type: 'string',
          },
        ],
        returnType: 'void',
        visibility: 'public',
        lineNumber: 11,
      };
      expect(method.parameters).toHaveLength(1);
      expect(method.parameters[0].name).toBe('name');
    });

    it('should support async methods', () => {
      const method: MethodInfo = {
        name: 'fetchData',
        parameters: [],
        returnType: 'Promise<string>',
        visibility: 'public',
        isAsync: true,
        lineNumber: 12,
      };
      expect(method.isAsync).toBe(true);
    });
  });

  describe('ClassInfo interface', () => {
    it('should create valid ClassInfo object', () => {
      const classInfo: ClassInfo = {
        name: 'User',
        type: 'class',
        properties: [],
        methods: [],
        lineNumber: 1,
      };
      expect(classInfo.name).toBe('User');
      expect(classInfo.type).toBe('class');
    });

    it('should support inheritance', () => {
      const classInfo: ClassInfo = {
        name: 'Dog',
        type: 'class',
        properties: [],
        methods: [],
        extends: 'Animal',
        lineNumber: 1,
      };
      expect(classInfo.extends).toBe('Animal');
    });

    it('should support interface implementation', () => {
      const classInfo: ClassInfo = {
        name: 'User',
        type: 'class',
        properties: [],
        methods: [],
        implements: ['Serializable', 'Comparable'],
        lineNumber: 1,
      };
      expect(classInfo.implements).toHaveLength(2);
    });

    it('should support constructor parameters', () => {
      const classInfo: ClassInfo = {
        name: 'UserService',
        type: 'class',
        properties: [],
        methods: [],
        constructorParams: [
          {
            name: 'userRepository',
            type: 'UserRepository',
          },
        ],
        lineNumber: 1,
      };
      expect(classInfo.constructorParams).toHaveLength(1);
    });
  });

  describe('InterfaceInfo interface', () => {
    it('should create valid InterfaceInfo object', () => {
      const interfaceInfo: InterfaceInfo = {
        name: 'IUser',
        type: 'interface',
        properties: [],
        methods: [],
        lineNumber: 1,
      };
      expect(interfaceInfo.name).toBe('IUser');
      expect(interfaceInfo.type).toBe('interface');
    });

    it('should support extended interfaces', () => {
      const interfaceInfo: InterfaceInfo = {
        name: 'IAdmin',
        type: 'interface',
        properties: [],
        methods: [],
        extends: ['IUser', 'IPermission'],
        lineNumber: 1,
      };
      expect(interfaceInfo.extends).toHaveLength(2);
    });
  });

  describe('UnifiedAST interface', () => {
    it('should create valid UnifiedAST object', () => {
      const ast: UnifiedAST = {
        language: 'typescript',
        filePath: '/src/user.ts',
        imports: [],
        exports: [],
        classes: [],
        interfaces: [],
        functions: [],
        dependencies: [],
      };
      expect(ast.language).toBe('typescript');
      expect(ast.filePath).toBe('/src/user.ts');
    });

    it('should support all language types', () => {
      const languages: SupportedLanguage[] = ['javascript', 'typescript', 'java', 'python', 'go'];
      languages.forEach((lang) => {
        const ast: UnifiedAST = {
          language: lang,
          filePath: `/test.${lang}`,
          imports: [],
          exports: [],
          classes: [],
          interfaces: [],
          functions: [],
          dependencies: [],
        };
        expect(ast.language).toBe(lang);
      });
    });
  });

  describe('ASTCacheEntry interface', () => {
    it('should create valid ASTCacheEntry object', () => {
      const cacheEntry: ASTCacheEntry = {
        filePath: '/src/user.ts',
        codeHash: 'abc123',
        ast: {
          language: 'typescript',
          filePath: '/src/user.ts',
          imports: [],
          exports: [],
          classes: [],
          interfaces: [],
          functions: [],
          dependencies: [],
        },
        timestamp: Date.now(),
        fileSize: 1024,
      };
      expect(cacheEntry.filePath).toBe('/src/user.ts');
      expect(cacheEntry.codeHash).toBe('abc123');
      expect(cacheEntry.fileSize).toBe(1024);
    });
  });

  describe('OOAnalysisResult interface', () => {
    it('should create valid OOAnalysisResult object', () => {
      const result: OOAnalysisResult = {
        relationships: [],
        inheritanceTree: new Map(),
        compositions: [],
        aggregations: [],
        dependencies: [],
        associations: [],
        injections: [],
      };
      expect(result.relationships).toHaveLength(0);
      expect(result.inheritanceTree.size).toBe(0);
    });
  });

  describe('CrossFileAnalysisOptions interface', () => {
    it('should create valid CrossFileAnalysisOptions object', () => {
      const options: CrossFileAnalysisOptions = {
        depth: 2,
        includeExternalTypes: false,
        ignorePatterns: ['node_modules/**'],
      };
      expect(options.depth).toBe(2);
      expect(options.includeExternalTypes).toBe(false);
    });
  });

  describe('FileAnalysisResult interface', () => {
    it('should create valid FileAnalysisResult object', () => {
      const result: FileAnalysisResult = {
        filePath: '/src/user.ts',
        classes: [],
        imports: [],
        exports: [],
        depth: 0,
        relationships: [],
      };
      expect(result.filePath).toBe('/src/user.ts');
      expect(result.depth).toBe(0);
    });
  });

  describe('BidirectionalAnalysisResult interface', () => {
    it('should create valid BidirectionalAnalysisResult object', () => {
      const result: BidirectionalAnalysisResult = {
        targetFile: '/src/user.ts',
        forwardDeps: [],
        reverseDeps: [],
        allClasses: [],
        relationships: [],
        stats: {
          totalFiles: 0,
          totalClasses: 0,
          totalRelationships: 0,
          maxDepth: 0,
        },
      };
      expect(result.targetFile).toBe('/src/user.ts');
      expect(result.stats.totalFiles).toBe(0);
    });
  });

  describe('ImportIndex interface', () => {
    it('should create valid ImportIndex object', () => {
      const index: ImportIndex = {
        fileToImports: new Map(),
        importToFiles: new Map(),
        timestamp: Date.now(),
        fileCount: 0,
      };
      expect(index.fileToImports.size).toBe(0);
      expect(index.fileCount).toBe(0);
    });
  });

  describe('ImportIndexOptions interface', () => {
    it('should create valid ImportIndexOptions object', () => {
      const options: ImportIndexOptions = {
        projectPath: '/project',
        extensions: ['.ts', '.tsx'],
        ignorePatterns: ['node_modules/**'],
        maxFiles: 1000,
        concurrency: 4,
      };
      expect(options.projectPath).toBe('/project');
      expect(options.extensions).toHaveLength(2);
    });
  });

  describe('CrossFileDependencyGraph interface', () => {
    it('should create valid CrossFileDependencyGraph object', () => {
      const graph: CrossFileDependencyGraph = {
        nodes: new Map(),
        edges: [],
        entryPoint: '/src/main.ts',
        maxDepth: 2,
      };
      expect(graph.entryPoint).toBe('/src/main.ts');
      expect(graph.maxDepth).toBe(2);
    });
  });

  describe('IFileProvider interface', () => {
    it('should be implementable', () => {
      const provider: IFileProvider = {
        readFile: async (path: string) => {
          return `content of ${path}`;
        },
        resolveImport: async (from: string, to: string) => {
          return `${from}/${to}`;
        },
        listFiles: async (pattern: string) => {
          return [];
        },
        exists: async (path: string) => {
          return true;
        },
      };
      expect(provider).toBeDefined();
      expect(typeof provider.readFile).toBe('function');
    });
  });

  describe('ICacheProvider interface', () => {
    it('should be implementable', () => {
      const provider: ICacheProvider = {
        get: async <T>(key: string) => {
          return null as T | null;
        },
        set: async <T>(key: string, value: T, ttl?: number) => {
          // Implementation
        },
        delete: async (key: string) => {
          // Implementation
        },
        clear: async () => {
          // Implementation
        },
      };
      expect(provider).toBeDefined();
      expect(typeof provider.get).toBe('function');
    });
  });

  describe('FlowNode interface', () => {
    it('should create valid FlowNode object', () => {
      const node: FlowNode = {
        id: 'start',
        type: 'start',
        label: 'Start',
      };
      expect(node.id).toBe('start');
      expect(node.type).toBe('start');
    });

    it('should support next nodes', () => {
      const node: FlowNode = {
        id: 'process1',
        type: 'process',
        label: 'Process',
        next: ['process2', 'end'],
      };
      expect(node.next).toHaveLength(2);
    });
  });

  describe('InteractionInfo interface', () => {
    it('should create valid InteractionInfo object', () => {
      const interaction: InteractionInfo = {
        from: 'User',
        to: 'Service',
        message: 'getData()',
        type: 'sync',
      };
      expect(interaction.from).toBe('User');
      expect(interaction.type).toBe('sync');
    });
  });

  describe('SequenceInfo interface', () => {
    it('should create valid SequenceInfo object', () => {
      const sequence: SequenceInfo = {
        participant: 'User',
        interactions: [],
      };
      expect(sequence.participant).toBe('User');
      expect(sequence.interactions).toHaveLength(0);
    });
  });

  describe('SimpleDependencyInfo interface', () => {
    it('should create valid SimpleDependencyInfo object', () => {
      const dep: SimpleDependencyInfo = {
        from: 'User',
        to: 'Service',
        type: 'usage',
      };
      expect(dep.from).toBe('User');
      expect(dep.type).toBe('usage');
    });
  });

  describe('UMLResult interface', () => {
    it('should create valid UMLResult object', () => {
      const result: UMLResult = {
        type: 'class',
        mermaidCode: 'classDiagram',
        generationMode: 'native',
      };
      expect(result.type).toBe('class');
      expect(result.generationMode).toBe('native');
    });

    it('should support metadata', () => {
      const result: UMLResult = {
        type: 'class',
        mermaidCode: 'classDiagram',
        generationMode: 'native',
        metadata: {
          classes: [],
          functions: ['test'],
          autoFixed: true,
        },
      };
      expect(result.metadata?.classes).toHaveLength(0);
      expect(result.metadata?.autoFixed).toBe(true);
    });
  });

  describe('UMLDiagrams interface', () => {
    it('should create valid UMLDiagrams object', () => {
      const diagrams: UMLDiagrams = {
        class: {
          type: 'class',
          mermaidCode: 'classDiagram',
          generationMode: 'native',
        },
        flowchart: {
          type: 'flowchart',
          mermaidCode: 'flowchart TD',
          generationMode: 'native',
        },
      };
      expect(diagrams.class).toBeDefined();
      expect(diagrams.flowchart).toBeDefined();
    });
  });
});

