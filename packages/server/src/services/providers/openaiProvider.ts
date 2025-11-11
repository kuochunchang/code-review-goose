import OpenAI from 'openai';
import type {
  AIProvider,
  AIProviderConfig,
  AnalysisOptions,
  AnalysisResult,
  Issue,
  DiagramGenerationResult,
  ExplainResult,
} from '../../types/ai.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI | null = null;
  private model: string;
  private timeout: number;

  constructor(config: AIProviderConfig) {
    this.model = config.model || 'gpt-4';
    this.timeout = config.timeout || 60000; // Default 60 seconds
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        timeout: this.timeout,
      });
    }
  }

  validateConfig(config: AIProviderConfig): boolean {
    return !!config.apiKey && config.apiKey.trim().length > 0;
  }

  async analyze(code: string, options: AnalysisOptions): Promise<AnalysisResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please configure API key first.');
    }

    const prompt = this.buildPrompt(code, options);

    try {
      // Check if the model supports JSON mode and custom temperature
      const supportsJsonMode = this.supportsJsonMode();
      const supportsCustomTemp = this.supportsCustomTemperature();

      // Build request parameters
      const requestParams: any = {
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

      // Only add temperature if the model supports custom values
      if (supportsCustomTemp) {
        requestParams.temperature = 0.3;
      }

      // Only add response_format if the model supports it
      if (supportsJsonMode) {
        requestParams.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract JSON from potential markdown code blocks
      const jsonContent = this.extractJSON(content);
      const result = JSON.parse(jsonContent);
      return this.normalizeResult(result);
    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error instanceof Error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }
      throw new Error('AI analysis failed: Unknown error');
    }
  }

  async explain(code: string, options: AnalysisOptions): Promise<ExplainResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please configure API key first.');
    }

    const prompt = this.buildExplainPrompt(code, options);

    try {
      // Check if the model supports custom temperature and JSON mode
      const supportsCustomTemp = this.supportsCustomTemperature();
      const supportsJsonMode = this.supportsJsonMode();

      // Build request parameters
      const requestParams: any = {
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

      // Only add temperature if the model supports custom values
      if (supportsCustomTemp) {
        requestParams.temperature = 0.4;
      }

      // Only add response_format if the model supports it
      if (supportsJsonMode) {
        requestParams.response_format = { type: 'json_object' };
      }

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract JSON from potential markdown code blocks
      const jsonContent = this.extractJSON(content);
      const result = JSON.parse(jsonContent);

      return {
        overview: result.overview || '',
        mainComponents: result.mainComponents || [],
        howItWorks: result.howItWorks || [],
        keyConcepts: result.keyConcepts || [],
        dependencies: result.dependencies || [],
        notableFeatures: result.notableFeatures || [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      if (error instanceof Error) {
        throw new Error(`Code explanation failed: ${error.message}`);
      }
      throw new Error('Code explanation failed: Unknown error');
    }
  }

  private buildExplainPrompt(code: string, options: AnalysisOptions): string {
    const language = options.language || 'unknown';
    const filePath = options.filePath || 'unknown';

    return `Explain the following ${language} code from ${filePath}.

Return the explanation in the following JSON format:
{
  "overview": "Brief 2-3 sentence summary of what the code does",
  "mainComponents": [
    {
      "name": "ComponentName",
      "description": "What this component does",
      "type": "class|function|module|interface|constant|type|variable",
      "codeSnippet": "Optional: key code snippet"
    }
  ],
  "howItWorks": [
    {
      "step": 1,
      "title": "Short title of this step",
      "description": "Detailed explanation of what happens in this step"
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

Code:
\`\`\`${language}
${code}
\`\`\`

Guidelines:
- Be specific and educational
- Include actual names from the code
- Keep descriptions clear and concise
- Focus on the most important aspects
- Order steps logically in howItWorks`;
  }

  private supportsJsonMode(): boolean {
    // Models that support JSON mode (response_format: { type: 'json_object' })
    const jsonModeModels = [
      // GPT-5 series
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-pro',
      'gpt-5-codex',
      // GPT-4.1 series
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      // GPT-4 Turbo and 4o series
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-4-0125-preview',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2024-05-13',
      'gpt-4o-2024-08-06',
      // GPT-3.5 Turbo
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125',
    ];

    // Check if the current model is in the list or starts with any of these prefixes
    return jsonModeModels.some(
      (supportedModel) => this.model === supportedModel || this.model.startsWith(supportedModel)
    );
  }

  private supportsCustomTemperature(): boolean {
    // Models that do NOT support custom temperature (only default value 1)
    const noCustomTempModels = [
      // GPT-5 series - these models only support temperature: 1
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5-pro',
      'gpt-5-codex',
      // ChatGPT-5 alias
      'chatgpt-5',
    ];

    // Check if the current model is in the restricted list
    const isRestricted = noCustomTempModels.some(
      (restrictedModel) => this.model === restrictedModel || this.model.startsWith(restrictedModel)
    );

    // Return true if NOT restricted (i.e., supports custom temperature)
    return !isRestricted;
  }

  private buildPrompt(code: string, options: AnalysisOptions): string {
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

  private normalizeResult(result: any): AnalysisResult {
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

  async generateDiagram(
    code: string,
    diagramType: string,
    options?: any
  ): Promise<DiagramGenerationResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please configure API key first.');
    }

    const prompt = this.buildDiagramPrompt(code, diagramType, options);

    try {
      // Check if the model supports custom temperature
      const supportsCustomTemp = this.supportsCustomTemperature();

      // Build request parameters
      const requestParams: any = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in software architecture and UML diagrams. Generate valid Mermaid diagram syntax based on code analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      // Only add temperature if the model supports custom values
      if (supportsCustomTemp) {
        requestParams.temperature = 0.2; // Lower temperature for more deterministic output
      }

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract mermaid code from response
      const mermaidCode = this.extractMermaidCode(content);

      return {
        mermaidCode,
        success: true,
        metadata: {
          model: this.model,
          diagramType,
        },
      };
    } catch (error) {
      console.error('OpenAI diagram generation error:', error);
      return {
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildDiagramPrompt(code: string, diagramType: string, _options?: any): string {
    const prompts: Record<string, string> = {
      class: `Analyze the following code and generate a Mermaid class diagram.

Requirements:
1. Include all classes, interfaces, and their relationships
2. Show inheritance (extends) using: ParentClass <|-- ChildClass
3. Show implementation (implements) using: Interface <|.. ImplementingClass
4. Include visibility modifiers: + for public, - for private, # for protected
5. For methods, use simple syntax: +methodName() or +methodName(param)
6. DO NOT use TypeScript type annotations in diagrams
7. Ensure all class names are valid (no spaces, use PascalCase)
8. Keep method signatures simple - avoid complex type syntax

Example of GOOD syntax:
classDiagram
  class Student {
    -name string
    -age number
    +getName() string
    +setAge(value)
  }
  class Teacher {
    -subject string
    +teach()
  }
  Teacher <|-- Student

Return ONLY valid Mermaid code starting with "classDiagram" and nothing else.

Code:
\`\`\`
${code}
\`\`\``,

      flowchart: `Analyze the following code and generate a Mermaid flowchart.

Requirements:
1. Show the main function's control flow
2. Identify decision points (if/else statements) - use diamond shapes {text}
3. Identify loops (for/while statements)
4. Show function calls and returns
5. Use proper Mermaid flowchart syntax
6. Use meaningful but SIMPLE labels - avoid special characters like parentheses (), colons :, or brackets []
7. DO NOT include type annotations or function signatures in labels
8. Use plain text descriptions like "Calculate grade" instead of "calculateGrade(score): string"

Node syntax rules:
- Rectangle: id[text]
- Diamond (decision): id{text}
- Circle (start/end): id([text])
- DO NOT use parentheses or colons inside text labels

Example of GOOD syntax:
flowchart TD
  start([Start])
  input[Get user input]
  check{Score valid?}
  calc[Calculate grade]
  output[Display result]
  start --> input --> check
  check -->|Yes| calc --> output
  check -->|No| input

Return ONLY valid Mermaid code starting with "flowchart TD" and nothing else.

Code:
\`\`\`
${code}
\`\`\``,

      sequence: `Analyze the following code and generate a Mermaid sequence diagram.

Requirements:
1. Identify all participants (classes, objects, functions)
2. Show method call sequences in chronological order
3. Use simple arrow syntax: Participant1->>Participant2: message
4. For return values use: Participant2-->>Participant1: return value
5. Keep message labels simple and descriptive
6. DO NOT include complex function signatures or type annotations
7. Focus on the most important interaction flows

Example of GOOD syntax:
sequenceDiagram
  participant User
  participant System
  participant Database
  User->>System: Submit form
  System->>Database: Save data
  Database-->>System: Confirmation
  System-->>User: Success message

Return ONLY valid Mermaid code starting with "sequenceDiagram" and nothing else.

Code:
\`\`\`
${code}
\`\`\``,

      dependency: `Analyze the following code and generate a Mermaid graph showing dependencies.

Requirements:
1. Identify all import/require statements and show module dependencies
2. Show dependency direction (A --> B means A depends on B)
3. Use simple node labels without special characters
4. Keep arrow labels descriptive but simple
5. Use proper Mermaid graph syntax
6. DO NOT use parentheses, brackets, or colons in node labels

Example of GOOD syntax:
graph TD
  Main[Main Module]
  Auth[Auth Service]
  DB[Database]
  Main --> Auth
  Main --> DB
  Auth --> DB

Return ONLY valid Mermaid code starting with "graph TD" or "graph LR" and nothing else.

Code:
\`\`\`
${code}
\`\`\``,
    };

    return prompts[diagramType] || prompts['class'];
  }

  private extractMermaidCode(content: string): string {
    // Try to extract code from markdown code blocks
    const codeBlockMatch = content.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block found, return the whole content trimmed
    return content.trim();
  }

  private extractJSON(content: string): string {
    // Try to extract JSON from markdown code blocks (```json ... ```)
    const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch) {
      return jsonCodeBlockMatch[1].trim();
    }

    // Try to extract any code block (``` ... ```)
    const codeBlockMatch = content.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // If no code block found, return the whole content trimmed
    return content.trim();
  }
}
