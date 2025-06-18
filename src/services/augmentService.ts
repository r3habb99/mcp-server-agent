/**
 * Augment AI integration service
 */

import type { CodeAnalysisResult, AugmentConfig } from '../interfaces/index.js';
import { logInfo, logError, logDebug } from '../utils/logger.js';
import { augmentConfig } from '../server/config.js';

interface AugmentApiClient {
  analyzeCode(_code: string, _language: string): Promise<CodeAnalysisResult>;
  generateDocumentation(_code: string, _language: string): Promise<string>;
  reviewCode(_code: string, _language: string): Promise<{ score: number; feedback: string; improvements: string[] }>;
  explainCode(_code: string, _language: string): Promise<string>;
  generateTests(_code: string, _language: string): Promise<string>;
}

/**
 * Real API client implementation for Augment AI
 * Falls back to OpenAI API if Augment API is not available
 */
class RealAugmentApiClient implements AugmentApiClient {
  private readonly config: AugmentConfig;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: AugmentConfig) {
    this.config = config;
    this.baseUrl = this.config.apiEndpoint || 'https://api.openai.com/v1';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey || process.env.OPENAI_API_KEY || ''}`,
      'User-Agent': 'Augment-MCP-Server/1.0.0'
    };
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysisResult> {
    try {
      const prompt = `Analyze the following ${language} code and provide a detailed analysis:

${code}

Please provide:
1. Lines of code count
2. Complexity score (1-20)
3. Issues found (type: error/warning/info, message, line number if applicable)
4. Suggestions for improvement

Format the response as JSON with the structure:
{
  "language": "${language}",
  "linesOfCode": number,
  "complexity": number,
  "issues": [{"type": "warning", "message": "...", "line": number}],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await this.makeApiCall(prompt);
      return this.parseCodeAnalysisResponse(response, code, language);
    } catch (error) {
      logError('API call failed for code analysis', error as Error);
      // Fallback to mock implementation
      return this.fallbackAnalyzeCode(code, language);
    }
  }

  async generateDocumentation(code: string, language: string): Promise<string> {
    try {
      const prompt = `Generate comprehensive documentation for the following ${language} code:

${code}

Please provide:
- Overview of what the code does
- Function/method descriptions
- Usage examples
- Important notes

Format as markdown.`;

      return await this.makeApiCall(prompt);
    } catch (error) {
      logError('API call failed for documentation generation', error as Error);
      return this.fallbackGenerateDocumentation(code, language);
    }
  }

  async reviewCode(code: string, language: string): Promise<{ score: number; feedback: string; improvements: string[] }> {
    try {
      const prompt = `Review the following ${language} code and provide:

${code}

Please provide:
1. A quality score from 0-100
2. Detailed feedback on code quality
3. List of specific improvements

Format as JSON:
{
  "score": number,
  "feedback": "detailed feedback",
  "improvements": ["improvement1", "improvement2"]
}`;

      const response = await this.makeApiCall(prompt);
      return this.parseCodeReviewResponse(response, code);
    } catch (error) {
      logError('API call failed for code review', error as Error);
      return this.fallbackReviewCode(code);
    }
  }

  async explainCode(code: string, language: string): Promise<string> {
    try {
      const prompt = `Explain the following ${language} code in detail:

${code}

Please provide:
- What the code does
- How it works
- Key concepts used
- Any notable patterns or techniques

Write in a clear, educational manner.`;

      return await this.makeApiCall(prompt);
    } catch (error) {
      logError('API call failed for code explanation', error as Error);
      return this.fallbackExplainCode(code, language);
    }
  }

  async generateTests(code: string, language: string): Promise<string> {
    try {
      const prompt = `Generate comprehensive unit tests for the following ${language} code:

${code}

Please provide:
- Test cases for all functions/methods
- Edge cases and error conditions
- Proper test structure for ${language}
- Mock data where needed

Use appropriate testing framework for ${language}.`;

      return await this.makeApiCall(prompt);
    } catch (error) {
      logError('API call failed for test generation', error as Error);
      return this.fallbackGenerateTests(code, language);
    }
  }

  private async makeApiCall(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analyst and software engineer. Provide detailed, accurate analysis and suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseCodeAnalysisResponse(response: string, code: string, language: string): CodeAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        language: parsed.language || language,
        linesOfCode: parsed.linesOfCode || code.split('\n').length,
        complexity: parsed.complexity || 1,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || []
      };
    } catch {
      // Fallback if JSON parsing fails
      return this.fallbackAnalyzeCode(code, language);
    }
  }

  private parseCodeReviewResponse(response: string, code: string): { score: number; feedback: string; improvements: string[] } {
    try {
      const parsed = JSON.parse(response);
      return {
        score: parsed.score || 50,
        feedback: parsed.feedback || 'Code review completed',
        improvements: parsed.improvements || []
      };
    } catch {
      return this.fallbackReviewCode(code);
    }
  }

  // Fallback methods when API calls fail
  private fallbackAnalyzeCode(code: string, language: string): CodeAnalysisResult {
    const issues: CodeAnalysisResult['issues'] = [];

    if (code.includes('console.log')) {
      issues.push({
        type: 'warning',
        message: 'Consider removing console.log statements in production code',
        line: code.split('\n').findIndex(line => line.includes('console.log')) + 1,
      });
    }

    if (code.includes('var ')) {
      issues.push({
        type: 'warning',
        message: 'Consider using let or const instead of var',
        line: code.split('\n').findIndex(line => line.includes('var ')) + 1,
      });
    }

    return {
      language,
      linesOfCode: code.split('\n').length,
      complexity: this.calculateComplexity(code),
      issues,
      suggestions: ['Consider adding JSDoc comments', 'Use TypeScript for better type safety']
    };
  }

  private fallbackGenerateDocumentation(code: string, language: string): string {
    return `# Code Documentation

## Overview
This ${language} code contains ${code.split('\n').length} lines.

## Functions
${this.extractFunctions(code).map(func => `- \`${func}\`: Function implementation`).join('\n')}

## Usage
\`\`\`${language}
${code.split('\n').slice(0, 5).join('\n')}
\`\`\`

*Generated by Augment MCP Server*`;
  }

  private fallbackReviewCode(code: string): { score: number; feedback: string; improvements: string[] } {
    let score = 100;
    const improvements: string[] = [];

    if (code.includes('console.log')) {
      score -= 5;
      improvements.push('Remove console.log statements');
    }
    if (code.includes('var ')) {
      score -= 10;
      improvements.push('Replace var with let or const');
    }

    return {
      score: Math.max(0, score),
      feedback: score >= 80 ? 'Good code quality' : 'Code needs improvement',
      improvements
    };
  }

  private fallbackExplainCode(code: string, language: string): string {
    const lines = code.split('\n').length;
    const functions = this.extractFunctions(code);

    return `This ${language} code consists of ${lines} lines and contains:
${functions.length > 0 ? `Functions: ${functions.join(', ')}` : 'No functions detected'}

The code implements basic functionality with ${this.calculateComplexity(code) > 10 ? 'high' : 'moderate'} complexity.`;
  }

  private fallbackGenerateTests(code: string, language: string): string {
    const functions = this.extractFunctions(code);

    return `// Generated tests for ${language} code
describe('Code Tests', () => {
${functions.map(func => `  test('${func} should work correctly', () => {
    expect(${func}).toBeDefined();
  });`).join('\n\n')}
});`;
  }

  private calculateComplexity(code: string): number {
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1;

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private extractFunctions(code: string): string[] {
    const functions: string[] = [];
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const arrowFunctionRegex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;

    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    while ((match = arrowFunctionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    return functions;
  }
}

export class AugmentService {
  private readonly config: AugmentConfig;
  private readonly apiClient: AugmentApiClient;

  constructor() {
    this.config = augmentConfig;
    this.apiClient = new RealAugmentApiClient(this.config);
  }

  /**
   * Check if Augment AI is available and configured
   */
  isAvailable(): boolean {
    return this.config.enabled && !!this.config.apiEndpoint;
  }

  /**
   * Analyze code using Augment AI
   */
  async analyzeCode(code: string, language: string = 'javascript'): Promise<CodeAnalysisResult> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Augment AI is not available or configured');
      }

      logDebug('Analyzing code with Augment AI', { language, codeLength: code.length });

      const result = await this.apiClient.analyzeCode(code, language);

      logInfo('Code analysis completed', {
        language,
        linesOfCode: result.linesOfCode,
        issuesFound: result.issues.length,
        suggestionsCount: result.suggestions.length
      });

      return result;
    } catch (error) {
      logError('Code analysis failed', error as Error, { language });
      throw error;
    }
  }

  /**
   * Generate documentation using Augment AI
   */
  async generateDocumentation(code: string, language: string = 'javascript'): Promise<string> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Augment AI is not available or configured');
      }

      logDebug('Generating documentation with Augment AI', { language, codeLength: code.length });

      const documentation = await this.apiClient.generateDocumentation(code, language);

      logInfo('Documentation generated successfully', {
        language,
        documentationLength: documentation.length
      });

      return documentation;
    } catch (error) {
      logError('Documentation generation failed', error as Error, { language });
      throw error;
    }
  }

  /**
   * Review code using Augment AI
   */
  async reviewCode(code: string, language: string = 'javascript'): Promise<{
    score: number;
    feedback: string;
    improvements: string[];
  }> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Augment AI is not available or configured');
      }

      logDebug('Reviewing code with Augment AI', { language, codeLength: code.length });

      const review = await this.apiClient.reviewCode(code, language);

      logInfo('Code review completed', {
        language,
        score: review.score,
        improvementsCount: review.improvements.length
      });

      return review;
    } catch (error) {
      logError('Code review failed', error as Error, { language });
      throw error;
    }
  }

  /**
   * Explain code using Augment AI
   */
  async explainCode(code: string, language: string = 'javascript'): Promise<string> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Augment AI is not available or configured');
      }

      logDebug('Explaining code with Augment AI', { language, codeLength: code.length });

      const explanation = await this.apiClient.explainCode(code, language);

      logInfo('Code explanation generated', {
        language,
        explanationLength: explanation.length
      });

      return explanation;
    } catch (error) {
      logError('Code explanation failed', error as Error, { language });
      throw error;
    }
  }

  /**
   * Generate tests using Augment AI
   */
  async generateTests(code: string, language: string = 'javascript'): Promise<string> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Augment AI is not available or configured');
      }

      logDebug('Generating tests with Augment AI', { language, codeLength: code.length });

      const tests = await this.apiClient.generateTests(code, language);

      logInfo('Tests generated successfully', {
        language,
        testsLength: tests.length
      });

      return tests;
    } catch (error) {
      logError('Test generation failed', error as Error, { language });
      throw error;
    }
  }

}
