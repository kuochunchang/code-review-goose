/**
 * Test Fixtures
 * 集中管理所有测试用的mock数据
 *
 * @module fixtures
 */

// ==================== Analysis Fixtures ====================
export {
  mockAnalysisResult,
  mockEmptyAnalysisResult,
  mockCachedResult,
  mockMultipleIssuesResult,
  mockSecurityIssuesResult,
  mockPerformanceIssuesResult,
} from './analysis.fixtures.js';

// ==================== Config Fixtures ====================
export {
  mockOpenAIConfig,
  mockUnconfiguredConfig,
  mockGPT4TurboConfig,
  mockGPT35Config,
  mockMinimalConfig,
  mockCustomExtensionsConfig,
  mockLargeFileConfig,
} from './config.fixtures.js';

// ==================== File Fixtures ====================
export {
  mockFileInfo,
  mockLargeFileInfo,
  mockSmallFileInfo,
  mockDirectoryInfo,
  mockFileContent,
  mockVueFileContent,
  mockJsFileContent,
  mockFileChunk,
  mockFirstChunk,
  mockLastChunk,
  mockCompleteFile,
} from './file.fixtures.js';

// ==================== Project Fixtures ====================
export {
  mockProjectInfo,
  mockLargeProjectInfo,
  mockSmallProjectInfo,
  mockFileTree,
  mockFlatFileTree,
  mockDeepFileTree,
  mockEmptyProject,
} from './project.fixtures.js';

// ==================== Builders ====================
export {
  AnalysisResultBuilder,
  buildAnalysisResult,
} from './builders/analysisBuilder.js';

export { ConfigBuilder, buildConfig } from './builders/configBuilder.js';
