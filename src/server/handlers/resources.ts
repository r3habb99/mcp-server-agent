/**
 * Resource handlers for the MCP server
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileService } from '../../services/fileService.js';
import { SystemService } from '../../services/systemService.js';
import { logResourceAccess, logError } from '../../utils/logger.js';
import { validatePath } from '../../utils/validation.js';

export function registerResources(server: McpServer): void {
  const fileService = new FileService();
  const systemService = new SystemService();

  // File content resource
  server.resource(
    'file-content',
    new ResourceTemplate('file://{path}', { list: undefined }),
    async (uri, { path }) => {
      const startTime = Date.now();
      try {
        const pathString = Array.isArray(path) ? path[0] : path;
        const validatedPath = validatePath(pathString);
        const content = await fileService.readFile(validatedPath);
        const mimeType = fileService.getMimeType(validatedPath);
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType,
            text: content,
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access file resource', error as Error, { path });
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
        };
      }
    }
  );

  // Directory listing resource
  server.resource(
    'directory-listing',
    new ResourceTemplate('directory://{path}', { list: undefined }),
    async (uri, { path }) => {
      const startTime = Date.now();
      try {
        const pathString = Array.isArray(path) ? path[0] : path;
        const validatedPath = validatePath(pathString);
        const files = await fileService.listDirectory(validatedPath, {
          recursive: false,
          includeHidden: false,
        });
        
        const listing = files.map(file => ({
          name: file.name,
          type: file.isDirectory ? 'directory' : 'file',
          size: file.size,
          lastModified: file.lastModified.toISOString(),
          permissions: file.permissions,
          extension: file.extension,
        }));
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(listing, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access directory resource', error as Error, { path });
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // System information resource
  server.resource(
    'system-info',
    'system://info',
    async (uri) => {
      const startTime = Date.now();
      try {
        const systemInfo = await systemService.getSystemInfo();
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(systemInfo, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access system info resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // System health resource
  server.resource(
    'system-health',
    'system://health',
    async (uri) => {
      const startTime = Date.now();
      try {
        const healthCheck = await systemService.getHealthCheck();
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(healthCheck, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access system health resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              status: 'unhealthy',
              timestamp: new Date().toISOString(),
            }),
          }],
        };
      }
    }
  );

  // Process list resource
  server.resource(
    'process-list',
    'system://processes',
    async (uri) => {
      const startTime = Date.now();
      try {
        const processes = await systemService.getProcesses();
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(processes, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access process list resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // Network information resource
  server.resource(
    'network-info',
    'system://network',
    async (uri) => {
      const startTime = Date.now();
      try {
        const networkInfo = await systemService.getNetworkInfo();
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(networkInfo, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access network info resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // Environment variables resource
  server.resource(
    'environment',
    'system://environment',
    async (uri) => {
      const startTime = Date.now();
      try {
        const envVars = systemService.getEnvironmentVariables();
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(envVars, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access environment resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // File information resource
  server.resource(
    'file-info',
    new ResourceTemplate('fileinfo://{path}', { list: undefined }),
    async (uri, { path }) => {
      const startTime = Date.now();
      try {
        const pathString = Array.isArray(path) ? path[0] : path;
        const validatedPath = validatePath(pathString);
        const fileInfo = await fileService.getFileInfo(validatedPath);
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(fileInfo, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access file info resource', error as Error, { path });
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );

  // Server configuration resource
  server.resource(
    'server-config',
    'mcp://config',
    async (uri) => {
      const startTime = Date.now();
      try {
        const config = {
          name: 'augment-mcp-server',
          version: '1.0.0',
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
          },
          features: {
            fileOperations: true,
            systemInfo: true,
            processManagement: true,
            networkInfo: true,
            codeAnalysis: true,
            searchOperations: true,
          },
          timestamp: new Date().toISOString(),
        };
        
        logResourceAccess(uri.href, true, Date.now() - startTime);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          }],
        };
      } catch (error) {
        logResourceAccess(uri.href, false, Date.now() - startTime);
        logError('Failed to access server config resource', error as Error);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          }],
        };
      }
    }
  );
}
