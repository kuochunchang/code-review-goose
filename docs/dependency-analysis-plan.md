# Dependency Analysis & Context-Aware Code Review - Development Plan

**Created**: 2025-11-09
**Status**: Planning
**Priority**: High
**Estimated Duration**: 3-4 weeks

---

## 📋 Executive Summary

### Current State
Goose Code Review currently analyzes files in isolation without understanding:
- Dependencies between files
- The file's role in the overall system
- Impact on dependent components
- Semantic relationships with other code

### Goal
Implement context-aware code analysis that considers:
1. **Explicit dependencies** (imports/exports)
2. **Reverse dependencies** (who depends on this file)
3. **File role** in the system (service, utility, component, etc.)
4. **Semantic relationships** (similar functionality)
5. **Static analysis integration** (SonarQube for cross-language support)

### Success Metrics
- ✅ Analysis includes dependency context
- ✅ Supports 5+ programming languages
- ✅ AI provides architectural insights beyond syntax
- ✅ Optional SonarQube integration for enhanced static analysis
- ✅ Total analysis time < 10s per file (with context)

---

## 🎯 Technical Approach

### Architecture: Hybrid Multi-Layer Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                   Goose Code Review                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Static Analysis (Optional)                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │           SonarQube Integration                    │     │
│  │  - Cross-language bug detection                    │     │
│  │  - Security vulnerabilities                        │     │
│  │  - Code smells                                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Layer 2: Dependency Analysis (AI-based)                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │        AI Dependency Analyzer                      │     │
│  │  - Parse imports/exports                           │     │
│  │  - Identify file role                              │     │
│  │  - Build dependency graph                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Layer 3: Semantic Search (Optional)                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │         Embedding Service                          │     │
│  │  - Code vectorization                              │     │
│  │  - Similarity search                               │     │
│  │  - Related file discovery                          │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Layer 4: Context Integration                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │      Enhanced Analysis Service                     │     │
│  │  - Merge all analysis results                      │     │
│  │  - Build comprehensive context                     │     │
│  │  - Generate AI prompt with context                 │     │
│  │  - Produce final analysis report                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: AI-based Dependency Analysis (Week 1-2)

**Priority**: P0 (Must Have)
**Status**: Not Started
**Dependencies**: None

#### Objectives
- Implement cross-language dependency extraction using AI
- Build dependency context for analysis
- Enhance AI prompts with dependency information

#### Tasks

##### 1.1 Create Dependency Analysis Service
**File**: `packages/server/src/services/dependencyService.ts`

```typescript
interface DependencyInfo {
  imports: {
    path: string;
    symbols: string[];
    type: 'module' | 'type' | 'side-effect';
  }[];
  exports: {
    symbols: string[];
    type: 'named' | 'default';
  }[];
  role: {
    type: 'service' | 'component' | 'util' | 'config' | 'test';
    description: string;
    keyExports: string[];
  };
}

class DependencyService {
  async analyzeDependencies(code: string, filePath: string): Promise<DependencyInfo>
  async findDependents(filePath: string): Promise<string[]>
  async buildDependencyGraph(projectPath: string): Promise<DependencyGraph>
}
```

**Implementation Details**:
- Use AI to parse imports/exports for any language
- Detect file role based on code structure and naming
- Cache dependency graph for performance

**Acceptance Criteria**:
- ✅ Correctly identifies imports in JS/TS, Python, Go, Java
- ✅ Extracts exported symbols
- ✅ Determines file role with 80%+ accuracy
- ✅ Response time < 2s per file

---

##### 1.2 Create Enhanced Analysis Service
**File**: `packages/server/src/services/enhancedAnalysisService.ts`

```typescript
class EnhancedAnalysisService {
  async analyzeFileWithContext(
    filePath: string,
    code: string,
    options: EnhancedAnalysisOptions
  ): Promise<EnhancedAnalysisResult>
}

interface EnhancedAnalysisOptions {
  includeContext: boolean;
  contextDepth: number;        // How many levels of dependencies to include
  maxRelatedFiles: number;     // Max number of related files to read
}

interface EnhancedAnalysisResult extends AnalysisResult {
  context: {
    role: FileRole;
    dependencies: ImportInfo[];
    exports: ExportInfo[];
    dependents: string[];
    relatedFiles: Map<string, string>;
  };
  metadata: {
    analysisMethod: string;
    contextIncluded: boolean;
    relatedFileCount: number;
  };
}
```

**Implementation Details**:
- Build comprehensive context from dependencies
- Read related files (limited to prevent token overflow)
- Construct enhanced AI prompt with all context
- Merge results with original analysis

**Acceptance Criteria**:
- ✅ Includes up to 5 related files in context
- ✅ Total token count < 15,000 per request
- ✅ Analysis mentions dependencies and role
- ✅ Backward compatible (works without context)

---

##### 1.3 Update AI Prompts
**File**: `packages/server/src/services/providers/openaiProvider.ts`

Enhance the analysis prompt to include:
- File role and purpose
- Dependency relationships
- Code from related files
- Architectural context

**New Prompt Structure**:
```
# Code Analysis Task

## File Information
- Path: {filePath}
- Role: {role.description}
- Type: {role.type}

## Dependencies (What this file imports)
{list of imports with symbols}

## Exports (What this file provides)
{list of exports}

## Files that depend on this
{list of dependents}

## Related Code Context
{code snippets from dependencies}

## Main Code to Analyze
{full file content}

---

Analyze considering:
1. Context-aware issues (given this file's role)
2. Dependency impact (how issues affect dependents)
3. Integration concerns (proper use of dependencies)
4. Architectural fit (does code match intended role)
```

**Acceptance Criteria**:
- ✅ AI mentions file role in summary
- ✅ Issues reference dependencies when relevant
- ✅ Suggestions consider dependent files
- ✅ Architectural insights included

---

##### 1.4 API Endpoints
**File**: `packages/server/src/routes/analysis.ts`

```typescript
// New endpoint: Analyze with context
POST /api/analysis/with-context
{
  "filePath": "src/services/userService.ts",
  "includeContext": true,
  "contextDepth": 1,
  "maxRelatedFiles": 5
}

// Response includes context information
{
  "analysis": { ... },
  "context": {
    "role": { ... },
    "dependencies": [ ... ],
    "dependents": [ ... ]
  }
}
```

**Acceptance Criteria**:
- ✅ New endpoint functional
- ✅ Backward compatible with existing `/api/analysis`
- ✅ Proper error handling
- ✅ Response includes context metadata

---

##### 1.5 Configuration
**File**: `packages/server/src/types/config.ts`

```typescript
interface ProjectConfig {
  // ... existing config ...

  contextAnalysis?: {
    enabled: boolean;
    defaultDepth: number;        // Default: 1
    maxRelatedFiles: number;     // Default: 5
    includeSemanticSearch: boolean; // Default: false (Phase 3)
  };
}
```

**Acceptance Criteria**:
- ✅ Config schema updated
- ✅ Defaults work out of box
- ✅ Validation implemented
- ✅ Config persisted correctly

---

##### 1.6 Frontend Updates
**Files**:
- `packages/web/src/services/analysisService.ts`
- `packages/web/src/components/FileAnalysis.vue`

**Changes**:
- Add toggle for "Include Context" in UI
- Display dependency information
- Show related files section
- Visualize file role badge

**Acceptance Criteria**:
- ✅ User can enable/disable context analysis
- ✅ Dependencies displayed in UI
- ✅ Related files shown with links
- ✅ File role badge visible

---

##### 1.7 Testing
**Files**:
- `packages/server/src/services/__tests__/dependencyService.test.ts`
- `packages/server/src/services/__tests__/enhancedAnalysisService.test.ts`
- `packages/web/e2e/context-analysis.spec.ts`

**Test Coverage**:
- Unit tests for dependency extraction
- Integration tests for context building
- E2E tests for full workflow
- Tests for multiple languages (JS, Python, Go)

**Acceptance Criteria**:
- ✅ Unit test coverage > 80%
- ✅ E2E test passes for context analysis
- ✅ Multi-language tests pass
- ✅ Edge cases handled (circular deps, missing files)

---

### Phase 2: SonarQube Integration (Week 2-3)

**Priority**: P1 (Should Have)
**Status**: Not Started
**Dependencies**: Phase 1 complete

#### Objectives
- Integrate SonarQube for cross-language static analysis
- Merge SonarQube results with AI analysis
- Provide enterprise-grade code quality insights

#### Tasks

##### 2.1 SonarQube Service
**File**: `packages/server/src/services/sonarqubeService.ts`

```typescript
class SonarQubeService {
  async getFileIssues(filePath: string): Promise<SonarIssue[]>
  async getProjectIssues(): Promise<SonarIssue[]>
  async getFileMeasures(filePath: string): Promise<SonarMeasure[]>
  async scanProject(projectPath: string): Promise<void>
  convertToIssue(sonarIssue: SonarIssue): Issue
}
```

**Features**:
- Connect to SonarQube server (local or cloud)
- Fetch issues for specific files
- Get code quality metrics
- Convert SonarQube format to our format

**Acceptance Criteria**:
- ✅ Connects to SonarQube server
- ✅ Fetches issues correctly
- ✅ Handles authentication
- ✅ Error handling for unavailable server

---

##### 2.2 Merge SonarQube with AI
**File**: `packages/server/src/services/enhancedAnalysisService.ts`

Update to include SonarQube results:
```typescript
async analyzeFileWithContext(...) {
  // Get SonarQube issues
  const sonarIssues = await sonarqubeService.getFileIssues(filePath);

  // Get AI analysis
  const aiAnalysis = await aiDeepAnalysis(code, context, sonarIssues);

  // Merge and deduplicate
  return mergeResults(sonarIssues, aiAnalysis);
}
```

**Acceptance Criteria**:
- ✅ SonarQube issues included in results
- ✅ Duplicates removed
- ✅ AI focuses on architectural issues
- ✅ Works when SonarQube disabled

---

##### 2.3 Configuration
**File**: `packages/server/src/types/config.ts`

```typescript
interface ProjectConfig {
  // ... existing ...

  sonarqube?: {
    enabled: boolean;
    serverUrl: string;           // e.g., http://localhost:9000
    token?: string;
    projectKey?: string;
    autoScan: boolean;           // Scan on project open
  };
}
```

**Acceptance Criteria**:
- ✅ SonarQube config in UI
- ✅ Connection test feature
- ✅ Optional (disabled by default)
- ✅ Graceful fallback if unavailable

---

##### 2.4 UI Updates
**File**: `packages/web/src/components/Settings.vue`

Add SonarQube configuration section:
- Server URL input
- Token input (masked)
- Project key input
- Test connection button
- Enable/disable toggle

**Acceptance Criteria**:
- ✅ Configuration UI complete
- ✅ Connection test works
- ✅ Settings persist
- ✅ Clear error messages

---

##### 2.5 Documentation
**File**: `docs/SONARQUBE_INTEGRATION.md`

Document:
- How to set up SonarQube
- How to configure in Goose
- Benefits of integration
- Troubleshooting

**Acceptance Criteria**:
- ✅ Setup guide complete
- ✅ Docker compose example
- ✅ Screenshots included
- ✅ FAQ section

---

### Phase 3: Embedding & Semantic Search (Week 3-4)

**Priority**: P2 (Nice to Have)
**Status**: Not Started
**Dependencies**: Phase 1 complete

#### Objectives
- Build vector index of codebase
- Find semantically similar files
- Discover hidden relationships

#### Tasks

##### 3.1 Embedding Service
**File**: `packages/server/src/services/embeddingService.ts`

```typescript
class EmbeddingService {
  async buildIndex(projectPath: string): Promise<void>
  async updateIndex(changedFiles: string[]): Promise<void>
  async searchSimilar(filePath: string, topK: number): Promise<SimilarFile[]>
  async generateEmbedding(code: string): Promise<number[]>
}

interface SimilarFile {
  filePath: string;
  similarity: number;
  reason?: string;
}
```

**Implementation**:
- Use OpenAI `text-embedding-3-small`
- Store embeddings in JSON files
- Compute cosine similarity
- Incremental updates

**Acceptance Criteria**:
- ✅ Generates embeddings for all files
- ✅ Similarity search works
- ✅ Incremental updates functional
- ✅ Performance acceptable (< 3s search)

---

##### 3.2 Index Management
**File**: `packages/server/src/services/embeddingIndexManager.ts`

```typescript
class EmbeddingIndexManager {
  async initialize(): Promise<void>
  async rebuild(): Promise<void>
  async watchForChanges(): Promise<void>
  getIndexStats(): IndexStats
}
```

**Features**:
- Background indexing
- File watcher for auto-updates
- Index statistics
- Manual rebuild option

**Acceptance Criteria**:
- ✅ Background indexing works
- ✅ File changes trigger updates
- ✅ Stats accurate
- ✅ Rebuild doesn't block server

---

##### 3.3 Integration
**File**: `packages/server/src/services/enhancedAnalysisService.ts`

Add semantic search to context:
```typescript
async analyzeFileWithContext(...) {
  // ... existing code ...

  if (options.includeSemanticSearch) {
    const similar = await embeddingService.searchSimilar(filePath, 3);
    context.semanticRelated = similar;
  }
}
```

**Acceptance Criteria**:
- ✅ Semantic files in context
- ✅ Optional feature
- ✅ Reasonable performance
- ✅ UI displays similar files

---

##### 3.4 API Endpoints
**File**: `packages/server/src/routes/embedding.ts`

```typescript
// Build/rebuild index
POST /api/embedding/build

// Search similar files
GET /api/embedding/similar?file={path}&topK={n}

// Index stats
GET /api/embedding/stats
```

**Acceptance Criteria**:
- ✅ Endpoints functional
- ✅ Proper auth/validation
- ✅ Error handling
- ✅ Rate limiting

---

### Phase 4: Optimization & Polish (Week 4)

**Priority**: P1
**Status**: Not Started
**Dependencies**: Phases 1-3 complete

#### Tasks

##### 4.1 Caching
- Cache dependency graphs
- Cache embeddings
- Cache AI responses (optional)
- Invalidate on file changes

##### 4.2 Performance
- Parallel processing where possible
- Limit context size intelligently
- Optimize token usage
- Database queries optimization

##### 4.3 UI/UX
- Dependency graph visualization
- Interactive context explorer
- Loading states
- Error boundaries

##### 4.4 Testing
- Full E2E test suite
- Performance benchmarks
- Multi-language testing
- Edge case coverage

##### 4.5 Documentation
- API documentation
- User guide
- Architecture diagrams
- Migration guide

---

## 📊 Cost Estimation

### AI Analysis Costs (OpenAI GPT-4o mini)

**Assumptions**:
- Average file: 500 lines = ~2000 tokens
- Context (5 related files): 5 × 500 lines = ~10000 tokens
- Total input per analysis: ~12000 tokens
- Output: ~1000 tokens

**Per-analysis cost**:
- Input: 12000 tokens × $0.150/1M = $0.0018
- Output: 1000 tokens × $0.600/1M = $0.0006
- **Total: ~$0.0024 per analysis**

**Monthly usage (50 files/day)**:
- 50 files × $0.0024 = $0.12/day
- **Monthly: ~$3.60**

### Embedding Costs (text-embedding-3-small)

**One-time indexing (1000 files)**:
- 1000 files × 2000 tokens = 2M tokens
- 2M × $0.020/1M = **$0.04 one-time**

**Incremental updates (100 files/week)**:
- 100 × 2000 = 200K tokens/week
- 200K × $0.020/1M = **$0.004/week**

### Total Monthly Cost
- AI analysis: $3.60
- Embeddings: $0.016
- **Total: ~$4/month** (very affordable!)

---

## 🧪 Testing Strategy

### Unit Tests
- Dependency extraction accuracy
- Context building logic
- SonarQube integration
- Embedding generation

### Integration Tests
- End-to-end analysis flow
- Multi-service coordination
- Error handling
- Cache invalidation

### E2E Tests
- Full user workflow
- Multi-language support
- Performance benchmarks
- Edge cases

### Test Coverage Goals
- Unit: 85%+
- Integration: 75%+
- E2E: Critical paths covered

---

## 📈 Success Metrics

### Functional Metrics
- ✅ Supports 5+ languages (JS/TS, Python, Go, Java, Ruby)
- ✅ 90%+ accuracy in dependency extraction
- ✅ AI mentions dependencies in 80%+ of analyses
- ✅ SonarQube integration works when enabled

### Performance Metrics
- ✅ Analysis with context: < 10s
- ✅ Dependency extraction: < 2s
- ✅ Semantic search: < 3s
- ✅ Index build (1000 files): < 5 minutes

### Quality Metrics
- ✅ Zero breaking changes to existing API
- ✅ All tests pass
- ✅ No linting errors
- ✅ Documentation complete

---

## 🚧 Risks & Mitigations

### Risk 1: AI Cost Overruns
**Mitigation**:
- Implement token limits
- Cache results
- Provide usage monitoring
- Allow disabling context

### Risk 2: Performance Degradation
**Mitigation**:
- Async processing
- Caching strategy
- Limit context depth
- Background indexing

### Risk 3: SonarQube Unavailable
**Mitigation**:
- Make it optional
- Graceful fallback to AI-only
- Clear error messages
- Documentation

### Risk 4: Multi-language Accuracy
**Mitigation**:
- Extensive testing
- User feedback loop
- Incremental language support
- Clear limitations documented

---

## 📦 Deliverables

### Phase 1
- ✅ DependencyService implementation
- ✅ EnhancedAnalysisService implementation
- ✅ Updated API endpoints
- ✅ Frontend UI updates
- ✅ Unit & E2E tests
- ✅ Basic documentation

### Phase 2
- ✅ SonarQubeService implementation
- ✅ Integration with analysis flow
- ✅ Configuration UI
- ✅ Integration guide
- ✅ Tests

### Phase 3
- ✅ EmbeddingService implementation
- ✅ Index management
- ✅ Semantic search API
- ✅ UI for similar files
- ✅ Tests

### Phase 4
- ✅ Performance optimizations
- ✅ Complete test suite
- ✅ Full documentation
- ✅ Migration guide

---

## 🎓 Learning Resources

### SonarQube
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarQube Web API](https://docs.sonarqube.org/latest/extension-guide/web-api/)
- [SonarQube Community Edition](https://www.sonarqube.org/downloads/)

### Embeddings
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Vector Search Basics](https://www.pinecone.io/learn/vector-search/)

### Dependency Analysis
- [Tree-sitter](https://tree-sitter.github.io/)
- [Babel Parser](https://babeljs.io/docs/en/babel-parser)

---

## 🔄 Rollout Plan

### Week 1-2: Phase 1 (AI Dependency Analysis)
- **Day 1-3**: DependencyService implementation
- **Day 4-6**: EnhancedAnalysisService implementation
- **Day 7-9**: API & Frontend updates
- **Day 10-14**: Testing & refinement

### Week 2-3: Phase 2 (SonarQube Integration)
- **Day 15-17**: SonarQubeService implementation
- **Day 18-20**: Integration & testing
- **Day 21-24**: UI & documentation

### Week 3-4: Phase 3 (Embedding Search)
- **Day 24-26**: EmbeddingService implementation
- **Day 27-29**: Index management
- **Day 30-31**: Integration & testing

### Week 4: Phase 4 (Polish)
- **Day 32-35**: Optimizations & caching
- **Day 36-38**: Complete testing
- **Day 39-40**: Documentation & release

---

## 🎯 Definition of Done

### For Each Phase
- [ ] All code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Linting passes with zero errors
- [ ] Build succeeds without warnings
- [ ] Documentation updated
- [ ] User-facing features have UI
- [ ] Performance meets targets
- [ ] No known critical bugs

### For Final Release
- [ ] All phases complete
- [ ] Full regression testing passed
- [ ] Documentation complete
- [ ] Migration guide provided
- [ ] Breaking changes documented (none expected)
- [ ] Performance benchmarks met
- [ ] Cost analysis validated
- [ ] User acceptance testing passed

---

## 📞 Support & Questions

For questions or clarifications during implementation:
1. Review this document first
2. Check related documentation in `/docs`
3. Review code examples in this plan
4. Test edge cases thoroughly

---

## 🔖 Version History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0     | 2025-11-09 | Claude | Initial development plan created |

---

**Next Steps**: Begin Phase 1 implementation - Create DependencyService

**Last Updated**: 2025-11-09
