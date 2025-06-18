/**
 * Tests for AugmentService
 */

const { AugmentService } = require('../../build/services/augmentService.js');

describe('AugmentService', () => {
  let augmentService;

  beforeEach(() => {
    augmentService = new AugmentService();
  });

  describe('isAvailable', () => {
    it('should return false when Augment is disabled', () => {
      const result = augmentService.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('analyzeCode', () => {
    const sampleCode = `
function calculateSum(a, b) {
  console.log('Calculating sum');
  var result = a + b;
  return result;
}
`;

    it('should analyze JavaScript code', async () => {
      // Mock the service as available for testing
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.analyzeCode(sampleCode, 'javascript');
      
      expect(result).toBeDefined();
      expect(result.language).toBe('javascript');
      expect(result.linesOfCode).toBeGreaterThan(0);
      expect(result.complexity).toBeGreaterThan(0);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should find issues in problematic code', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.analyzeCode(sampleCode, 'javascript');
      
      // Should find console.log and var usage issues
      const consoleIssue = result.issues.find(issue => 
        issue.message.includes('console.log')
      );
      const varIssue = result.issues.find(issue => 
        issue.message.includes('var')
      );
      
      expect(consoleIssue).toBeDefined();
      expect(varIssue).toBeDefined();
    });

    it('should throw error when service is not available', async () => {
      await expect(augmentService.analyzeCode(sampleCode, 'javascript'))
        .rejects.toThrow('Augment AI is not available or configured');
    });
  });

  describe('generateDocumentation', () => {
    const sampleCode = `
function greet(name) {
  return 'Hello, ' + name + '!';
}
`;

    it('should generate documentation', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.generateDocumentation(sampleCode, 'javascript');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Code Documentation');
    });

    it('should throw error when service is not available', async () => {
      await expect(augmentService.generateDocumentation(sampleCode, 'javascript'))
        .rejects.toThrow('Augment AI is not available or configured');
    });
  });

  describe('reviewCode', () => {
    const goodCode = `
const calculateArea = (radius) => {
  if (radius <= 0) {
    throw new Error('Radius must be positive');
  }
  return Math.PI * radius * radius;
};
`;

    const badCode = `
function calc(r) {
  console.log(r);
  var area = 3.14 * r * r;
  return area;
}
`;

    it('should review code and provide score', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.reviewCode(goodCode, 'javascript');
      
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(typeof result.feedback).toBe('string');
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    it('should give lower score to problematic code', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const goodResult = await augmentService.reviewCode(goodCode, 'javascript');
      const badResult = await augmentService.reviewCode(badCode, 'javascript');
      
      expect(goodResult.score).toBeGreaterThan(badResult.score);
    });

    it('should throw error when service is not available', async () => {
      await expect(augmentService.reviewCode(goodCode, 'javascript'))
        .rejects.toThrow('Augment AI is not available or configured');
    });
  });

  describe('explainCode', () => {
    const sampleCode = `
const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};
`;

    it('should explain code', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.explainCode(sampleCode, 'javascript');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('javascript');
    });

    it('should throw error when service is not available', async () => {
      await expect(augmentService.explainCode(sampleCode, 'javascript'))
        .rejects.toThrow('Augment AI is not available or configured');
    });
  });

  describe('generateTests', () => {
    const sampleCode = `
function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}
`;

    it('should generate tests', async () => {
      augmentService.config = { enabled: true, apiEndpoint: 'http://test' };
      
      const result = await augmentService.generateTests(sampleCode, 'javascript');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('test');
    });

    it('should throw error when service is not available', async () => {
      await expect(augmentService.generateTests(sampleCode, 'javascript'))
        .rejects.toThrow('Augment AI is not available or configured');
    });
  });
});
