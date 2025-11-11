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

/**
 * Configuration for Custom AI Provider
 */
export interface CustomProviderConfig {
  baseUrl: string;
  model: string;
  apiKey?: string; // Optional for local services
  timeout?: number;
}

/**
 * Custom AI Provider for OpenAI-compatible APIs
 * Supports custom base URLs and models
 */
export class CustomProvider implements AIProvider {
  name = 'custom';
  private client: OpenAI | null = null;
  private model: string;
  private timeout: number;
  private baseUrl: string;

  constructor(config: CustomProviderConfig) {
    this.model = config.model || 'instruct';
    this.timeout = config.timeout || 60000; // Default 60 seconds
    this.baseUrl = config.baseUrl;

    // Initialize OpenAI client with custom base URL
    // API key is optional for some local services
    this.client = new OpenAI({
      apiKey: config.apiKey || 'not-needed',
      baseURL: this.baseUrl,
      timeout: this.timeout,
    });
  }

  validateConfig(config: AIProviderConfig & { baseUrl?: string }): boolean {
    // Custom provider requires baseUrl and model
    return !!config.baseUrl && config.baseUrl.trim().length > 0;
  }

  async analyze(code: string, options: AnalysisOptions): Promise<AnalysisResult> {
    if (!this.client) {
      throw new Error('Custom AI client not initialized. Please configure base URL first.');
    }

    const prompt = this.buildPrompt(code, options);

    try {
      // Use standard OpenAI-compatible API format
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
        temperature: 0.3,
      };

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from custom AI provider');
      }

      // Extract JSON from potential markdown code blocks
      const jsonContent = this.extractJSON(content);
      const result = JSON.parse(jsonContent);
      return this.normalizeResult(result);
    } catch (error) {
      console.error('Custom AI provider error:', error);
      if (error instanceof Error) {
        throw new Error(`AI analysis failed: ${error.message}`);
      }
      throw new Error('AI analysis failed: Unknown error');
    }
  }

  async explain(code: string, options: AnalysisOptions): Promise<ExplainResult> {
    if (!this.client) {
      throw new Error('Custom AI client not initialized. Please configure base URL first.');
    }

    const prompt = this.buildExplainPrompt(code, options);

    try {
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
        temperature: 0.4,
      };

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from custom AI provider');
      }

      // Extract JSON from potential markdown code blocks
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
      console.error('Custom AI provider error:', error);
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
      throw new Error('Custom AI client not initialized. Please configure base URL first.');
    }

    const prompt = this.buildDiagramPrompt(code, diagramType, options);

    try {
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
        temperature: 0.2, // Lower temperature for more deterministic output
      };

      const response = await this.client.chat.completions.create(requestParams);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from custom AI provider');
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
      console.error('Custom AI diagram generation error:', error);
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
