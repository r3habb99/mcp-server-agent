/**
 * System information interfaces
 */

/**
 * System information interface
 */
export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  loadAverage: number[];
  cpuCount: number;
  hostname: string;
}

/**
 * Process information interface
 */
export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
}

/**
 * Network information interface
 */
export interface NetworkInfo {
  interfaces: Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }>;
  connections: Array<{
    protocol: string;
    localAddress: string;
    localPort: number;
    remoteAddress?: string;
    remotePort?: number;
    state: string;
  }>;
}
