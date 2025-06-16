/**
 * File operation interfaces
 */

/**
 * File information interface
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  lastModified: Date;
  permissions: string;
  extension?: string;
}

/**
 * File operation interface
 */
export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'copy' | 'move' | 'mkdir';
  source: string;
  destination?: string;
  content?: string;
  options?: {
    recursive?: boolean;
    overwrite?: boolean;
    encoding?: string;
  };
}

/**
 * Search options interface
 */
export interface SearchOptions {
  pattern: string;
  directory: string;
  recursive?: boolean;
  includeHidden?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

/**
 * Search result interface
 */
export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}
