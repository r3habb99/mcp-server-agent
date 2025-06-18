/**
 * Tests for SystemService
 */

const { SystemService } = require('../../build/services/systemService.js');

describe('SystemService', () => {
  let systemService;

  beforeEach(() => {
    systemService = new SystemService();
  });

  afterEach(() => {
    // Clean up any running processes
    systemService.cleanup();
  });

  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      const result = await systemService.getSystemInfo();
      
      expect(result).toBeDefined();
      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
      expect(result.nodeVersion).toBeDefined();
      expect(result.totalMemory).toBeGreaterThan(0);
      expect(result.freeMemory).toBeGreaterThan(0);
      expect(result.uptime).toBeGreaterThan(0);
      expect(Array.isArray(result.loadAverage)).toBe(true);
      expect(result.cpuCount).toBeGreaterThan(0);
      expect(result.hostname).toBeDefined();
    });
  });

  describe('getCpuInfo', () => {
    it('should return CPU information', async () => {
      const result = await systemService.getCpuInfo();
      
      expect(result).toBeDefined();
      expect(result.manufacturer).toBeDefined();
      expect(result.brand).toBeDefined();
      expect(typeof result.speed).toBe('number');
      expect(typeof result.cores).toBe('number');
      expect(typeof result.currentLoad).toBe('number');
    });
  });

  describe('getMemoryInfo', () => {
    it('should return memory information', async () => {
      const result = await systemService.getMemoryInfo();
      
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.free).toBeGreaterThan(0);
      expect(result.used).toBeGreaterThan(0);
    });
  });

  describe('getNetworkInfo', () => {
    it('should return network information', async () => {
      const result = await systemService.getNetworkInfo();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.interfaces)).toBe(true);
      expect(Array.isArray(result.connections)).toBe(true);
      
      if (result.interfaces.length > 0) {
        const iface = result.interfaces[0];
        expect(iface.name).toBeDefined();
        expect(iface.address).toBeDefined();
        expect(typeof iface.internal).toBe('boolean');
      }
    });
  });

  describe('getProcesses', () => {
    it('should return process list', async () => {
      const result = await systemService.getProcesses();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      const process = result[0];
      expect(process.pid).toBeDefined();
      expect(process.name).toBeDefined();
      expect(typeof process.cpu).toBe('number');
      expect(typeof process.memory).toBe('number');
    });
  });

  describe('executeCommand', () => {
    it('should execute simple commands', async () => {
      const result = await systemService.executeCommand('echo', ['hello']);
      
      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
      expect(result.stderr).toBe('');
    });

    it('should handle command failures', async () => {
      const result = await systemService.executeCommand('nonexistentcommand');
      
      expect(result).toBeDefined();
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeDefined();
    });

    it('should prevent dangerous commands', async () => {
      const result = await systemService.executeCommand('rm', ['-rf', '/']);
      
      expect(result).toBeDefined();
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Dangerous command not allowed');
    });
  });

  describe('getHealthCheck', () => {
    it('should return health status', async () => {
      const result = await systemService.getHealthCheck();
      
      expect(result).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
      expect(result.checks).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      
      // Check that we have some basic health checks
      expect(result.checks.memory).toBeDefined();
      expect(result.checks.cpu).toBeDefined();
    });
  });

  describe('getEnvironmentVariables', () => {
    it('should return filtered environment variables', () => {
      const result = systemService.getEnvironmentVariables();
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Should include safe variables
      expect(result.NODE_ENV).toBeDefined();
      
      // Should not include sensitive variables
      expect(result.PASSWORD).toBeUndefined();
      expect(result.SECRET).toBeUndefined();
    });
  });
});
