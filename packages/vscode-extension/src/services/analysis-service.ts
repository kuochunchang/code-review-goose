import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AnalysisOptions,
  AnalysisResult,
  ExplainResult,
  Issue,
} from '../types/analysis.js';

export type AIProvider = 'openai' | 'gemini';

export interface AnalysisServiceConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
  baseURL?: string;
  provider?: AIProvider;
}

/**
 * Analysis service that talks directly to OpenAI (and OpenAI-compatible) APIs
 * or Google Gemini via the Generative Language API.
 * Based on the server's OpenAIProvider implementation.
 */
export class AnalysisService {
  private openaiClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  private model: string;
  private provider: AIProvider;
  private timeout: number;

  constructor(config: AnalysisServiceConfig) {
    this.provider = config.provider || 'openai';
    this.timeout = config.timeout || 60000;

    if (this.provider === 'gemini') {
      if (!config.apiKey) {
        throw new Error('Gemini API key is required');
      }
      this.geminiClient = new GoogleGenerativeAI(config.apiKey);
      this.model = config.model || 'gemini-2.0-flash-exp';
      return;
    }

    // API key is optional when using custom API (some local services don't require it)
    const apiKey = config.apiKey || (config.baseURL ? 'dummy-key' : '');

    if (!apiKey && !config.baseURL) {
      throw new Error('OpenAI API key is required');
    }

    const clientConfig: any = {
      apiKey,
      timeout: this.timeout,
    };

    // Add custom baseURL if provided
    if (config.baseURL) {
      clientConfig.baseURL = config.baseURL;
    }

    this.openaiClient = new OpenAI(clientConfig);
    this.model = config.model || 'chatgpt-4o-latest';
  }

  /**
   * Analyze code and return issues and summary
   */
  async analyzeCode(code: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(code, options);

    try {
      const supportsJsonMode = this.supportsJsonMode();
      const supportsCustomTemp = this.supportsCustomTemperature();

      let content: string | undefined;

      if (this.provider === 'gemini') {
        content = await this.generateWithGemini({
          systemInstruction:
            'You are a professional code reviewer. Analyze code and provide detailed feedback in JSON format.',
          prompt,
          temperature: supportsCustomTemp ? 0.3 : undefined,
          useJsonMode: supportsJsonMode,
        });
      } else {
        if (!this.openaiClient) {
          throw new Error('OpenAI client not initialized');
        }

        const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional code reviewer. Analyze code and provide detailed feedback in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        };

        if (supportsCustomTemp) {
          requestParams.temperature = 0.3;
        }

        if (supportsJsonMode) {
          requestParams.response_format = { type: 'json_object' };
        }

        const response = await this.openaiClient.chat.completions.create(requestParams);
        content = response.choices[0]?.message?.content;
      }

      if (!content) {
        throw new Error(`No response from ${this.getProviderName()}`);
      }

      const jsonContent = this.extractJSON(content);
      const result = JSON.parse(jsonContent);
      return this.normalizeAnalysisResult(result);
    } catch (error) {
      console.error(`${this.getProviderName()} API error:`, error);
      if (error instanceof Error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }
      throw new Error('AI analysis failed: Unknown error');
    }
  }

  /**
   * Explain code in detail
   */
  async explainCode(code: string, options: AnalysisOptions = {}): Promise<ExplainResult> {
    const prompt = this.buildExplainPrompt(code, options);

    try {
      const supportsCustomTemp = this.supportsCustomTemperature();
      const supportsJsonMode = this.supportsJsonMode();

      let content: string | undefined;

      if (this.provider === 'gemini') {
        content = await this.generateWithGemini({
          systemInstruction:
            'You are an expert code explainer. Provide clear, comprehensive explanations of code in structured JSON format.',
          prompt,
          temperature: supportsCustomTemp ? 0.4 : undefined,
          useJsonMode: supportsJsonMode,
        });
      } else {
        if (!this.openaiClient) {
          throw new Error('OpenAI client not initialized');
        }

        const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert code explainer. Provide clear, comprehensive explanations of code in structured JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        };

        if (supportsCustomTemp) {
          requestParams.temperature = 0.4;
        }

        if (supportsJsonMode) {
          requestParams.response_format = { type: 'json_object' };
        }

        const response = await this.openaiClient.chat.completions.create(requestParams);
        content = response.choices[0]?.message?.content;
      }

      if (!content) {
        throw new Error(`No response from ${this.getProviderName()}`);
      }

      const jsonContent = this.extractJSON(content);
      const result = JSON.parse(jsonContent);

      return {
        overview: result.overview || '',
        fields: result.fields || [],
        mainComponents: result.mainComponents || [],
        methodDependencies: result.methodDependencies || [],
        howItWorks: result.howItWorks || [],
        keyConcepts: result.keyConcepts || [],
        dependencies: result.dependencies || [],
        notableFeatures: result.notableFeatures || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`${this.getProviderName()} API error:`, error);
      if (error instanceof Error) {
        throw new Error(`Code explanation failed: ${error.message}`);
      }
      throw new Error('Code explanation failed: Unknown error');
    }
  }

  /**
   * Build prompt for code analysis
   */
  private buildAnalysisPrompt(code: string, options: AnalysisOptions): string {
    const checks: string[] = [];

    if (options.checkQuality !== false) {
      checks.push('1. Code Quality (naming, structure, readability)');
    }
    if (options.checkSecurity !== false) {
      checks.push('2. Security Vulnerabilities (SQL injection, XSS, sensitive data exposure)');
    }
    if (options.checkPerformance !== false) {
      checks.push('3. Performance Issues (bottlenecks, memory leaks)');
    }
    if (options.checkBestPractices !== false) {
      checks.push('4. Best Practices (framework-specific)');
    }
    if (options.checkBugs !== false) {
      checks.push('5. Potential Bugs (logic errors, edge cases)');
    }

    const language = options.language || 'unknown';
    const filePath = options.filePath || 'unknown';

    return `Analyze the following ${language} code from ${filePath}.

Check for:
${checks.join('\n')}

Return the results in the following JSON format:
{
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "quality|security|performance|best-practice|bug",
      "line": <line_number>,
      "column": <column_number>,
      "message": "<description_of_issue>",
      "suggestion": "<how_to_fix_it>",
      "codeExample": {
        "before": "<problematic_code>",
        "after": "<improved_code>"
      }
    }
  ],
  "summary": "<overall_summary_of_code_quality>"
}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide specific, actionable feedback. Focus on the most important issues.`;
  }

  /**
   * Build prompt for code explanation
   */
  private buildExplainPrompt(code: string, options: AnalysisOptions): string {
    const language = options.language || 'unknown';
    const filePath = options.filePath || 'unknown';

    return `Explain the following ${language} code from ${filePath}.

Return the explanation in the following JSON format:
{
  "overview": "Brief 2-3 sentence summary of what the code does",
  "fields": [
    {
      "name": "fieldName",
      "type": "string|number|boolean|object|ClassName",
      "description": "What this field stores or represents",
      "line": 5,
      "visibility": "public|private|protected"
    }
  ],
  "mainComponents": [
    {
      "name": "ComponentName",
      "description": "What this component does",
      "type": "class|function|module|interface|constant|type|variable",
      "codeSnippet": "Optional: key code snippet",
      "line": 10
    }
  ],
  "methodDependencies": [
    {
      "caller": "methodA",
      "callee": "methodB",
      "callerLine": 20,
      "calleeLine": 35,
      "description": "methodA calls methodB to process data"
    }
  ],
  "howItWorks": [
    {
      "step": 1,
      "title": "Short title of this step",
      "description": "Detailed explanation of what happens in this step",
      "line": 15
    }
  ],
  "keyConcepts": [
    {
      "concept": "Concept name (e.g., 'Dependency Injection')",
      "explanation": "Clear explanation of this concept and how it's used"
    }
  ],
  "dependencies": [
    {
      "name": "Module or library name",
      "purpose": "What it's used for in this code",
      "isExternal": true
    }
  ],
  "notableFeatures": [
    "Highlight 1: Description",
    "Highlight 2: Description"
  ]
}

Code (with line numbers):
\`\`\`${language}
${code
  .split('\n')
  .map((line, i) => `${i + 1}: ${line}`)
  .join('\n')}
\`\`\`

Guidelines:
- Be specific and educational
- Include actual names from the code
- Keep descriptions clear and concise
- Focus on the most important aspects
- Order steps logically in howItWorks
- **IMPORTANT**: Include line numbers for fields, mainComponents, methodDependencies, and howItWorks to enable code navigation
- Line numbers should correspond to where the item is defined or where the action occurs in the code

**For fields** (class/module-level data fields ONLY):
- List class or module-level data fields (properties, state variables, instance variables)
- Examples: class properties, instance variables, module-level state
- Do NOT include: local variables, function parameters, constants, or methods
- Include visibility (public/private/protected) when it's clear from the code

**For mainComponents** (all major code structures):
- **MUST include ALL**: classes, methods/functions, constants, interfaces, types, modules
- For methods: List all important methods/functions (both class methods and standalone functions)
- For constants: List all important constant declarations (const, final, readonly values)
- For classes: List all class definitions
- This is where methods and constants should appear - NOT in fields

**For methodDependencies** (method call relationships within this file):
- Analyze which methods/functions call other methods/functions in THIS file
- Only include internal dependencies (within the same file)
- Provide line numbers for both caller and callee
- Add brief description of why the dependency exists
- This helps visualize the code flow and structure`;
  }

  /**
   * Normalize analysis result
   */
  private normalizeAnalysisResult(result: any): AnalysisResult {
    return {
      issues: (result.issues || []).map(
        (issue: any): Issue => ({
          severity: issue.severity || 'info',
          category: issue.category || 'quality',
          line: issue.line || 1,
          column: issue.column,
          message: issue.message || '',
          suggestion: issue.suggestion || '',
          codeExample: issue.codeExample,
        })
      ),
      summary: result.summary || 'Analysis completed.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJSON(content: string): string {
    const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch) {
      return jsonCodeBlockMatch[1].trim();
    }

    const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    return content.trim();
  }

  /**
   * Check if model supports JSON mode
   */
  private supportsJsonMode(): boolean {
    if (this.provider === 'gemini') {
      return true;
    }
    const jsonModeModels = [
      // GPT-5 series (future)
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-pro',
      'gpt-5-codex',
      // GPT-4.1 series (future)
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      // GPT-4 Turbo series
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-4-0125-preview',
      // GPT-4o series (latest)
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2024-05-13',
      'gpt-4o-2024-08-06',
      'gpt-4o-2024-11-20',
      'chatgpt-4o-latest',
      // o1 series (reasoning models)
      'o1',
      'o1-preview',
      'o1-mini',
      'o1-2024-12-17',
      // o3 series (future reasoning models)
      'o3',
      'o3-mini',
      // GPT-3.5 Turbo series
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125',
    ];

    return jsonModeModels.some(
      (supportedModel) => this.model === supportedModel || this.model.startsWith(supportedModel)
    );
  }

  /**
   * Check if model supports custom temperature
   */
  private supportsCustomTemperature(): boolean {
    if (this.provider === 'gemini') {
      return true;
    }
    const noCustomTempModels = [
      // GPT-5 series (future) - may not support custom temperature
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-pro',
      'gpt-5-codex',
      'chatgpt-5',
      // o1 series - reasoning models do NOT support custom temperature
      'o1',
      'o1-preview',
      'o1-mini',
      'o1-2024-12-17',
      // o3 series (future) - reasoning models do NOT support custom temperature
      'o3',
      'o3-mini',
    ];

    const isRestricted = noCustomTempModels.some(
      (restrictedModel) => this.model === restrictedModel || this.model.startsWith(restrictedModel)
    );

    return !isRestricted;
  }

  /**
   * Get provider name for logging and errors
   */
  private getProviderName(): string {
    return this.provider === 'gemini' ? 'Gemini' : 'OpenAI';
  }

  /**
   * Generate JSON-structured output with Gemini
   */
  private async generateWithGemini(params: {
    systemInstruction: string;
    prompt: string;
    temperature?: number;
    useJsonMode?: boolean;
  }): Promise<string> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.geminiClient.getGenerativeModel({
      model: this.model,
      systemInstruction: params.systemInstruction,
      generationConfig: {
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(params.useJsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });

    const response = await model.generateContent([
      {
        role: 'user',
        parts: [{ text: params.prompt }],
      },
    ]);

    return this.extractGeminiText(response);
  }

  /**
   * Extract response text from Gemini output
   */
  private extractGeminiText(response: any): string {
    const candidates = response?.response?.candidates || response?.candidates || [];
    const texts: string[] = [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || candidate?.parts || [];
      for (const part of parts) {
        if (typeof part?.text === 'string') {
          texts.push(part.text);
        }
      }
    }

    return texts.join('\n').trim();
  }
}
