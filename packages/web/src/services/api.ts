import axios from 'axios';
import type { ProjectInfo, FileNode } from '../types/project';
import type {
  AnalysisResult,
  AnalysisOptions,
  AnalysisStatus,
  ProjectConfig,
  CacheStats,
} from '../types/analysis';
import type {
  SearchOptions,
  SearchResult,
  SearchFileResultWithContext,
  SearchHistoryItem,
  SearchStats,
} from '../types/search';
import type { InsightRecord, InsightCheckResult, InsightStats } from '../types/insight';

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

  async getCachedAnalysis(code: string, options?: AnalysisOptions): Promise<AnalysisResult | null> {
    const response = await api.post<ApiResponse<AnalysisResult | null>>('/analysis/cached', {
      code,
      options,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to query cached analysis');
    }
    return response.data.data || null;
  },

  async getStatus(): Promise<AnalysisStatus> {
    const response = await api.get<ApiResponse<AnalysisStatus>>('/analysis/status');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get analysis status');
    }
    return response.data.data;
  },

  async clearCache(): Promise<void> {
    const response = await api.delete<ApiResponse<any>>('/analysis/cache');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear cache');
    }
  },

  async getCacheStats(): Promise<CacheStats> {
    const response = await api.get<ApiResponse<CacheStats>>('/analysis/cache/stats');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get cache stats');
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
};

export default api;
