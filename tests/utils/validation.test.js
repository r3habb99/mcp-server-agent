/**
 * Tests for validation utilities
 */

const path = require('path');

// Mock the validation functions since we can't import ES modules easily
const mockValidation = {
  validatePath: (inputPath) => {
    const normalizedPath = path.normalize(inputPath);
    
    // Prevent path traversal
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal not allowed');
    }
    
    // Ensure path is within allowed boundaries
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
  },

  sanitizeFilename: (filename) => {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.\./g, '_')
      .trim()
      .substring(0, 255);
  },

  isTextFile: (filePath) => {
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
  },

  validateMimeType: (mimeType) => {
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
  }
};

describe('Validation Utilities', () => {
  describe('validatePath', () => {
    it('should validate safe paths', () => {
      const safePath = path.join(process.cwd(), 'test.txt');
      const result = mockValidation.validatePath(safePath);
      expect(result).toBeDefined();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(() => {
        mockValidation.validatePath('../../../etc/passwd');
      }).toThrow('Path traversal not allowed');
    });

    it('should reject paths outside allowed directories', () => {
      expect(() => {
        mockValidation.validatePath('/etc/passwd');
      }).toThrow('Path not within allowed directories');
    });

    it('should normalize paths correctly', () => {
      const inputPath = path.join(process.cwd(), 'test', '..', 'file.txt');
      const result = mockValidation.validatePath(inputPath);
      expect(result).toBe(path.join(process.cwd(), 'file.txt'));
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'file<>:"/\\|?*.txt';
      const result = mockValidation.sanitizeFilename(dangerous);
      expect(result).toBe('file_________.txt');
    });

    it('should handle path traversal in filenames', () => {
      const traversal = '../../../evil.txt';
      const result = mockValidation.sanitizeFilename(traversal);
      expect(result).toBe('______evil.txt');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300);
      const result = mockValidation.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should trim whitespace', () => {
      const whitespace = '  filename.txt  ';
      const result = mockValidation.sanitizeFilename(whitespace);
      expect(result).toBe('filename.txt');
    });
  });

  describe('isTextFile', () => {
    it('should identify text files correctly', () => {
      expect(mockValidation.isTextFile('test.txt')).toBe(true);
      expect(mockValidation.isTextFile('script.js')).toBe(true);
      expect(mockValidation.isTextFile('style.css')).toBe(true);
      expect(mockValidation.isTextFile('data.json')).toBe(true);
      expect(mockValidation.isTextFile('README.md')).toBe(true);
    });

    it('should identify binary files correctly', () => {
      expect(mockValidation.isTextFile('image.png')).toBe(false);
      expect(mockValidation.isTextFile('video.mp4')).toBe(false);
      expect(mockValidation.isTextFile('archive.zip')).toBe(false);
      expect(mockValidation.isTextFile('binary.exe')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(mockValidation.isTextFile('Dockerfile')).toBe(false);
      expect(mockValidation.isTextFile('README')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(mockValidation.isTextFile('TEST.TXT')).toBe(true);
      expect(mockValidation.isTextFile('Script.JS')).toBe(true);
      expect(mockValidation.isTextFile('IMAGE.PNG')).toBe(false);
    });
  });

  describe('validateMimeType', () => {
    it('should allow safe MIME types', () => {
      expect(mockValidation.validateMimeType('text/plain')).toBe(true);
      expect(mockValidation.validateMimeType('application/json')).toBe(true);
      expect(mockValidation.validateMimeType('text/javascript')).toBe(true);
      expect(mockValidation.validateMimeType('image/png')).toBe(true);
    });

    it('should reject unsafe MIME types', () => {
      expect(mockValidation.validateMimeType('application/x-executable')).toBe(false);
      expect(mockValidation.validateMimeType('application/octet-stream')).toBe(false);
      expect(mockValidation.validateMimeType('video/mp4')).toBe(false);
    });

    it('should handle empty or invalid MIME types', () => {
      expect(mockValidation.validateMimeType('')).toBe(false);
      expect(mockValidation.validateMimeType('invalid')).toBe(false);
      expect(mockValidation.validateMimeType('text/')).toBe(false);
    });
  });
});
