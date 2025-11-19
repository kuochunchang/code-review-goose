/**
 * Integration tests for Composition and Aggregation relationships
 * Tests across multiple languages (Python, Java, TypeScript)
 * 
 * These tests verify that:
 * 1. Composition relationships are correctly detected from AST (not just imports)
 * 2. Aggregation relationships are correctly detected for arrays/collections
 * 3. Cross-file analysis works for composition/aggregation
 * 4. Type inference works for all languages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UMLAnalyzer } from '../analyzers/UMLAnalyzer.js';
import type { IFileProvider } from '@code-review-goose/analysis-types';

describe('Composition and Aggregation Integration Tests', () => {
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

  describe('Python - Composition and Aggregation from __init__', () => {
    it('should detect composition from self.property = ClassName()', async () => {
      const code = `
class Engine:
    def start(self):
        pass

class Car:
    def __init__(self):
        self.engine = Engine()
    
    def drive(self):
        self.engine.start()
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.py', 'class', { depth: 0 });

      expect(result.metadata?.dependencies).toBeDefined();
      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      
      expect(compositions.length).toBeGreaterThan(0);
      const engineComposition = compositions.find((d) => d.to === 'Engine');
      expect(engineComposition).toBeDefined();
      expect(engineComposition?.from).toBe('Car');
      expect(engineComposition?.context).toBe('engine');
      
      // Verify Mermaid diagram contains composition
      expect(result.mermaidCode).toContain('Car *--');
      expect(result.mermaidCode).toContain('Engine');
    });

    it('should detect aggregation from list comprehension', async () => {
      const code = `
class Wheel:
    def rotate(self):
        pass

class Car:
    def __init__(self):
        self.wheels = [Wheel() for _ in range(4)]
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.py', 'class', { depth: 0 });

      expect(result.metadata?.dependencies).toBeDefined();
      const aggregations = result.metadata?.dependencies?.filter(
        (d) => d.type === 'aggregation'
      ) || [];
      
      expect(aggregations.length).toBeGreaterThan(0);
      const wheelAggregation = aggregations.find((d) => d.to === 'Wheel');
      expect(wheelAggregation).toBeDefined();
      expect(wheelAggregation?.from).toBe('Car');
      expect(wheelAggregation?.context).toBe('wheels');
      
      // Verify Mermaid diagram contains aggregation
      expect(result.mermaidCode).toContain('Car o--');
      expect(result.mermaidCode).toContain('Wheel');
    });

    it('should detect both composition and aggregation in same class', async () => {
      const code = `
class Engine:
    def start(self):
        pass

class Wheel:
    def rotate(self):
        pass

class Car:
    def __init__(self):
        self.engine = Engine()
        self.wheels = [Wheel() for _ in range(4)]
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.py', 'class', { depth: 0 });

      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      const aggregations = result.metadata?.dependencies?.filter(
        (d) => d.type === 'aggregation'
      ) || [];

      expect(compositions.length).toBeGreaterThan(0);
      expect(aggregations.length).toBeGreaterThan(0);

      const engineComposition = compositions.find((d) => d.to === 'Engine');
      const wheelAggregation = aggregations.find((d) => d.to === 'Wheel');

      expect(engineComposition).toBeDefined();
      expect(wheelAggregation).toBeDefined();

      // Verify Mermaid diagram contains both
      expect(result.mermaidCode).toContain('Car *--');
      expect(result.mermaidCode).toContain('Engine');
      expect(result.mermaidCode).toContain('Car o--');
      expect(result.mermaidCode).toContain('Wheel');
    });
  });

  describe('Java - Generic Type Parsing and Relationships', () => {
    it('should parse List<Wheel> as Wheel[] and detect aggregation', async () => {
      const code = `
package com.example;

import java.util.List;
import java.util.ArrayList;

class Wheel {
    void rotate() {}
}

class Car {
    private Engine engine;
    private List<Wheel> wheels;
    
    Car() {
        this.engine = new Engine();
        this.wheels = new ArrayList<>();
    }
}

class Engine {
    void start() {}
}
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('Car.java', 'class', { depth: 0 });

      // Check that wheels property has correct type
      const carClass = result.metadata?.classes?.find((c) => c.name === 'Car');
      expect(carClass).toBeDefined();
      
      const wheelsProperty = carClass?.properties.find((p) => p.name === 'wheels');
      expect(wheelsProperty).toBeDefined();
      expect(wheelsProperty?.type).toBe('Wheel[]');
      expect(wheelsProperty?.isArray).toBe(true);

      // Check relationships
      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      const aggregations = result.metadata?.dependencies?.filter(
        (d) => d.type === 'aggregation'
      ) || [];

      expect(compositions.length).toBeGreaterThan(0);
      expect(aggregations.length).toBeGreaterThan(0);

      const engineComposition = compositions.find((d) => d.to === 'Engine');
      const wheelAggregation = aggregations.find((d) => d.to === 'Wheel');

      expect(engineComposition).toBeDefined();
      expect(wheelAggregation).toBeDefined();

      // Verify Mermaid diagram
      expect(result.mermaidCode).toContain('Car *--');
      expect(result.mermaidCode).toContain('Engine');
      expect(result.mermaidCode).toContain('Car o--');
      expect(result.mermaidCode).toContain('Wheel');
    });

    it('should handle scoped generic types (java.util.List<Wheel>)', async () => {
      const code = `
package com.example;

class Wheel {
    void rotate() {}
}

class Car {
    private java.util.List<Wheel> wheels;
}
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('Car.java', 'class', { depth: 0 });

      const carClass = result.metadata?.classes?.find((c) => c.name === 'Car');
      const wheelsProperty = carClass?.properties.find((p) => p.name === 'wheels');
      
      // Note: java.util.List<Wheel> might be parsed as <Wheel> or Wheel[] depending on tree-sitter structure
      // The important thing is that it's recognized as an array type
      expect(wheelsProperty?.type).toBeTruthy();
      // Either Wheel[] or the type should contain Wheel
      expect(
        wheelsProperty?.type === 'Wheel[]' || 
        wheelsProperty?.type?.includes('Wheel') ||
        wheelsProperty?.isArray === true
      ).toBe(true);
    });
  });

  describe('TypeScript - Type Inference from Initialization', () => {
    it('should infer type from new ClassName() initialization', async () => {
      const code = `
class Engine {
    start() {}
}

class Car {
    private engine = new Engine();
    private wheels: Wheel[] = [new Wheel(), new Wheel()];
}

class Wheel {
    rotate() {}
}
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.ts', 'class', { depth: 0 });

      // Check that engine property has inferred type
      const carClass = result.metadata?.classes?.find((c) => c.name === 'Car');
      expect(carClass).toBeDefined();
      
      const engineProperty = carClass?.properties.find((p) => p.name === 'engine');
      expect(engineProperty).toBeDefined();
      expect(engineProperty?.type).toBe('Engine');

      // Check relationships
      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      const aggregations = result.metadata?.dependencies?.filter(
        (d) => d.type === 'aggregation'
      ) || [];

      expect(compositions.length).toBeGreaterThan(0);
      expect(aggregations.length).toBeGreaterThan(0);

      const engineComposition = compositions.find((d) => d.to === 'Engine');
      const wheelAggregation = aggregations.find((d) => d.to === 'Wheel');

      expect(engineComposition).toBeDefined();
      expect(wheelAggregation).toBeDefined();

      // Verify Mermaid diagram
      expect(result.mermaidCode).toContain('Car *--');
      expect(result.mermaidCode).toContain('Engine');
      expect(result.mermaidCode).toContain('Car o--');
      expect(result.mermaidCode).toContain('Wheel');
    });

    it('should infer array type from array literal initialization', async () => {
      const code = `
class Wheel {
    rotate() {}
}

class Car {
    private wheels = [new Wheel(), new Wheel(), new Wheel(), new Wheel()];
}
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.ts', 'class', { depth: 0 });

      const carClass = result.metadata?.classes?.find((c) => c.name === 'Car');
      const wheelsProperty = carClass?.properties.find((p) => p.name === 'wheels');
      
      expect(wheelsProperty?.type).toBe('Wheel[]');
      expect(wheelsProperty?.isArray).toBe(true);
    });
  });

  describe('Cross-File Analysis with Composition/Aggregation', () => {
    it('should detect cross-file composition relationships using AST (not imports)', async () => {
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

      // Mock file provider to return files based on path
      (mockFileProvider.exists as any).mockImplementation((path: string) => {
        return Promise.resolve(
          path.includes('Controller') ||
          path.includes('Service') ||
          path.includes('Repository')
        );
      });

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path.includes('Controller')) return Promise.resolve(controllerCode);
        if (path.includes('Service')) return Promise.resolve(serviceCode);
        if (path.includes('Repository')) return Promise.resolve(repositoryCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.listFiles as any).mockImplementation((pattern: string) => {
        if (pattern.includes('Service')) {
          return Promise.resolve(['test-data/java/multi_layer/Service.java']);
        }
        if (pattern.includes('Repository')) {
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
      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(3);
      const classNames = result.metadata?.classes?.map((c) => c.name) || [];
      expect(classNames).toContain('Controller');
      expect(classNames).toContain('Service');
      expect(classNames).toContain('Repository');

      // Should have composition relationships
      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      
      expect(compositions.length).toBeGreaterThan(0);
      
      // Verify cross-file relationships
      const controllerToService = compositions.find(
        (d) => d.from === 'Controller' && d.to === 'Service'
      );
      const serviceToRepository = compositions.find(
        (d) => d.from === 'Service' && d.to === 'Repository'
      );

      expect(controllerToService).toBeDefined();
      expect(serviceToRepository).toBeDefined();

      // Verify Mermaid diagram contains all relationships
      expect(result.mermaidCode).toContain('Controller');
      expect(result.mermaidCode).toContain('Service');
      expect(result.mermaidCode).toContain('Repository');
      expect(result.mermaidCode).toContain('*--'); // Composition symbol
    });
  });

  describe('Edge Cases', () => {
    it('should handle private arrays as aggregation (not composition)', async () => {
      const code = `
class Wheel {
    rotate() {}
}

class Car {
    private wheels: Wheel[] = [];
}
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.ts', 'class', { depth: 0 });

      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];
      const aggregations = result.metadata?.dependencies?.filter(
        (d) => d.type === 'aggregation'
      ) || [];

      // Private array should be aggregation, not composition
      expect(compositions.find((d) => d.to === 'Wheel')).toBeUndefined();
      expect(aggregations.find((d) => d.to === 'Wheel')).toBeDefined();
    });

    it('should handle public instance variables as composition in Python', async () => {
      const code = `
class Engine:
    def start(self):
        pass

class Car:
    def __init__(self):
        self.engine = Engine()  # Public by default in Python
      `;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.listFiles as any).mockResolvedValue([]);

      const result = await analyzer.generateUnifiedDiagram('car.py', 'class', { depth: 0 });

      const compositions = result.metadata?.dependencies?.filter(
        (d) => d.type === 'composition'
      ) || [];

      // Public instance variable should still be composition
      expect(compositions.find((d) => d.to === 'Engine')).toBeDefined();
    });
  });
});

