/**
 * Git integration interfaces
 */

/**
 * Git repository information interface
 */
export interface GitInfo {
  isRepository: boolean;
  branch?: string;
  commit?: string;
  status?: {
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  };
}
