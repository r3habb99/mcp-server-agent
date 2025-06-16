/**
 * Code analysis interfaces
 */

/**
 * Code analysis result interface
 */
export interface CodeAnalysisResult {
  language: string;
  linesOfCode: number;
  complexity: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    line?: number;
    column?: number;
  }>;
  suggestions: string[];
}
