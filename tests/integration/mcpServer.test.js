/**
 * Integration tests for MCP Server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

describe('MCP Server Integration', () => {
  let serverProcess;
  let testDir;

  beforeAll(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'test-integration');
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  afterEach(() => {
    // Kill server process if running
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  describe('Server Startup', () => {
    it('should start server successfully', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: { ...process.env, LOG_LEVEL: 'error' }
      });

      let output = '';
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Augment MCP Server started successfully')) {
          done();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      serverProcess.on('error', (error) => {
        done(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!serverProcess.killed) {
          done(new Error('Server startup timeout'));
        }
      }, 10000);
    });

    it('should show help when requested', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      const helpProcess = spawn('node', [serverPath, '--help'], {
        stdio: 'pipe'
      });

      let output = '';
      helpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      helpProcess.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Augment MCP Server');
        expect(output).toContain('Usage:');
        expect(output).toContain('Options:');
        done();
      });

      helpProcess.on('error', (error) => {
        done(error);
      });
    });

    it('should show version when requested', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      const versionProcess = spawn('node', [serverPath, '--version'], {
        stdio: 'pipe'
      });

      let output = '';
      versionProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      versionProcess.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('augment-mcp-server');
        expect(output).toContain('v1.0.0');
        done();
      });

      versionProcess.on('error', (error) => {
        done(error);
      });
    });

    it('should show config when requested', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      const configProcess = spawn('node', [serverPath, '--config'], {
        stdio: 'pipe'
      });

      let output = '';
      configProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      configProcess.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Current Configuration:');
        expect(output).toContain('server');
        expect(output).toContain('security');
        expect(output).toContain('performance');
        expect(output).toContain('features');
        done();
      });

      configProcess.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Server Shutdown', () => {
    it('should handle SIGTERM gracefully', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: { ...process.env, LOG_LEVEL: 'error' }
      });

      let startupComplete = false;
      let output = '';

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Augment MCP Server started successfully') && !startupComplete) {
          startupComplete = true;
          // Send SIGTERM after server starts
          setTimeout(() => {
            serverProcess.kill('SIGTERM');
          }, 100);
        }
      });

      serverProcess.on('close', (code, signal) => {
        expect(signal).toBe('SIGTERM');
        done();
      });

      serverProcess.on('error', (error) => {
        done(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!serverProcess.killed) {
          done(new Error('Server shutdown timeout'));
        }
      }, 15000);
    });

    it('should handle SIGINT gracefully', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: { ...process.env, LOG_LEVEL: 'error' }
      });

      let startupComplete = false;
      let output = '';

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Augment MCP Server started successfully') && !startupComplete) {
          startupComplete = true;
          // Send SIGINT after server starts
          setTimeout(() => {
            serverProcess.kill('SIGINT');
          }, 100);
        }
      });

      serverProcess.on('close', (code, signal) => {
        expect(signal).toBe('SIGINT');
        done();
      });

      serverProcess.on('error', (error) => {
        done(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!serverProcess.killed) {
          done(new Error('Server shutdown timeout'));
        }
      }, 15000);
    });
  });

  describe('Environment Validation', () => {
    it('should validate Node.js version', (done) => {
      const serverPath = path.join(process.cwd(), 'build/server/index.js');
      
      // Test with current Node.js version (should work)
      const testProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: { ...process.env, LOG_LEVEL: 'debug' }
      });

      let output = '';
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        // Should not fail due to Node.js version
        expect(output).not.toContain('Node.js version');
        expect(output).not.toContain('not supported');
        testProcess.kill('SIGTERM');
        done();
      });

      // Kill after a short time since we just want to test validation
      setTimeout(() => {
        testProcess.kill('SIGTERM');
      }, 2000);
    });
  });
});
