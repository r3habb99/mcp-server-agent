/**
 * Tests for FileService
 */

import fs from 'fs-extra';
import path from 'path';
import { FileService } from '../../src/services/fileService.js';

describe('FileService', () => {
  let fileService: FileService;
  let testDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    testDir = path.join(process.cwd(), 'test-temp');
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const testFile = path.join(testDir, 'test.txt');
      const testContent = 'Hello, World!';
      await fs.writeFile(testFile, testContent);

      const result = await fileService.readFile(testFile);
      expect(result).toBe(testContent);
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.txt');
      
      await expect(fileService.readFile(nonExistentFile)).rejects.toThrow();
    });

    it('should handle different encodings', async () => {
      const testFile = path.join(testDir, 'test-binary.txt');
      const testContent = 'Hello, World!';
      await fs.writeFile(testFile, testContent);

      const result = await fileService.readFile(testFile, 'base64');
      expect(result).toBe(Buffer.from(testContent).toString('base64'));
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      const testFile = path.join(testDir, 'write-test.txt');
      const testContent = 'Test content';

      await fileService.writeFile(testFile, testContent);
      
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(testContent);
    });

    it('should create directory if it does not exist', async () => {
      const subDir = path.join(testDir, 'subdir');
      const testFile = path.join(subDir, 'test.txt');
      const testContent = 'Test content';

      await fileService.writeFile(testFile, testContent);
      
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(testContent);
    });

    it('should respect overwrite flag', async () => {
      const testFile = path.join(testDir, 'overwrite-test.txt');
      const originalContent = 'Original content';
      const newContent = 'New content';

      await fs.writeFile(testFile, originalContent);
      
      // Should throw error when overwrite is false
      await expect(
        fileService.writeFile(testFile, newContent, { overwrite: false })
      ).rejects.toThrow();

      // Should succeed when overwrite is true
      await fileService.writeFile(testFile, newContent, { overwrite: true });
      
      const result = await fs.readFile(testFile, 'utf8');
      expect(result).toBe(newContent);
    });
  });

  describe('copyPath', () => {
    it('should copy file successfully', async () => {
      const sourceFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      const testContent = 'Test content';

      await fs.writeFile(sourceFile, testContent);
      await fileService.copyPath(sourceFile, destFile);

      const result = await fs.readFile(destFile, 'utf8');
      expect(result).toBe(testContent);
    });

    it('should copy directory recursively', async () => {
      const sourceDir = path.join(testDir, 'source-dir');
      const destDir = path.join(testDir, 'dest-dir');
      const testFile = path.join(sourceDir, 'test.txt');
      const testContent = 'Test content';

      await fs.ensureDir(sourceDir);
      await fs.writeFile(testFile, testContent);
      
      await fileService.copyPath(sourceDir, destDir);

      const copiedFile = path.join(destDir, 'test.txt');
      const result = await fs.readFile(copiedFile, 'utf8');
      expect(result).toBe(testContent);
    });
  });

  describe('deletePath', () => {
    it('should delete file successfully', async () => {
      const testFile = path.join(testDir, 'delete-test.txt');
      await fs.writeFile(testFile, 'test content');

      await fileService.deletePath(testFile);
      
      const exists = await fs.pathExists(testFile);
      expect(exists).toBe(false);
    });

    it('should delete directory recursively', async () => {
      const testSubDir = path.join(testDir, 'delete-dir');
      const testFile = path.join(testSubDir, 'test.txt');
      
      await fs.ensureDir(testSubDir);
      await fs.writeFile(testFile, 'test content');

      await fileService.deletePath(testSubDir, true);
      
      const exists = await fs.pathExists(testSubDir);
      expect(exists).toBe(false);
    });
  });

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      const subDir = path.join(testDir, 'subdir');

      await fs.writeFile(file1, 'content1');
      await fs.writeFile(file2, 'content2');
      await fs.ensureDir(subDir);

      const result = await fileService.listDirectory(testDir);
      
      expect(result).toHaveLength(3);
      expect(result.map(f => f.name).sort()).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });

    it('should list recursively when requested', async () => {
      const subDir = path.join(testDir, 'subdir');
      const subFile = path.join(subDir, 'subfile.txt');

      await fs.ensureDir(subDir);
      await fs.writeFile(subFile, 'subcontent');

      const result = await fileService.listDirectory(testDir, { recursive: true });
      
      const fileNames = result.map(f => f.name);
      expect(fileNames).toContain('subdir');
      expect(fileNames).toContain('subfile.txt');
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const testFile = path.join(testDir, 'info-test.txt');
      const testContent = 'Test content for info';
      await fs.writeFile(testFile, testContent);

      const result = await fileService.getFileInfo(testFile);
      
      expect(result.name).toBe('info-test.txt');
      expect(result.isFile).toBe(true);
      expect(result.isDirectory).toBe(false);
      expect(result.size).toBe(testContent.length);
      expect(result.extension).toBe('.txt');
    });
  });

  describe('search', () => {
    it('should search for content in files', async () => {
      const file1 = path.join(testDir, 'search1.txt');
      const file2 = path.join(testDir, 'search2.txt');
      
      await fs.writeFile(file1, 'This contains the search term');
      await fs.writeFile(file2, 'This does not contain the term');

      const results = await fileService.search({
        pattern: 'search term',
        directory: testDir,
        recursive: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(file1);
      expect(results[0].match).toBe('search term');
    });

    it('should filter by file types', async () => {
      const txtFile = path.join(testDir, 'test.txt');
      const jsFile = path.join(testDir, 'test.js');
      
      await fs.writeFile(txtFile, 'search content');
      await fs.writeFile(jsFile, 'search content');

      const results = await fileService.search({
        pattern: 'search',
        directory: testDir,
        fileTypes: ['.txt'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].file).toBe(txtFile);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing path', async () => {
      const testFile = path.join(testDir, 'exists-test.txt');
      await fs.writeFile(testFile, 'content');

      const result = await fileService.pathExists(testFile);
      expect(result).toBe(true);
    });

    it('should return false for non-existing path', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.txt');

      const result = await fileService.pathExists(nonExistentFile);
      expect(result).toBe(false);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types', () => {
      expect(fileService.getMimeType('test.txt')).toBe('text/plain');
      expect(fileService.getMimeType('test.json')).toBe('application/json');
      expect(fileService.getMimeType('test.js')).toBe('text/javascript');
      expect(fileService.getMimeType('test.png')).toBe('image/png');
      expect(fileService.getMimeType('test.unknown')).toBe('application/octet-stream');
    });
  });
});
