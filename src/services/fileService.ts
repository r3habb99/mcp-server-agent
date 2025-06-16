/**
 * File system operations service
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import type { FileInfo, SearchOptions, SearchResult } from '../interfaces/index.js';
import { validatePath, validateFileExists, validateDirectoryExists, validateFileSize, isTextFile } from '../utils/validation.js';
import { logInfo, logError, logDebug } from '../utils/logger.js';
import { securityConfig } from '../server/config.js';

export class FileService {
  private readonly maxFileSize: number;

  constructor() {
    this.maxFileSize = securityConfig.maxFileSize;
  }

  /**
   * Read file content
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      const validatedPath = validatePath(filePath);
      await validateFileExists(validatedPath);
      await validateFileSize(validatedPath, this.maxFileSize);

      logDebug('Reading file', { path: validatedPath, encoding });
      
      const content = await fs.readFile(validatedPath, encoding);
      logInfo('File read successfully', { path: validatedPath, size: content.length });
      
      return content;
    } catch (error) {
      logError('Failed to read file', error as Error, { path: filePath });
      throw error;
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string, options: { overwrite?: boolean; encoding?: BufferEncoding } = {}): Promise<void> {
    try {
      const validatedPath = validatePath(filePath);
      const { overwrite = false, encoding = 'utf8' } = options;

      // Check if file exists and overwrite is not allowed
      if (!overwrite && await fs.pathExists(validatedPath)) {
        throw new Error(`File already exists and overwrite is disabled: ${validatedPath}`);
      }

      // Ensure directory exists
      await fs.ensureDir(path.dirname(validatedPath));

      logDebug('Writing file', { path: validatedPath, size: content.length, encoding });
      
      await fs.writeFile(validatedPath, content, encoding);
      logInfo('File written successfully', { path: validatedPath, size: content.length });
    } catch (error) {
      logError('Failed to write file', error as Error, { path: filePath });
      throw error;
    }
  }

  /**
   * Copy file or directory
   */
  async copyPath(source: string, destination: string, overwrite: boolean = false): Promise<void> {
    try {
      const validatedSource = validatePath(source);
      const validatedDestination = validatePath(destination);

      await validateFileExists(validatedSource);

      if (!overwrite && await fs.pathExists(validatedDestination)) {
        throw new Error(`Destination already exists and overwrite is disabled: ${validatedDestination}`);
      }

      logDebug('Copying path', { source: validatedSource, destination: validatedDestination });
      
      await fs.copy(validatedSource, validatedDestination, { overwrite });
      logInfo('Path copied successfully', { source: validatedSource, destination: validatedDestination });
    } catch (error) {
      logError('Failed to copy path', error as Error, { source, destination });
      throw error;
    }
  }

  /**
   * Move file or directory
   */
  async movePath(source: string, destination: string, overwrite: boolean = false): Promise<void> {
    try {
      const validatedSource = validatePath(source);
      const validatedDestination = validatePath(destination);

      await validateFileExists(validatedSource);

      if (!overwrite && await fs.pathExists(validatedDestination)) {
        throw new Error(`Destination already exists and overwrite is disabled: ${validatedDestination}`);
      }

      logDebug('Moving path', { source: validatedSource, destination: validatedDestination });
      
      await fs.move(validatedSource, validatedDestination, { overwrite });
      logInfo('Path moved successfully', { source: validatedSource, destination: validatedDestination });
    } catch (error) {
      logError('Failed to move path', error as Error, { source, destination });
      throw error;
    }
  }

  /**
   * Delete file or directory
   */
  async deletePath(targetPath: string, recursive: boolean = false): Promise<void> {
    try {
      const validatedPath = validatePath(targetPath);
      await validateFileExists(validatedPath);

      const stats = await fs.stat(validatedPath);
      
      if (stats.isDirectory() && !recursive) {
        throw new Error(`Cannot delete directory without recursive flag: ${validatedPath}`);
      }

      logDebug('Deleting path', { path: validatedPath, recursive });
      
      await fs.remove(validatedPath);
      logInfo('Path deleted successfully', { path: validatedPath });
    } catch (error) {
      logError('Failed to delete path', error as Error, { path: targetPath });
      throw error;
    }
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    try {
      const validatedPath = validatePath(dirPath);

      if (await fs.pathExists(validatedPath)) {
        const stats = await fs.stat(validatedPath);
        if (stats.isDirectory()) {
          logInfo('Directory already exists', { path: validatedPath });
          return;
        } else {
          throw new Error(`Path exists but is not a directory: ${validatedPath}`);
        }
      }

      logDebug('Creating directory', { path: validatedPath, recursive });
      
      if (recursive) {
        await fs.ensureDir(validatedPath);
      } else {
        await fs.mkdir(validatedPath);
      }
      
      logInfo('Directory created successfully', { path: validatedPath });
    } catch (error) {
      logError('Failed to create directory', error as Error, { path: dirPath });
      throw error;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string, options: { recursive?: boolean; includeHidden?: boolean; maxDepth?: number } = {}): Promise<FileInfo[]> {
    try {
      const validatedPath = validatePath(dirPath);
      await validateDirectoryExists(validatedPath);

      const { recursive = false, includeHidden = false, maxDepth = 3 } = options;

      logDebug('Listing directory', { path: validatedPath, recursive, includeHidden, maxDepth });

      const files: FileInfo[] = [];
      
      if (recursive) {
        const pattern = includeHidden ? '**/*' : '**/[!.]*';
        const globOptions = {
          cwd: validatedPath,
          dot: includeHidden,
          maxDepth,
        };

        const entries = await glob(pattern, globOptions);

        for (const entry of entries) {
          const fullPath = path.join(validatedPath, entry);
          const stats = await fs.stat(fullPath);
          const name = path.basename(entry);

          files.push({
            path: fullPath,
            name,
            size: stats.size,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            lastModified: stats.mtime,
            permissions: stats.mode.toString(8),
            extension: stats.isFile() ? path.extname(name) : undefined,
          });
        }
      } else {
        const entries = await fs.readdir(validatedPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }

          const fullPath = path.join(validatedPath, entry.name);
          const stats = await fs.stat(fullPath);
          
          files.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            lastModified: stats.mtime,
            permissions: stats.mode.toString(8),
            extension: entry.isFile() ? path.extname(entry.name) : undefined,
          });
        }
      }

      logInfo('Directory listed successfully', { path: validatedPath, fileCount: files.length });
      return files.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      logError('Failed to list directory', error as Error, { path: dirPath });
      throw error;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const validatedPath = validatePath(filePath);
      await validateFileExists(validatedPath);

      const stats = await fs.stat(validatedPath);
      const name = path.basename(validatedPath);

      const fileInfo: FileInfo = {
        path: validatedPath,
        name,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        lastModified: stats.mtime,
        permissions: stats.mode.toString(8),
        extension: stats.isFile() ? path.extname(name) : undefined,
      };

      logDebug('File info retrieved', { path: filePath, size: fileInfo.size });
      return fileInfo;
    } catch (error) {
      logError('Failed to get file info', error as Error, { path: filePath });
      throw error;
    }
  }

  /**
   * Search for files and content
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    try {
      const validatedDirectory = validatePath(options.directory);
      await validateDirectoryExists(validatedDirectory);

      const {
        pattern,
        recursive = true,
        includeHidden = false,
        fileTypes = [],
        maxResults = 100,
      } = options;

      logDebug('Starting search', { pattern, directory: validatedDirectory, recursive, fileTypes });

      const results: SearchResult[] = [];
      const searchPattern = recursive ? '**/*' : '*';
      const globOptions = {
        cwd: validatedDirectory,
        dot: includeHidden,
        nodir: true,
      };

      const files = await glob(searchPattern, globOptions);
      
      for (const file of files) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(validatedDirectory, file);
        const ext = path.extname(file).toLowerCase();

        // Filter by file types if specified
        if (fileTypes.length > 0 && !fileTypes.includes(ext)) {
          continue;
        }

        // Only search in text files
        if (!isTextFile(fullPath)) {
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const lines = content.split('\n');
          
          const regex = new RegExp(pattern, 'gi');
          
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;

            const line = lines[i];
            const matches = [...line.matchAll(regex)];
            
            for (const match of matches) {
              if (results.length >= maxResults) break;

              const contextStart = Math.max(0, i - 2);
              const contextEnd = Math.min(lines.length - 1, i + 2);
              const context = lines.slice(contextStart, contextEnd + 1).join('\n');

              results.push({
                file: fullPath,
                line: i + 1,
                column: match.index! + 1,
                match: match[0],
                context,
              });
            }
          }
        } catch (error) {
          // Skip files that can't be read
          logDebug('Skipping file due to read error', { file: fullPath, error });
          continue;
        }
      }

      logInfo('Search completed', { 
        pattern, 
        directory: validatedDirectory, 
        resultCount: results.length,
        filesSearched: files.length 
      });

      return results;
    } catch (error) {
      logError('Search failed', error as Error, { options });
      throw error;
    }
  }

  /**
   * Check if path exists
   */
  async pathExists(targetPath: string): Promise<boolean> {
    try {
      const validatedPath = validatePath(targetPath);
      return await fs.pathExists(validatedPath);
    } catch {
      return false;
    }
  }

  /**
   * Get file MIME type
   */
  getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'application/xml',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
