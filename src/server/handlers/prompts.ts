/**
 * Prompt handlers for the MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FileService } from '../../services/fileService.js';
import { logPromptExecution, logError } from '../../utils/logger.js';

export function registerPrompts(server: McpServer): void {
  const fileService = new FileService();

  // Code review prompt
  server.prompt(
    'code-review',
    'Generate a comprehensive code review',
    {
      code: z.string().describe('Code to review'),
      language: z.string().describe('Programming language'),
      focus: z.enum(['security', 'performance', 'maintainability', 'general']).optional().describe('Review focus area'),
    },
    ({ code, language, focus }) => {
      try {
        const reviewFocus = focus || 'general';
        logPromptExecution('code-review', { language, focus: reviewFocus, codeLength: code.length }, true);

        const focusInstructions = {
          security: 'Focus on security vulnerabilities, input validation, and potential attack vectors.',
          performance: 'Focus on performance optimizations, algorithmic efficiency, and resource usage.',
          maintainability: 'Focus on code structure, readability, documentation, and maintainability.',
          general: 'Provide a comprehensive review covering all aspects of code quality.',
        };

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please review the following ${language} code with a focus on ${reviewFocus}:

${focusInstructions[reviewFocus as keyof typeof focusInstructions]}

Code to review:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Overall assessment and score (1-10)
2. Specific issues found with line numbers
3. Suggestions for improvement
4. Best practices recommendations
5. Security considerations (if applicable)

Format your response in a clear, structured manner.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('code-review', { language, focus }, false);
        logError('Failed to create code review prompt', error as Error);
        throw error;
      }
    }
  );

  // Documentation generation prompt
  server.prompt(
    'generate-docs',
    'Generate documentation for code',
    {
      code: z.string().describe('Code to document'),
      language: z.string().describe('Programming language'),
      style: z.enum(['jsdoc', 'markdown', 'inline', 'api']).optional().describe('Documentation style'),
      includeExamples: z.string().optional().describe('Include usage examples (true/false)'),
    },
    ({ code, language, style, includeExamples }) => {
      try {
        const docStyle = style || 'markdown';
        const withExamples = includeExamples !== 'false';
        logPromptExecution('generate-docs', { language, style: docStyle, includeExamples: withExamples }, true);

        const styleInstructions = {
          jsdoc: 'Generate JSDoc-style comments with proper tags (@param, @returns, @throws, etc.)',
          markdown: 'Generate comprehensive Markdown documentation with sections and formatting',
          inline: 'Generate concise inline comments explaining the code logic',
          api: 'Generate API documentation suitable for external consumers',
        };

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please generate ${docStyle} documentation for the following ${language} code:

${styleInstructions[docStyle as keyof typeof styleInstructions]}

${withExamples ? 'Include practical usage examples and code snippets.' : 'Focus on clear descriptions without examples.'}

Code to document:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Clear description of what the code does
2. Parameter documentation (if applicable)
3. Return value documentation (if applicable)
4. ${withExamples ? 'Usage examples' : 'Implementation notes'}
5. Any important considerations or limitations

Format the documentation according to the ${docStyle} style.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('generate-docs', { language, style }, false);
        logError('Failed to create documentation prompt', error as Error);
        throw error;
      }
    }
  );

  // Code explanation prompt
  server.prompt(
    'explain-code',
    'Explain code for different audiences',
    {
      code: z.string().describe('Code to explain'),
      language: z.string().describe('Programming language'),
      audience: z.enum(['beginner', 'intermediate', 'expert']).optional().describe('Target audience level'),
      detail: z.enum(['high', 'medium', 'low']).optional().describe('Level of detail'),
    },
    ({ code, language, audience, detail }) => {
      try {
        const targetAudience = audience || 'intermediate';
        const detailLevel = detail || 'medium';
        logPromptExecution('explain-code', { language, audience: targetAudience, detail: detailLevel }, true);

        const audienceInstructions = {
          beginner: 'Explain in simple terms, define technical concepts, and provide context for programming concepts.',
          intermediate: 'Assume basic programming knowledge, focus on the specific implementation and patterns used.',
          expert: 'Focus on advanced concepts, design patterns, performance implications, and architectural decisions.',
        };

        const detailInstructions = {
          high: 'Provide line-by-line explanation with detailed analysis of each component.',
          medium: 'Explain the main logic flow and key components with moderate detail.',
          low: 'Provide a high-level overview focusing on the main purpose and approach.',
        };

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please explain the following ${language} code for a ${targetAudience} audience with ${detailLevel} level of detail:

${audienceInstructions[targetAudience as keyof typeof audienceInstructions]}
${detailInstructions[detailLevel as keyof typeof detailInstructions]}

Code to explain:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Overview of what the code does
2. ${detailLevel === 'high' ? 'Step-by-step breakdown' : detailLevel === 'medium' ? 'Key logic explanation' : 'High-level summary'}
3. Important concepts or patterns used
4. ${targetAudience === 'beginner' ? 'Definitions of technical terms' : targetAudience === 'intermediate' ? 'Implementation details' : 'Advanced considerations'}
5. Potential use cases or applications

Make the explanation clear and appropriate for the ${targetAudience} level.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('explain-code', { language, audience }, false);
        logError('Failed to create code explanation prompt', error as Error);
        throw error;
      }
    }
  );

  // Debugging assistance prompt
  server.prompt(
    'debug-help',
    'Help debug code issues',
    {
      code: z.string().describe('Code with issues'),
      error: z.string().optional().describe('Error message or description'),
      language: z.string().describe('Programming language'),
      context: z.string().optional().describe('Additional context about the problem'),
    },
    ({ code, error, language, context }) => {
      try {
        logPromptExecution('debug-help', { language, hasError: !!error, hasContext: !!context }, true);

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please help debug the following ${language} code:

${error ? `Error message: ${error}` : 'No specific error message provided.'}
${context ? `Additional context: ${context}` : ''}

Code with issues:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Analysis of potential issues in the code
2. Specific problems identified with line numbers
3. Step-by-step debugging approach
4. Suggested fixes with corrected code examples
5. Prevention strategies for similar issues
6. Testing recommendations

Focus on practical solutions and clear explanations of what might be going wrong.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('debug-help', { language }, false);
        logError('Failed to create debugging prompt', error as Error);
        throw error;
      }
    }
  );

  // Test generation prompt
  server.prompt(
    'generate-tests',
    'Generate test cases for code',
    {
      code: z.string().describe('Code to test'),
      language: z.string().describe('Programming language'),
      framework: z.string().optional().describe('Testing framework'),
      coverage: z.enum(['basic', 'comprehensive', 'edge-cases']).optional().describe('Test coverage level'),
    },
    ({ code, language, framework, coverage }) => {
      try {
        const testFramework = framework || 'jest';
        const testCoverage = coverage || 'comprehensive';
        logPromptExecution('generate-tests', { language, framework: testFramework, coverage: testCoverage }, true);

        const coverageInstructions = {
          basic: 'Generate basic happy path tests for the main functionality.',
          comprehensive: 'Generate thorough tests covering normal cases, error conditions, and boundary values.',
          'edge-cases': 'Focus on edge cases, error conditions, and unusual input scenarios.',
        };

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please generate ${testFramework} tests for the following ${language} code with ${testCoverage} coverage:

${coverageInstructions[testCoverage as keyof typeof coverageInstructions]}

Code to test:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Complete test suite using ${testFramework}
2. Test cases for ${testCoverage === 'basic' ? 'main functionality' : testCoverage === 'comprehensive' ? 'all scenarios' : 'edge cases and error conditions'}
3. Mock setup if needed
4. Test data and fixtures
5. Assertions that verify correct behavior
6. Comments explaining test scenarios

Ensure tests are well-structured, maintainable, and follow ${testFramework} best practices.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('generate-tests', { language, framework }, false);
        logError('Failed to create test generation prompt', error as Error);
        throw error;
      }
    }
  );

  // File analysis prompt
  server.prompt(
    'analyze-file',
    'Analyze a file for various aspects',
    {
      filePath: z.string().describe('Path to file to analyze'),
      analysisType: z.enum(['structure', 'quality', 'security', 'performance']).optional().describe('Type of analysis'),
    },
    async ({ filePath, analysisType }) => {
      try {
        const fileContent = await fileService.readFile(filePath);
        const fileInfo = await fileService.getFileInfo(filePath);
        const language = fileInfo.extension?.substring(1) || 'text';
        const analysis = analysisType || 'quality';

        logPromptExecution('analyze-file', { filePath, analysisType: analysis, language }, true);

        const analysisInstructions = {
          structure: 'Analyze the code structure, organization, and architectural patterns.',
          quality: 'Evaluate code quality, maintainability, and adherence to best practices.',
          security: 'Identify potential security vulnerabilities and risks.',
          performance: 'Analyze performance characteristics and optimization opportunities.',
        };

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform a ${analysis} analysis of the following file:

File: ${filePath}
Language: ${language}
Size: ${fileInfo.size} bytes
Last Modified: ${fileInfo.lastModified.toISOString()}

${analysisInstructions[analysis as keyof typeof analysisInstructions]}

File content:
\`\`\`${language}
${fileContent}
\`\`\`

Please provide:
1. ${analysis.charAt(0).toUpperCase() + analysis.slice(1)} assessment summary
2. Specific findings with line numbers
3. Recommendations for improvement
4. Priority levels for identified issues
5. Best practices suggestions
6. Action items for addressing concerns

Focus on actionable insights and practical recommendations.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('analyze-file', { filePath, analysisType }, false);
        logError('Failed to create file analysis prompt', error as Error);
        throw error;
      }
    }
  );

  // Project overview prompt
  server.prompt(
    'project-overview',
    'Generate a comprehensive project overview',
    {
      projectPath: z.string().describe('Path to project directory'),
      includeFiles: z.string().optional().describe('Include file structure (true/false)'),
      maxDepth: z.string().optional().describe('Maximum directory depth to analyze'),
    },
    async ({ projectPath, includeFiles, maxDepth }) => {
      try {
        const shouldIncludeFiles = includeFiles !== 'false';
        const depth = maxDepth ? parseInt(maxDepth, 10) : 3;
        const projectFiles = shouldIncludeFiles
          ? await fileService.listDirectory(projectPath, { recursive: true, maxDepth: depth })
          : [];

        logPromptExecution('project-overview', { projectPath, fileCount: projectFiles.length }, true);

        const fileStructure = projectFiles
          .filter(file => file.isFile)
          .map(file => `${file.path} (${file.size} bytes)`)
          .join('\n');

        return {
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please analyze and provide an overview of the project at: ${projectPath}

${shouldIncludeFiles ? `Project structure (${projectFiles.length} files):
${fileStructure}` : 'File structure analysis disabled.'}

Please provide:
1. Project type and technology stack identification
2. Architecture and structure analysis
3. Key components and modules
4. Dependencies and external libraries (if identifiable)
5. Code organization and patterns
6. Potential areas for improvement
7. Development workflow suggestions
8. Documentation recommendations

Focus on high-level insights and strategic recommendations for the project.`,
            },
          }],
        };
      } catch (error) {
        logPromptExecution('project-overview', { projectPath }, false);
        logError('Failed to create project overview prompt', error as Error);
        throw error;
      }
    }
  );
}
