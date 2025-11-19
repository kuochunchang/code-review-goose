/**
 * Integration tests for AST-based cross-file analysis
 * 
 * These tests verify that cross-file analysis works by:
 * 1. Extracting class dependencies from AST relationships (not just imports)
 * 2. Finding class files by searching the project
 * 3. Supporting same-package classes without imports (Java)
 * 4. Supporting relative imports (Python)
 * 5. Working across multiple languages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UMLAnalyzer } from '../analyzers/UMLAnalyzer.js';
import type { IFileProvider } from '@code-review-goose/analysis-types';

describe('Cross-File AST-Based Analysis Integration Tests', () => {
  let analyzer: UMLAnalyzer;
  let mockFileProvider: IFileProvider;

  beforeEach(() => {
    mockFileProvider = {
      readFile: vi.fn(),
      exists: vi.fn(),
      resolveImport: vi.fn(),
      listFiles: vi.fn(),
      getProjectRoot: vi.fn(),
    };

    analyzer = new UMLAnalyzer(mockFileProvider);
  });

  describe('Java - Same Package Classes (No Imports)', () => {
    it('should find same-package classes via AST relationships', async () => {
      const controllerCode = `
package com.example.multilayer;

public class Controller {
    private Service service;
    
    public Controller() {
        this.service = new Service();
    }
}
      `;

      const serviceCode = `
package com.example.multilayer;

public class Service {
    private Repository repository;
    
    public Service() {
        this.repository = new Repository();
    }
}
      `;

      const repositoryCode = `
package com.example.multilayer;

public class Repository {
    public String getData(String id) {
        return "Data for " + id;
    }
}
      `;

      // Mock file system
      const fileMap: Record<string, string> = {
        'test-data/java/multi_layer/Controller.java': controllerCode,
        'test-data/java/multi_layer/Service.java': serviceCode,
        'test-data/java/multi_layer/Repository.java': repositoryCode,
      };

      (mockFileProvider.exists as any).mockImplementation((path: string) => {
        return Promise.resolve(path in fileMap);
      });

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path in fileMap) {
          return Promise.resolve(fileMap[path]);
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });

      (mockFileProvider.listFiles as any).mockImplementation((pattern: string) => {
        if (pattern.includes('Service.java')) {
          return Promise.resolve(['test-data/java/multi_layer/Service.java']);
        }
        if (pattern.includes('Repository.java')) {
          return Promise.resolve(['test-data/java/multi_layer/Repository.java']);
        }
        return Promise.resolve([]);
      });

      const result = await analyzer.generateUnifiedDiagram(
        'test-data/java/multi_layer/Controller.java',
        'class',
        { depth: 2 }
      );

      // Should have all three classes
      expect(result.metadata?.classes?.length).toBe(3);
      const classNames = result.metadata?.classes?.map((c) => c.name) || [];
      expect(classNames).toContain('Controller');
      expect(classNames).toContain('Service');
      expect(classNames).toContain('Repository');

      // Should have cross-file relationships
      const relationships = result.metadata?.dependencies || [];
      expect(relationships.length).toBeGreaterThan(0);

      // Verify cross-file stats
      expect(result.metadata?.crossFileStats).toBeDefined();
      expect(result.metadata?.crossFileStats?.totalFiles).toBe(3);
      expect(result.metadata?.crossFileStats?.totalClasses).toBe(3);

      // Verify Mermaid diagram contains all classes
      expect(result.mermaidCode).toContain('Controller');
      expect(result.mermaidCode).toContain('Service');
      expect(result.mermaidCode).toContain('Repository');
    });
  });

  describe('Python - Relative Imports and AST Relationships', () => {
    it('should find classes via relative imports and AST relationships', async () => {
      const layer1Code = `
from .layer_2 import Service

class Controller:
    def __init__(self):
        self.service = Service("svc-1")
    
    def handle_request(self, input_val: int):
        result = self.service.process(input_val)
        print(f"Result: {result}")
      `;

      const layer2Code = `
from .layer_3 import BaseEntity, common_util

class Service(BaseEntity):
    def process(self, data: int) -> int:
        return common_util(data) + 10
    
    def get_service_info(self):
        return f"Service ID: {self.id}"
      `;

      const layer3Code = `
class BaseEntity:
    def __init__(self, id: str):
        self.id = id
    
    def to_dict(self):
        return {"id": self.id}

def common_util(x: int) -> int:
    return x * 2
      `;

      const fileMap: Record<string, string> = {
        'test-data/python/multi_layer/layer_1.py': layer1Code,
        'test-data/python/multi_layer/layer_2.py': layer2Code,
        'test-data/python/multi_layer/layer_3.py': layer3Code,
      };

      (mockFileProvider.exists as any).mockImplementation((path: string) => {
        return Promise.resolve(path in fileMap);
      });

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path in fileMap) {
          return Promise.resolve(fileMap[path]);
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });

      (mockFileProvider.resolveImport as any).mockImplementation(
        (from: string, to: string) => {
          if (to === '.layer_2') {
            return Promise.resolve('test-data/python/multi_layer/layer_2.py');
          }
          if (to === '.layer_3') {
            return Promise.resolve('test-data/python/multi_layer/layer_3.py');
          }
          return Promise.resolve(null);
        }
      );

      (mockFileProvider.listFiles as any).mockImplementation((pattern: string) => {
        if (pattern.includes('Service.py')) {
          return Promise.resolve(['test-data/python/multi_layer/layer_2.py']);
        }
        if (pattern.includes('BaseEntity.py')) {
          return Promise.resolve(['test-data/python/multi_layer/layer_3.py']);
        }
        return Promise.resolve([]);
      });

      const result = await analyzer.generateUnifiedDiagram(
        'test-data/python/multi_layer/layer_1.py',
        'class',
        { depth: 2 }
      );

      // Should have all three classes
      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(3);
      const classNames = result.metadata?.classes?.map((c) => c.name) || [];
      expect(classNames).toContain('Controller');
      expect(classNames).toContain('Service');
      expect(classNames).toContain('BaseEntity');

      // Verify cross-file stats
      expect(result.metadata?.crossFileStats).toBeDefined();
      expect(result.metadata?.crossFileStats?.totalFiles).toBeGreaterThanOrEqual(3);

      // Verify Mermaid diagram contains all classes
      expect(result.mermaidCode).toContain('Controller');
      expect(result.mermaidCode).toContain('Service');
      expect(result.mermaidCode).toContain('BaseEntity');
    });
  });

  describe('TypeScript - Cross-File with Composition', () => {
    it('should analyze cross-file composition relationships', async () => {
      const featureCode = `
import { Helper } from './helper';

export class Feature {
    private helper: Helper;
    
    constructor() {
        this.helper = new Helper();
    }
    
    run() {
        const result = this.helper.process({ id: 123, name: "Test" });
        console.log(result);
    }
}
      `;

      const helperCode = `
import { formatDate, log } from './utils';

export class Helper {
    private utils: typeof import('./utils');
    
    static process(data: any) {
        log(\`Processing data at \${formatDate(new Date())}\`);
        return { processed: true, ...data };
    }
}
      `;

      const utilsCode = `
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function log(message: string) {
    console.log(\`[LOG]: \${message}\`);
}
      `;

      const fileMap: Record<string, string> = {
        'test-data/typescript/multi_layer/feature.ts': featureCode,
        'test-data/typescript/multi_layer/helper.ts': helperCode,
        'test-data/typescript/multi_layer/utils.ts': utilsCode,
      };

      (mockFileProvider.exists as any).mockImplementation((path: string) => {
        return Promise.resolve(path in fileMap);
      });

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path in fileMap) {
          return Promise.resolve(fileMap[path]);
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });

      (mockFileProvider.resolveImport as any).mockImplementation(
        (from: string, to: string) => {
          if (to === './helper') {
            return Promise.resolve('test-data/typescript/multi_layer/helper.ts');
          }
          if (to === './utils') {
            return Promise.resolve('test-data/typescript/multi_layer/utils.ts');
          }
          return Promise.resolve(null);
        }
      );

      (mockFileProvider.listFiles as any).mockImplementation((pattern: string) => {
        if (pattern.includes('Helper.ts')) {
          return Promise.resolve(['test-data/typescript/multi_layer/helper.ts']);
        }
        return Promise.resolve([]);
      });

      const result = await analyzer.generateUnifiedDiagram(
        'test-data/typescript/multi_layer/feature.ts',
        'class',
        { depth: 1 }
      );

      // Should have Feature and Helper classes
      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(2);
      const classNames = result.metadata?.classes?.map((c) => c.name) || [];
      expect(classNames).toContain('Feature');
      expect(classNames).toContain('Helper');

      // Verify cross-file stats
      expect(result.metadata?.crossFileStats).toBeDefined();
      expect(result.metadata?.crossFileStats?.totalFiles).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Depth Control', () => {
    it('should respect depth parameter for cross-file analysis', async () => {
      const controllerCode = `
package com.example;

public class Controller {
    private Service service;
}
      `;

      const serviceCode = `
package com.example;

public class Service {
    private Repository repository;
}
      `;

      const repositoryCode = `
package com.example;

public class Repository {
    public String getData(String id) {
        return "Data for " + id;
    }
}
      `;

      const fileMap: Record<string, string> = {
        'test-data/java/multi_layer/Controller.java': controllerCode,
        'test-data/java/multi_layer/Service.java': serviceCode,
        'test-data/java/multi_layer/Repository.java': repositoryCode,
      };

      (mockFileProvider.exists as any).mockImplementation((path: string) => {
        return Promise.resolve(path in fileMap);
      });

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path in fileMap) {
          return Promise.resolve(fileMap[path]);
        }
        return Promise.reject(new Error(`File not found: ${path}`));
      });

      (mockFileProvider.listFiles as any).mockImplementation((pattern: string) => {
        if (pattern.includes('Service.java')) {
          return Promise.resolve(['test-data/java/multi_layer/Service.java']);
        }
        if (pattern.includes('Repository.java')) {
          return Promise.resolve(['test-data/java/multi_layer/Repository.java']);
        }
        return Promise.resolve([]);
      });

      // Depth 0: Single file only
      const depth0Result = await analyzer.generateUnifiedDiagram(
        'test-data/java/multi_layer/Controller.java',
        'class',
        { depth: 0 }
      );
      expect(depth0Result.metadata?.classes?.length).toBe(1);
      expect(depth0Result.metadata?.singleFile).toBe(true);

      // Depth 1: One level of dependencies
      const depth1Result = await analyzer.generateUnifiedDiagram(
        'test-data/java/multi_layer/Controller.java',
        'class',
        { depth: 1 }
      );
      expect(depth1Result.metadata?.classes?.length).toBeGreaterThanOrEqual(2);
      expect(depth1Result.metadata?.singleFile).toBe(false);
      expect(depth1Result.metadata?.crossFileStats?.totalFiles).toBeGreaterThanOrEqual(2);

      // Depth 2: Two levels of dependencies
      const depth2Result = await analyzer.generateUnifiedDiagram(
        'test-data/java/multi_layer/Controller.java',
        'class',
        { depth: 2 }
      );
      expect(depth2Result.metadata?.classes?.length).toBeGreaterThanOrEqual(3);
      expect(depth2Result.metadata?.crossFileStats?.totalFiles).toBeGreaterThanOrEqual(3);
    });
  });
});

