import axios from 'axios';
import type { ProjectInfo, FileNode } from '../types/project';
import type {
  AnalysisResult,
  AnalysisOptions,
  AnalysisStatus,
  ProjectConfig,
} from '../types/analysis';
import type {
  SearchOptions,
  SearchResult,
  SearchFileResultWithContext,
  SearchHistoryItem,
  SearchStats,
} from '../types/search';
import type {
  InsightRecord,
  InsightCheckResult,
  InsightStats,
  UMLResult,
  DiagramType,
  UMLDiagrams,
  ExplainResult,
} from '../types/insight';

const api = axios.create({
  baseURL: '/api',
  timeout: 360000, // 6 minutes - must be longer than backend max timeout (5 minutes)
});

// API Response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const projectApi = {
  async getProjectInfo(): Promise<ProjectInfo> {
    const response = await api.get<ApiResponse<ProjectInfo>>('/project/info');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get project info');
    }
    return response.data.data;
  },

  async getFileTree(): Promise<FileNode> {
    const response = await api.get<ApiResponse<FileNode>>('/project/tree');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get file tree');
    }
    return response.data.data;
  },
};

export const fileApi = {
  async getFileContent(filePath: string): Promise<string> {
    const response = await api.get<ApiResponse<{ content: string }>>('/file/content', {
      params: { path: filePath },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get file content');
    }
    return response.data.data.content;
  },
};

export const analysisApi = {
  async analyzeCode(code: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    const response = await api.post<ApiResponse<AnalysisResult>>('/analysis/analyze', {
      code,
      options,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Code analysis failed');
    }
    return response.data.data;
  },

  async getStatus(): Promise<AnalysisStatus> {
    const response = await api.get<ApiResponse<AnalysisStatus>>('/analysis/status');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get analysis status');
    }
    return response.data.data;
  },

  async isFileAnalyzable(filePath: string): Promise<boolean> {
    const response = await api.get<ApiResponse<{ isAnalyzable: boolean; filePath: string }>>(
      '/analysis/is-analyzable',
      {
        params: { filePath },
      }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to check file analyzability');
    }
    return response.data.data.isAnalyzable;
  },

  async explainCode(code: string, options?: AnalysisOptions): Promise<ExplainResult> {
    const response = await api.post<ApiResponse<ExplainResult>>('/analysis/explain', {
      code,
      options,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Code explanation failed');
    }
    return response.data.data;
  },
};

export const configApi = {
  async getConfig(): Promise<ProjectConfig> {
    const response = await api.get<ApiResponse<ProjectConfig>>('/config');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get configuration');
    }
    return response.data.data;
  },

  async updateConfig(config: Partial<ProjectConfig>): Promise<ProjectConfig> {
    const response = await api.put<ApiResponse<ProjectConfig>>('/config', config);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update configuration');
    }
    return response.data.data;
  },

  async resetConfig(): Promise<void> {
    const response = await api.post<ApiResponse<any>>('/config/reset');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to reset configuration');
    }
  },
};

export const searchApi = {
  async search(options: SearchOptions): Promise<SearchResult> {
    const response = await api.post<ApiResponse<SearchResult>>('/search', options);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Search failed');
    }
    return response.data.data;
  },

  async searchWithContext(options: SearchOptions): Promise<{
    files: SearchFileResultWithContext[];
    totalFiles: number;
    totalMatches: number;
    searchTime: number;
    truncated: boolean;
  }> {
    const response = await api.post<
      ApiResponse<{
        files: SearchFileResultWithContext[];
        totalFiles: number;
        totalMatches: number;
        searchTime: number;
        truncated: boolean;
      }>
    >('/search/with-context', options);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Search failed');
    }
    return response.data.data;
  },

  async getHistory(limit: number = 10): Promise<SearchHistoryItem[]> {
    const response = await api.get<ApiResponse<SearchHistoryItem[]>>('/search/history', {
      params: { limit },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get search history');
    }
    return response.data.data;
  },

  async clearHistory(): Promise<void> {
    const response = await api.delete<ApiResponse<any>>('/search/history');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear search history');
    }
  },

  async getStats(): Promise<SearchStats> {
    const response = await api.get<ApiResponse<SearchStats>>('/search/stats');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get search stats');
    }
    return response.data.data;
  },
};

export const insightsApi = {
  async checkInsight(filePath: string, hash: string): Promise<InsightCheckResult> {
    const response = await api.get<ApiResponse<InsightCheckResult>>('/insights/check', {
      params: { filePath, hash },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to check insight');
    }
    return response.data.data;
  },

  async getInsight(filePath: string): Promise<InsightRecord | null> {
    try {
      const response = await api.get<ApiResponse<InsightRecord>>('/insights', {
        params: { filePath },
      });
      if (!response.data.success || !response.data.data) {
        return null;
      }
      return response.data.data;
    } catch (error) {
      // Return null if insight not found (404)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveInsight(
    filePath: string,
    codeHash: string,
    analysis: AnalysisResult
  ): Promise<InsightRecord> {
    const response = await api.post<ApiResponse<InsightRecord>>('/insights', {
      filePath,
      codeHash,
      analysis,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to save insight');
    }
    return response.data.data;
  },

  async deleteInsight(filePath: string): Promise<void> {
    const response = await api.delete<ApiResponse<any>>('/insights', {
      params: { filePath },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete insight');
    }
  },

  async clearInsights(): Promise<void> {
    const response = await api.delete<ApiResponse<any>>('/insights/clear');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear insights');
    }
  },

  async getStats(): Promise<InsightStats> {
    const response = await api.get<ApiResponse<InsightStats>>('/insights/stats');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get insights stats');
    }
    return response.data.data;
  },

  // UML-related methods (UML is now stored in insights)

  async generateUML(
    code: string,
    filePath: string,
    diagramType: DiagramType,
    forceRefresh?: boolean
  ): Promise<UMLResult & { fromInsights?: boolean; hashMatched?: boolean }> {
    const response = await api.post<
      ApiResponse<UMLResult & { fromInsights?: boolean; hashMatched?: boolean }>
    >('/uml/generate', {
      code,
      filePath,
      type: diagramType,
      forceRefresh,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'UML generation failed');
    }
    return response.data.data;
  },

  async getUML(filePath: string, diagramType: DiagramType): Promise<UMLResult | null> {
    const insight = await this.getInsight(filePath);
    return insight?.uml?.[diagramType] || null;
  },

  async getAllUML(filePath: string): Promise<UMLDiagrams | null> {
    const insight = await this.getInsight(filePath);
    return insight?.uml || null;
  },

  async saveExplain(
    filePath: string,
    codeHash: string,
    explain: ExplainResult
  ): Promise<InsightRecord> {
    const response = await api.put<ApiResponse<InsightRecord>>('/insights/explain', {
      filePath,
      codeHash,
      explain,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to save explanation');
    }
    return response.data.data;
  },
};

export const umlApi = {
  async generateDiagram(
    code: string,
    filePath: string,
    type: DiagramType,
    forceRefresh?: boolean
  ): Promise<UMLResult & { fromInsights?: boolean; hashMatched?: boolean }> {
    return insightsApi.generateUML(code, filePath, type, forceRefresh);
  },

  async getSupportedTypes(): Promise<{
    generationMode: string;
    aiAvailable: boolean;
    types: any[];
  }> {
    const response = await api.get<
      ApiResponse<{
        generationMode: string;
        aiAvailable: boolean;
        types: any[];
      }>
    >('/uml/supported-types');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get supported types');
    }
    return response.data.data;
  },

  async clearCache(): Promise<void> {
    const response = await api.delete<ApiResponse<any>>('/uml/cache');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear UML cache');
    }
  },

  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    const response = await api.get<ApiResponse<{ count: number; totalSize: number }>>(
      '/uml/cache/stats'
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get cache stats');
    }
    return response.data.data;
  },
};

export default api;
