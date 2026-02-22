import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface LanComputer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
}

const DATA_DIR = path.join(app.getPath('userData'), 'lan-computers');
const COMPUTERS_FILE = path.join(DATA_DIR, 'computers.yaml');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Simple YAML-like parser (key-value format)
function parseSimpleYaml(content: string): LanComputer[] {
  const computers: LanComputer[] = [];
  const lines = content.split('\n');
  let current: Partial<LanComputer> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ')) {
      if (current.id) {
        computers.push(current as LanComputer);
      }
      current = {};
    } else if (trimmed.includes(':')) {
      const [key, value] = trimmed.split(':').map(s => s.trim());
      if (key && value) {
        (current as Record<string, string>)[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }

  if (current.id) {
    computers.push(current as LanComputer);
  }

  return computers;
}

function toSimpleYaml(computers: LanComputer[]): string {
  let yaml = '# MyCluster LAN Computers\n# Auto-generated - do not edit manually\n\n';
  
  for (const computer of computers) {
    yaml += `- id: ${computer.id}\n`;
    yaml += `  ipAddress: ${computer.ipAddress}\n`;
    yaml += `  computerName: ${computer.computerName}\n`;
    yaml += `  isOnline: ${computer.isOnline}\n`;
    yaml += `  lastSeen: ${computer.lastSeen}\n`;
    yaml += `  addedDate: ${computer.addedDate}\n`;
    yaml += '\n';
  }

  return yaml;
}

export function loadComputers(): LanComputer[] {
  ensureDataDir();
  
  if (!fs.existsSync(COMPUTERS_FILE)) {
    return [];
  }

  const content = fs.readFileSync(COMPUTERS_FILE, 'utf-8');
  return parseSimpleYaml(content);
}

export function saveComputers(computers: LanComputer[]): void {
  ensureDataDir();
  const yaml = toSimpleYaml(computers);
  fs.writeFileSync(COMPUTERS_FILE, yaml, 'utf-8');
}

export function addComputer(computer: Omit<LanComputer, 'id' | 'addedDate'>): LanComputer {
  const computers = loadComputers();
  
  const newComputer: LanComputer = {
    ...computer,
    id: `computer_${Date.now()}`,
    addedDate: new Date().toISOString(),
  };

  computers.push(newComputer);
  saveComputers(computers);
  
  return newComputer;
}

export function removeComputer(id: string): void {
  const computers = loadComputers();
  const filtered = computers.filter(c => c.id !== id);
  saveComputers(filtered);
}

export function updateComputer(id: string, updates: Partial<LanComputer>): void {
  const computers = loadComputers();
  const index = computers.findIndex(c => c.id === id);
  
  if (index !== -1) {
    computers[index] = { ...computers[index], ...updates };
    saveComputers(computers);
  }
}

// Ping an IP address
export function ping(ip: string, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const args = isWin 
      ? ['-n', '1', '-w', timeout.toString(), ip]
      : ['-c', '1', '-W', '1', ip];
    
    const ping = spawn('ping', args);
    let responded = false;
    const timer = setTimeout(() => {
      ping.kill();
      resolve(false);
    }, timeout + 500);

    ping.stdout.on('data', (data: Buffer) => {
      const output = data.toString().toLowerCase();
      if (output.includes('reply') || output.includes('ttl=')) {
        responded = true;
      }
    });

    ping.on('close', () => {
      clearTimeout(timer);
      resolve(responded);
    });

    ping.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

// Scan a range of IPs
export async function scanIpRange(
  baseIp: string,
  start: number,
  end: number,
  onProgress?: (result: { ip: string; isOnline: boolean }) => void
): Promise<{ ip: string; isOnline: boolean }[]> {
  const results: { ip: string; isOnline: boolean }[] = [];
  
  // Extract base network (e.g., "192.168.1" from "192.168.1.100")
  const networkParts = baseIp.split('.').slice(0, 3);
  const networkBase = networkParts.join('.');

  for (let i = start; i <= end; i++) {
    const ip = `${networkBase}.${i}`;
    const isOnline = await ping(ip);
    results.push({ ip, isOnline });
    
    if (onProgress) {
      onProgress({ ip, isOnline });
    }
  }

  return results;
}

export function getComputersFile(): string {
  return COMPUTERS_FILE;
}
