/**
 * Tool handlers for the MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FileService } from '../../services/fileService.js';
import { SystemService } from '../../services/systemService.js';
import { AugmentService } from '../../services/augmentService.js';
import { logToolExecution } from '../../utils/logger.js';
import {
  fileReadSchema,
  fileWriteSchema,
  fileCopySchema,
  fileMoveSchema,
  fileDeleteSchema,
  directoryCreateSchema,
  directoryListSchema,
  searchSchema,
  commandSchema,
} from '../../utils/validation.js';

export function registerTools(server: McpServer): void {
  const fileService = new FileService();
  const systemService = new SystemService();
  const augmentService = new AugmentService();

  // File Operations Tools

  server.tool(
    'read-file',
    'Read content from a file',
    {
      path: z.string().describe('Path to the file to read'),
      encoding: z.enum(['utf8', 'ascii', 'base64', 'binary', 'hex']).default('utf8').describe('File encoding'),
    },
    async ({ path, encoding }) => {
      const startTime = Date.now();
      try {
        const validatedInput = fileReadSchema.parse({ path, encoding });
        const content = await fileService.readFile(validatedInput.path, validatedInput.encoding);

        logToolExecution('read-file', { path }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: content,
          }],
        };
      } catch (error) {
        logToolExecution('read-file', { path }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'write-file',
    'Write content to a file',
    {
      path: z.string().describe('Path to the file to write'),
      content: z.string().describe('Content to write to the file'),
      overwrite: z.boolean().default(false).describe('Whether to overwrite existing file'),
      encoding: z.enum(['utf8', 'ascii', 'base64', 'binary', 'hex']).default('utf8').describe('File encoding'),
    },
    async ({ path, content, overwrite, encoding }) => {
      const startTime = Date.now();
      try {
        const validatedInput = fileWriteSchema.parse({ path, content, overwrite, encoding });
        await fileService.writeFile(validatedInput.path, validatedInput.content, {
          overwrite: validatedInput.overwrite,
          encoding: validatedInput.encoding,
        });

        logToolExecution('write-file', { path, contentLength: content.length }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `File written successfully: ${path}`,
          }],
        };
      } catch (error) {
        logToolExecution('write-file', { path }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'copy-path',
    'Copy a file or directory to another location',
    {
      source: z.string().describe('Source path to copy'),
      destination: z.string().describe('Destination path'),
      overwrite: z.boolean().default(false).describe('Whether to overwrite existing destination'),
    },
    async ({ source, destination, overwrite }) => {
      const startTime = Date.now();
      try {
        const validatedInput = fileCopySchema.parse({ source, destination, overwrite });
        await fileService.copyPath(validatedInput.source, validatedInput.destination, validatedInput.overwrite);

        logToolExecution('copy-path', { source, destination }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Path copied successfully: ${source} → ${destination}`,
          }],
        };
      } catch (error) {
        logToolExecution('copy-path', { source, destination }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error copying path: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'move-path',
    'Move a file or directory to another location',
    {
      source: z.string().describe('Source path to move'),
      destination: z.string().describe('Destination path'),
      overwrite: z.boolean().default(false).describe('Whether to overwrite existing destination'),
    },
    async ({ source, destination, overwrite }) => {
      const startTime = Date.now();
      try {
        const validatedInput = fileMoveSchema.parse({ source, destination, overwrite });
        await fileService.movePath(validatedInput.source, validatedInput.destination, validatedInput.overwrite);

        logToolExecution('move-path', { source, destination }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Path moved successfully: ${source} → ${destination}`,
          }],
        };
      } catch (error) {
        logToolExecution('move-path', { source, destination }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error moving path: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'delete-path',
    'Delete a file or directory',
    {
      path: z.string().describe('Path to delete'),
      recursive: z.boolean().default(false).describe('Whether to delete directories recursively'),
    },
    async ({ path, recursive }) => {
      const startTime = Date.now();
      try {
        const validatedInput = fileDeleteSchema.parse({ path, recursive });
        await fileService.deletePath(validatedInput.path, validatedInput.recursive);

        logToolExecution('delete-path', { path, recursive }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Path deleted successfully: ${path}`,
          }],
        };
      } catch (error) {
        logToolExecution('delete-path', { path }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error deleting path: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'create-directory',
    'Create a new directory',
    {
      path: z.string().describe('Directory path to create'),
      recursive: z.boolean().default(true).describe('Whether to create parent directories'),
    },
    async ({ path, recursive }) => {
      const startTime = Date.now();
      try {
        const validatedInput = directoryCreateSchema.parse({ path, recursive });
        await fileService.createDirectory(validatedInput.path, validatedInput.recursive);

        logToolExecution('create-directory', { path, recursive }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Directory created successfully: ${path}`,
          }],
        };
      } catch (error) {
        logToolExecution('create-directory', { path }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error creating directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'list-directory',
    'List contents of a directory',
    {
      path: z.string().describe('Directory path to list'),
      recursive: z.boolean().default(false).describe('Whether to list recursively'),
      includeHidden: z.boolean().default(false).describe('Whether to include hidden files'),
      maxDepth: z.number().min(1).max(10).default(3).describe('Maximum depth for recursive listing'),
    },
    async ({ path, recursive, includeHidden, maxDepth }) => {
      const startTime = Date.now();
      try {
        const validatedInput = directoryListSchema.parse({ path, recursive, includeHidden, maxDepth });
        const files = await fileService.listDirectory(validatedInput.path, {
          recursive: validatedInput.recursive,
          includeHidden: validatedInput.includeHidden,
          maxDepth: validatedInput.maxDepth,
        });

        const fileList = files.map(file =>
          `${file.isDirectory ? '📁' : '📄'} ${file.name} (${file.size} bytes, ${file.lastModified.toISOString()})`
        ).join('\n');

        logToolExecution('list-directory', { path, fileCount: files.length }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Directory listing for ${path}:\n\n${fileList}`,
          }],
        };
      } catch (error) {
        logToolExecution('list-directory', { path }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error listing directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'search-files',
    'Search for text patterns in files',
    {
      pattern: z.string().describe('Search pattern (regex supported)'),
      directory: z.string().describe('Directory to search in'),
      recursive: z.boolean().default(true).describe('Whether to search recursively'),
      includeHidden: z.boolean().default(false).describe('Whether to include hidden files'),
      fileTypes: z.array(z.string()).optional().describe('File extensions to include (e.g., [".js", ".ts"])'),
      maxResults: z.number().min(1).max(1000).default(100).describe('Maximum number of results'),
      caseSensitive: z.boolean().default(false).describe('Whether search is case sensitive'),
    },
    async ({ pattern, directory, recursive, includeHidden, fileTypes, maxResults, caseSensitive }) => {
      const startTime = Date.now();
      try {
        const validatedInput = searchSchema.parse({
          pattern,
          directory,
          recursive,
          includeHidden,
          fileTypes,
          maxResults,
          caseSensitive,
        });

        const results = await fileService.search(validatedInput);

        const resultText = results.length > 0
          ? results.map(result =>
              `📍 ${result.file}:${result.line}:${result.column}\n   Match: "${result.match}"\n   Context: ${result.context.replace(/\n/g, '\\n')}`
            ).join('\n\n')
          : 'No matches found.';

        logToolExecution('search-files', { pattern, directory, resultCount: results.length }, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Search results for "${pattern}" in ${directory}:\n\n${resultText}`,
          }],
        };
      } catch (error) {
        logToolExecution('search-files', { pattern, directory }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // System Information Tools

  server.tool(
    'get-system-info',
    'Get comprehensive system information',
    {},
    async () => {
      const startTime = Date.now();
      try {
        const systemInfo = await systemService.getSystemInfo();

        const infoText = `System Information:
Platform: ${systemInfo.platform}
Architecture: ${systemInfo.arch}
Node.js Version: ${systemInfo.nodeVersion}
Hostname: ${systemInfo.hostname}
CPU Count: ${systemInfo.cpuCount}
Total Memory: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB
Free Memory: ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB
Uptime: ${Math.floor(systemInfo.uptime / 3600)} hours
Load Average: ${systemInfo.loadAverage.map(load => load.toFixed(2)).join(', ')}`;

        logToolExecution('get-system-info', {}, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: infoText,
          }],
        };
      } catch (error) {
        logToolExecution('get-system-info', {}, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error getting system info: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'execute-command',
    'Execute a system command',
    {
      command: z.string().describe('Command to execute'),
      args: z.array(z.string()).default([]).describe('Command arguments'),
      cwd: z.string().optional().describe('Working directory'),
      timeout: z.number().min(1000).max(300000).default(30000).describe('Timeout in milliseconds'),
      shell: z.boolean().default(false).describe('Whether to run in shell'),
    },
    async ({ command, args, cwd, timeout, shell }) => {
      const startTime = Date.now();
      try {
        const validatedInput = commandSchema.parse({ command, args, cwd, timeout, shell });
        const result = await systemService.executeCommand(
          validatedInput.command,
          validatedInput.args,
          {
            cwd: validatedInput.cwd,
            timeout: validatedInput.timeout,
            shell: validatedInput.shell,
          }
        );

        const output = `Command: ${command} ${args.join(' ')}
Exit Code: ${result.exitCode}
${result.stdout ? `\nStdout:\n${result.stdout}` : ''}
${result.stderr ? `\nStderr:\n${result.stderr}` : ''}`;

        logToolExecution('execute-command', { command, exitCode: result.exitCode }, Date.now() - startTime, result.exitCode === 0);

        return {
          content: [{
            type: 'text' as const,
            text: output,
          }],
          isError: result.exitCode !== 0,
        };
      } catch (error) {
        logToolExecution('execute-command', { command }, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get-processes',
    'Get list of running processes',
    {},
    async () => {
      const startTime = Date.now();
      try {
        const processes = await systemService.getProcesses();

        const processText = processes
          .slice(0, 20) // Limit to top 20 processes
          .map(proc => `PID: ${proc.pid}, Name: ${proc.name}, CPU: ${proc.cpu.toFixed(1)}%, Memory: ${proc.memory.toFixed(1)}%`)
          .join('\n');

        logToolExecution('get-processes', {}, Date.now() - startTime, true);

        return {
          content: [{
            type: 'text' as const,
            text: `Top 20 Processes:\n\n${processText}`,
          }],
        };
      } catch (error) {
        logToolExecution('get-processes', {}, Date.now() - startTime, false);
        return {
          content: [{
            type: 'text' as const,
            text: `Error getting processes: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Augment AI Tools (if available)
  if (augmentService.isAvailable()) {
    server.tool(
      'analyze-code',
      'Analyze code for issues and complexity',
      {
        code: z.string().describe('Code to analyze'),
        language: z.string().default('javascript').describe('Programming language'),
      },
      async ({ code, language }) => {
        const startTime = Date.now();
        try {
          const analysis = await augmentService.analyzeCode(code, language);

          const analysisText = `Code Analysis Results:
Language: ${analysis.language}
Lines of Code: ${analysis.linesOfCode}
Complexity: ${analysis.complexity}

Issues Found (${analysis.issues.length}):
${analysis.issues.map(issue => `- ${issue.type.toUpperCase()}: ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}`).join('\n')}

Suggestions (${analysis.suggestions.length}):
${analysis.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}`;

          logToolExecution('analyze-code', { language, linesOfCode: analysis.linesOfCode }, Date.now() - startTime, true);

          return {
            content: [{
              type: 'text' as const,
              text: analysisText,
            }],
          };
        } catch (error) {
          logToolExecution('analyze-code', { language }, Date.now() - startTime, false);
          return {
            content: [{
              type: 'text' as const,
              text: `Error analyzing code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );

    server.tool(
      'review-code',
      'Review code quality and provide feedback',
      {
        code: z.string().describe('Code to review'),
        language: z.string().default('javascript').describe('Programming language'),
      },
      async ({ code, language }) => {
        const startTime = Date.now();
        try {
          const review = await augmentService.reviewCode(code, language);

          const reviewText = `Code Review Results:
Score: ${review.score}/100

Feedback:
${review.feedback}

Improvements (${review.improvements.length}):
${review.improvements.map(improvement => `- ${improvement}`).join('\n')}`;

          logToolExecution('review-code', { language, score: review.score }, Date.now() - startTime, true);

          return {
            content: [{
              type: 'text' as const,
              text: reviewText,
            }],
          };
        } catch (error) {
          logToolExecution('review-code', { language }, Date.now() - startTime, false);
          return {
            content: [{
              type: 'text' as const,
              text: `Error reviewing code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }],
            isError: true,
          };
        }
      }
    );
  }
}
