/**
 * System information and process management service
 */

import os from 'os';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import type { SystemInfo, ProcessInfo, NetworkInfo, HealthCheck } from '../interfaces/index.js';
import { logInfo, logError, logDebug, logWarn } from '../utils/logger.js';
import { securityConfig } from '../server/config.js';

const execAsync = promisify(exec);

export class SystemService {
  private readonly commandTimeout: number;
  private readonly runningProcesses: Map<number, ChildProcess> = new Map();

  constructor() {
    this.commandTimeout = securityConfig.commandTimeout;
  }

  /**
   * Get basic system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      logDebug('Retrieving system information');

      // We don't need the detailed info for basic system info
      // const [cpu, memory, osInfo] = await Promise.all([
      //   si.cpu(),
      //   si.mem(),
      //   si.osInfo(),
      // ]);

      const systemInfo: SystemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        hostname: os.hostname(),
      };

      logInfo('System information retrieved successfully');
      return systemInfo;
    } catch (error) {
      logError('Failed to get system information', error as Error);
      throw error;
    }
  }

  /**
   * Get detailed CPU information
   */
  async getCpuInfo(): Promise<any> {
    try {
      const [cpu, currentLoad] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
      ]);

      return {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors,
        currentLoad: currentLoad.currentLoad,
        currentLoadUser: currentLoad.currentLoadUser,
        currentLoadSystem: currentLoad.currentLoadSystem,
        currentLoadIdle: currentLoad.currentLoadIdle,
      };
    } catch (error) {
      logError('Failed to get CPU information', error as Error);
      throw error;
    }
  }

  /**
   * Get memory information
   */
  async getMemoryInfo(): Promise<any> {
    try {
      const memory = await si.mem();
      
      return {
        total: memory.total,
        free: memory.free,
        used: memory.used,
        active: memory.active,
        available: memory.available,
        buffers: memory.buffers,
        cached: memory.cached,
        slab: memory.slab,
        buffcache: memory.buffcache,
        swaptotal: memory.swaptotal,
        swapused: memory.swapused,
        swapfree: memory.swapfree,
      };
    } catch (error) {
      logError('Failed to get memory information', error as Error);
      throw error;
    }
  }

  /**
   * Get disk information
   */
  async getDiskInfo(): Promise<any> {
    try {
      const [disks, diskLayout, fsSize] = await Promise.all([
        si.diskLayout(),
        si.blockDevices(),
        si.fsSize(),
      ]);

      return {
        layout: disks,
        blockDevices: diskLayout,
        filesystems: fsSize,
      };
    } catch (error) {
      logError('Failed to get disk information', error as Error);
      throw error;
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [interfaces, connections] = await Promise.all([
        si.networkInterfaces(),
        si.networkConnections(),
      ]);

      const networkInfo: NetworkInfo = {
        interfaces: interfaces.map(iface => ({
          name: iface.iface,
          address: iface.ip4 || iface.ip6 || '',
          netmask: iface.ip4subnet || '',
          family: iface.ip4 ? 'IPv4' : 'IPv6',
          mac: iface.mac,
          internal: iface.internal,
        })),
        connections: connections.map(conn => ({
          protocol: conn.protocol || 'unknown',
          localAddress: conn.localAddress || '',
          localPort: parseInt(String(conn.localPort)) || 0,
          remoteAddress: (conn as any).remoteAddress || undefined,
          remotePort: parseInt(String((conn as any).remotePort)) || undefined,
          state: conn.state || 'unknown',
        })),
      };

      logInfo('Network information retrieved successfully');
      return networkInfo;
    } catch (error) {
      logError('Failed to get network information', error as Error);
      throw error;
    }
  }

  /**
   * Get running processes
   */
  async getProcesses(): Promise<ProcessInfo[]> {
    try {
      logDebug('Retrieving process list');

      const processes = await si.processes();
      
      const processInfos: ProcessInfo[] = processes.list.map(proc => ({
        pid: proc.pid,
        name: proc.name,
        cpu: proc.cpu,
        memory: proc.mem,
        command: proc.command,
      }));

      logInfo('Process list retrieved successfully', { count: processInfos.length });
      return processInfos;
    } catch (error) {
      logError('Failed to get process list', error as Error);
      throw error;
    }
  }

  /**
   * Execute a system command
   */
  async executeCommand(command: string, args: string[] = [], options: {
    cwd?: string;
    timeout?: number;
    shell?: boolean;
  } = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { cwd = process.cwd(), timeout = this.commandTimeout, shell = false } = options;
      
      logDebug('Executing command', { command, args, cwd, timeout });

      // Security check: prevent dangerous commands
      const dangerousCommands = ['rm', 'del', 'format', 'fdisk', 'mkfs', 'dd'];
      if (dangerousCommands.some(cmd => command.toLowerCase().includes(cmd))) {
        throw new Error(`Dangerous command not allowed: ${command}`);
      }

      const fullCommand = shell ? command : `${command} ${args.join(' ')}`;
      
      const execOptions: any = {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer
      };

      if (shell) {
        execOptions.shell = true;
      }

      const { stdout, stderr } = await execAsync(fullCommand, execOptions);

      logInfo('Command executed successfully', { command, exitCode: 0 });
      
      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
      };
    } catch (error: any) {
      const exitCode = error.code || 1;
      const stderr = error.stderr?.toString() || error.message;
      const stdout = error.stdout?.toString() || '';

      logWarn('Command execution failed', { command, exitCode, stderr });
      
      return {
        stdout,
        stderr,
        exitCode,
      };
    }
  }

  /**
   * Start a long-running process
   */
  async startProcess(command: string, args: string[] = [], options: {
    cwd?: string;
    shell?: boolean;
  } = {}): Promise<{ pid: number; success: boolean }> {
    try {
      const { cwd = process.cwd(), shell = false } = options;
      
      logDebug('Starting process', { command, args, cwd });

      const child = spawn(command, args, {
        cwd,
        shell,
        detached: true,
        stdio: 'ignore',
      });

      child.unref();
      
      if (child.pid) {
        this.runningProcesses.set(child.pid, child);
        
        child.on('exit', (code) => {
          logInfo('Process exited', { pid: child.pid, exitCode: code });
          if (child.pid) {
            this.runningProcesses.delete(child.pid);
          }
        });

        logInfo('Process started successfully', { pid: child.pid, command });
        
        return {
          pid: child.pid,
          success: true,
        };
      } else {
        throw new Error('Failed to start process - no PID assigned');
      }
    } catch (error) {
      logError('Failed to start process', error as Error, { command, args });
      return {
        pid: -1,
        success: false,
      };
    }
  }

  /**
   * Kill a process
   */
  async killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    try {
      logDebug('Killing process', { pid, signal });

      // Check if it's one of our managed processes
      const managedProcess = this.runningProcesses.get(pid);
      if (managedProcess) {
        managedProcess.kill(signal);
        this.runningProcesses.delete(pid);
        logInfo('Managed process killed', { pid, signal });
        return true;
      }

      // Try to kill external process
      process.kill(pid, signal);
      logInfo('Process killed', { pid, signal });
      return true;
    } catch (error) {
      logError('Failed to kill process', error as Error, { pid, signal });
      return false;
    }
  }

  /**
   * Get system health check
   */
  async getHealthCheck(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const checks: HealthCheck['checks'] = {};

      // Memory check
      const memInfo = await this.getMemoryInfo();
      const memoryUsage = (memInfo.used / memInfo.total) * 100;
      checks.memory = {
        status: memoryUsage < 90 ? 'pass' : 'fail',
        message: `Memory usage: ${memoryUsage.toFixed(1)}%`,
      };

      // CPU check
      const cpuInfo = await this.getCpuInfo();
      checks.cpu = {
        status: cpuInfo.currentLoad < 90 ? 'pass' : 'fail',
        message: `CPU load: ${cpuInfo.currentLoad.toFixed(1)}%`,
      };

      // Disk check
      const diskInfo = await this.getDiskInfo();
      const rootFs = diskInfo.filesystems.find((fs: any) => fs.mount === '/');
      if (rootFs) {
        const diskUsage = (rootFs.used / rootFs.size) * 100;
        checks.disk = {
          status: diskUsage < 90 ? 'pass' : 'fail',
          message: `Disk usage: ${diskUsage.toFixed(1)}%`,
        };
      }

      // Overall status
      const allPassed = Object.values(checks).every(check => check.status === 'pass');
      const status = allPassed ? 'healthy' : 'degraded';

      const healthCheck: HealthCheck = {
        status,
        checks,
        timestamp: new Date(),
      };

      const duration = Date.now() - startTime;
      logInfo('Health check completed', { status, duration, checksCount: Object.keys(checks).length });

      return healthCheck;
    } catch (error) {
      logError('Health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        checks: {
          error: {
            status: 'fail',
            message: 'Health check failed to execute',
          },
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get environment variables (filtered for security)
   */
  getEnvironmentVariables(): Record<string, string> {
    const env = process.env;
    const filtered: Record<string, string> = {};

    // Only include safe environment variables
    const safeKeys = [
      'NODE_ENV',
      'NODE_VERSION',
      'PATH',
      'HOME',
      'USER',
      'SHELL',
      'TERM',
      'LANG',
      'TZ',
      'PWD',
    ];

    for (const key of safeKeys) {
      if (env[key]) {
        filtered[key] = env[key]!;
      }
    }

    return filtered;
  }

  /**
   * Cleanup managed processes
   */
  cleanup(): void {
    logInfo('Cleaning up managed processes', { count: this.runningProcesses.size });
    
    for (const [pid, process] of this.runningProcesses) {
      try {
        process.kill('SIGTERM');
        logDebug('Terminated managed process', { pid });
      } catch (error) {
        logWarn('Failed to terminate managed process', { pid, error });
      }
    }
    
    this.runningProcesses.clear();
  }
}
