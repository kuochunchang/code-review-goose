import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import type { InsightRecord, InsightCheckResult, DiagramType, UMLDiagrams } from '../types/insight.js';
import type { AnalysisResult } from '../types/ai.js';
import type { UMLResult } from './umlService.js';

const INSIGHTS_DIR = '.code-review/insights';

export class InsightService {
  private insightsDir: string;

  constructor(projectPath: string) {
    this.insightsDir = path.join(projectPath, INSIGHTS_DIR);
  }

  /**
   * Compute SHA256 hash of code
   */
  static computeHash(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Ensure insights directory exists
   */
  private async ensureInsightsDir(): Promise<void> {
    await fs.ensureDir(this.insightsDir);
  }

  /**
   * Get insight file path from filePath
   * Convert file path to safe filename
   */
  private getInsightPath(filePath: string): string {
    // Convert file path to base64 to avoid filesystem issues
    const safeFileName = Buffer.from(filePath).toString('base64').replace(/[/+=]/g, '_');
    return path.join(this.insightsDir, `${safeFileName}.json`);
  }

  /**
   * Get insight record for a file
   */
  async get(filePath: string): Promise<InsightRecord | null> {
    try {
      const insightPath = this.getInsightPath(filePath);

      if (!(await fs.pathExists(insightPath))) {
        return null;
      }

      const content = await fs.readFile(insightPath, 'utf-8');
      return JSON.parse(content) as InsightRecord;
    } catch (error) {
      console.error(`Error reading insight for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if insight exists and whether hash matches
   */
  async check(filePath: string, currentHash: string): Promise<InsightCheckResult> {
    const insight = await this.get(filePath);

    if (!insight) {
      return {
        hasRecord: false,
        hashMatched: false,
        insight: null,
      };
    }

    return {
      hasRecord: true,
      hashMatched: insight.codeHash === currentHash,
      insight,
    };
  }

  /**
   * Save or update insight record
   */
  async set(filePath: string, codeHash: string, analysis: AnalysisResult): Promise<InsightRecord> {
    await this.ensureInsightsDir();

    // Get existing insight to preserve UML if it exists
    const existing = await this.get(filePath);

    const insight: InsightRecord = {
      filePath,
      codeHash,
      analysis,
      uml: existing?.uml, // Preserve existing UML diagrams
      timestamp: new Date().toISOString(),
    };

    const insightPath = this.getInsightPath(filePath);
    await fs.writeFile(insightPath, JSON.stringify(insight, null, 2), 'utf-8');

    return insight;
  }

  /**
   * Set UML diagram for a specific type
   */
  async setUML(
    filePath: string,
    codeHash: string,
    diagramType: DiagramType,
    umlResult: UMLResult
  ): Promise<InsightRecord> {
    await this.ensureInsightsDir();

    // Get existing insight or create new one
    const existing = await this.get(filePath);

    const insight: InsightRecord = {
      filePath,
      codeHash,
      analysis: existing?.analysis, // Preserve existing analysis
      uml: {
        ...(existing?.uml || {}),
        [diagramType]: umlResult,
      },
      timestamp: new Date().toISOString(),
    };

    const insightPath = this.getInsightPath(filePath);
    await fs.writeFile(insightPath, JSON.stringify(insight, null, 2), 'utf-8');

    return insight;
  }

  /**
   * Set multiple UML diagrams at once
   */
  async setUMLDiagrams(
    filePath: string,
    codeHash: string,
    umlDiagrams: UMLDiagrams
  ): Promise<InsightRecord> {
    await this.ensureInsightsDir();

    // Get existing insight or create new one
    const existing = await this.get(filePath);

    const insight: InsightRecord = {
      filePath,
      codeHash,
      analysis: existing?.analysis, // Preserve existing analysis
      uml: {
        ...(existing?.uml || {}),
        ...umlDiagrams,
      },
      timestamp: new Date().toISOString(),
    };

    const insightPath = this.getInsightPath(filePath);
    await fs.writeFile(insightPath, JSON.stringify(insight, null, 2), 'utf-8');

    return insight;
  }

  /**
   * Get UML diagram for a specific type
   */
  async getUML(filePath: string, diagramType: DiagramType): Promise<UMLResult | null> {
    const insight = await this.get(filePath);
    return insight?.uml?.[diagramType] || null;
  }

  /**
   * Get all UML diagrams for a file
   */
  async getAllUML(filePath: string): Promise<UMLDiagrams | null> {
    const insight = await this.get(filePath);
    return insight?.uml || null;
  }

  /**
   * Delete UML diagram for a specific type
   */
  async deleteUML(filePath: string, diagramType: DiagramType): Promise<boolean> {
    try {
      const insight = await this.get(filePath);

      if (!insight || !insight.uml?.[diagramType]) {
        return false;
      }

      // Remove the specific diagram type
      delete insight.uml[diagramType];

      // If no UML diagrams left, remove the uml property
      if (Object.keys(insight.uml).length === 0) {
        delete insight.uml;
      }

      insight.timestamp = new Date().toISOString();

      const insightPath = this.getInsightPath(filePath);
      await fs.writeFile(insightPath, JSON.stringify(insight, null, 2), 'utf-8');

      return true;
    } catch (error) {
      console.error(`Error deleting UML diagram for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Delete insight record
   */
  async delete(filePath: string): Promise<boolean> {
    try {
      const insightPath = this.getInsightPath(filePath);

      if (!(await fs.pathExists(insightPath))) {
        return false;
      }

      await fs.remove(insightPath);
      return true;
    } catch (error) {
      console.error(`Error deleting insight for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Clear all insights
   */
  async clear(): Promise<void> {
    try {
      if (await fs.pathExists(this.insightsDir)) {
        await fs.remove(this.insightsDir);
      }
    } catch (error) {
      console.error('Error clearing insights:', error);
      throw new Error('Failed to clear insights');
    }
  }

  /**
   * Get insights statistics
   */
  async getStats(): Promise<{
    count: number;
    totalSize: number;
  }> {
    try {
      if (!(await fs.pathExists(this.insightsDir))) {
        return { count: 0, totalSize: 0 };
      }

      const files = await fs.readdir(this.insightsDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.insightsDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return {
        count: files.filter((f) => f.endsWith('.json')).length,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting insights stats:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}
