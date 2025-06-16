/**
 * Validation utilities for the MCP server
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs-extra';

// Common validation schemas
export const filePathSchema = z.string()
  .min(1, 'File path cannot be empty')
  .refine((path) => !path.includes('..'), 'Path traversal not allowed')
  .refine((path) => path.length < 1000, 'Path too long');

export const directoryPathSchema = z.string()
  .min(1, 'Directory path cannot be empty')
  .refine((path) => !path.includes('..'), 'Path traversal not allowed')
  .refine((path) => path.length < 1000, 'Path too long');

export const searchPatternSchema = z.string()
  .min(1, 'Search pattern cannot be empty')
  .max(500, 'Search pattern too long');

export const contentSchema = z.string()
  .max(10 * 1024 * 1024, 'Content too large (max 10MB)'); // 10MB limit

export const encodingSchema = z.enum(['utf8', 'ascii', 'base64', 'binary', 'hex'])
  .default('utf8');

// File operation validation
export const fileReadSchema = z.object({
  path: filePathSchema,
  encoding: encodingSchema.optional(),
  maxSize: z.number().positive().max(100 * 1024 * 1024).optional() // 100MB max
});

export const fileWriteSchema = z.object({
  path: filePathSchema,
  content: contentSchema,
  encoding: encodingSchema.optional(),
  overwrite: z.boolean().default(false)
});

export const fileCopySchema = z.object({
  source: filePathSchema,
  destination: filePathSchema,
  overwrite: z.boolean().default(false)
});

export const fileMoveSchema = z.object({
  source: filePathSchema,
  destination: filePathSchema,
  overwrite: z.boolean().default(false)
});

export const fileDeleteSchema = z.object({
  path: filePathSchema,
  recursive: z.boolean().default(false)
});

export const directoryCreateSchema = z.object({
  path: directoryPathSchema,
  recursive: z.boolean().default(true)
});

export const directoryListSchema = z.object({
  path: directoryPathSchema,
  recursive: z.boolean().default(false),
  includeHidden: z.boolean().default(false),
  maxDepth: z.number().positive().max(10).default(3)
});

// Search validation
export const searchSchema = z.object({
  pattern: searchPatternSchema,
  directory: directoryPathSchema,
  recursive: z.boolean().default(true),
  includeHidden: z.boolean().default(false),
  fileTypes: z.array(z.string()).optional(),
  maxResults: z.number().positive().max(1000).default(100),
  caseSensitive: z.boolean().default(false)
});

// System command validation
export const commandSchema = z.object({
  command: z.string().min(1).max(1000),
  args: z.array(z.string()).max(50).default([]),
  cwd: directoryPathSchema.optional(),
  timeout: z.number().positive().max(300000).default(30000), // 30 seconds default, 5 minutes max
  shell: z.boolean().default(false)
});

// Process validation
export const processSchema = z.object({
  pid: z.number().positive(),
  signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGUSR1', 'SIGUSR2']).default('SIGTERM')
});

// Git validation
export const gitSchema = z.object({
  repository: directoryPathSchema,
  command: z.enum(['status', 'log', 'diff', 'branch', 'remote']),
  args: z.array(z.string()).max(10).default([])
});

// Network validation
export const networkSchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().min(1).max(65535),
  timeout: z.number().positive().max(30000).default(5000)
});

// Validation helper functions
export const validatePath = (inputPath: string): string => {
  const normalizedPath = path.normalize(inputPath);
  
  // Prevent path traversal
  if (normalizedPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  
  // Ensure path is within allowed boundaries (you can customize this)
  const allowedRoots = [
    process.cwd(),
    process.env.HOME || '/home',
    '/tmp',
    '/var/tmp'
  ];
  
  const absolutePath = path.resolve(normalizedPath);
  const isAllowed = allowedRoots.some(root => 
    absolutePath.startsWith(path.resolve(root))
  );
  
  if (!isAllowed) {
    throw new Error('Path not within allowed directories');
  }
  
  return absolutePath;
};

export const validateFileExists = async (filePath: string): Promise<void> => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File does not exist: ${filePath}`);
  }
};

export const validateDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }
  } catch {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }
};

export const validateFileSize = async (filePath: string, maxSize: number): Promise<void> => {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize})`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('File too large')) {
      throw error;
    }
    throw new Error(`Cannot check file size: ${filePath}`);
  }
};

export const sanitizeFilename = (filename: string): string => {
  // Remove or replace dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\./g, '_')
    .trim()
    .substring(0, 255); // Limit filename length
};

export const isTextFile = (filePath: string): boolean => {
  const textExtensions = [
    '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
    '.html', '.css', '.scss', '.sass', '.less',
    '.xml', '.yaml', '.yml', '.toml', '.ini',
    '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h',
    '.go', '.rs', '.swift', '.kt', '.scala',
    '.sh', '.bash', '.zsh', '.fish',
    '.sql', '.graphql', '.proto',
    '.log', '.conf', '.config'
  ];
  
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.includes(ext);
};

export const validateMimeType = (mimeType: string): boolean => {
  const allowedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'application/yaml',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml'
  ];
  
  return allowedMimeTypes.includes(mimeType);
};
