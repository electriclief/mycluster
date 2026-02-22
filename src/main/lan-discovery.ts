import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface LanService {
  id: string;
  type: 'ollama' | 'custom';
  name: string;
  enabled: boolean;
  port?: number;
  baseUrl?: string;
  config?: Record<string, unknown>;
  addedDate: string;
  lastChecked?: string;
  status?: 'online' | 'offline' | 'error';
}

export interface LanComputer {
  id: string;
  ipAddress: string;
  computerName: string;
  isOnline: boolean;
  lastSeen: string;
  addedDate: string;
  services?: LanService[];
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
  let current: Partial<LanComputer> = { services: [] };
  let currentService: Partial<LanService> | null = null;
  let inServicesBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Computer entry
    if (trimmed.startsWith('- id:')) {
      if (current.id) {
        computers.push(current as LanComputer);
      }
      current = { services: [] };
      inServicesBlock = false;
      currentService = null;
      
      const rest = trimmed.slice(5).trim();
      current.id = rest.replace(/^["']|["']$/g, '');
    } else if (trimmed.startsWith('- service:') && trimmed.includes('type:')) {
      // Service entry like "- service: ollama" or "- service: {type: ollama}"
      inServicesBlock = true;
      const serviceMatch = trimmed.match(/- service:\s*(\w+)/);
      currentService = {
        id: `service_${Date.now()}`,
        type: 'custom',
        enabled: true,
        config: {},
        addedDate: new Date().toISOString(),
      };
      if (serviceMatch) {
        currentService.type = serviceMatch[1] as 'ollama' | 'custom';
      }
    } else if (trimmed.startsWith('- ') && !trimmed.includes(':')) {
      // This shouldn't happen in our format, skip
      continue;
    } else if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key && value) {
        const cleanValue = value.replace(/^["']|["']$/g, '');
        
        if (inServicesBlock && currentService) {
          // Parse service properties
          if (key === 'type') {
            currentService.type = cleanValue as 'ollama' | 'custom';
          } else if (key === 'name') {
            currentService.name = cleanValue;
          } else if (key === 'enabled') {
            currentService.enabled = cleanValue === 'true';
          } else if (key === 'port') {
            currentService.port = parseInt(cleanValue, 10);
          } else if (key === 'baseUrl') {
            currentService.baseUrl = cleanValue;
          } else if (key === 'id') {
            currentService.id = cleanValue;
          } else if (key === 'addedDate') {
            currentService.addedDate = cleanValue;
          } else if (key === 'lastChecked') {
            currentService.lastChecked = cleanValue;
          } else if (key === 'status') {
            currentService.status = cleanValue as 'online' | 'offline' | 'error';
          }
        } else if (current) {
          // Parse computer properties
          if (key === 'ipAddress') {
            current.ipAddress = cleanValue;
          } else if (key === 'computerName') {
            current.computerName = cleanValue;
          } else if (key === 'isOnline') {
            current.isOnline = cleanValue === 'true';
          } else if (key === 'lastSeen') {
            current.lastSeen = cleanValue;
          } else if (key === 'addedDate') {
            current.addedDate = cleanValue;
          } else if (key === 'services') {
            inServicesBlock = cleanValue === '[]' ? false : true;
            if (cleanValue !== '[]') {
              // Services will follow as indented entries
            }
          }
        }
      }
    }
    
    // Check if we're leaving the services block (new computer or end marker)
    if (trimmed.startsWith('- id:') && currentService) {
      if (current.services) {
        current.services.push(currentService as LanService);
      }
      currentService = null;
    }
  }

  // Don't forget the last service and computer
  if (currentService && current.services) {
    current.services.push(currentService as LanService);
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
    
    if (computer.services && computer.services.length > 0) {
      yaml += `  services:\n`;
      for (const service of computer.services) {
        yaml += `    - service: ${service.type}\n`;
        yaml += `      id: ${service.id}\n`;
        yaml += `      name: ${service.name}\n`;
        yaml += `      enabled: ${service.enabled}\n`;
        if (service.port) yaml += `      port: ${service.port}\n`;
        if (service.baseUrl) yaml += `      baseUrl: ${service.baseUrl}\n`;
        yaml += `      addedDate: ${service.addedDate}\n`;
        if (service.lastChecked) yaml += `      lastChecked: ${service.lastChecked}\n`;
        if (service.status) yaml += `      status: ${service.status}\n`;
      }
    } else {
      yaml += `  services: []\n`;
    }
    
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
    services: [],
  };

  computers.push(newComputer);
  saveComputers(computers);

  return newComputer;
}

// Add computer with auto-detected services
export async function addComputerWithAutoDetect(computer: Omit<LanComputer, 'id' | 'addedDate' | 'services'>): Promise<{
  computer: LanComputer;
  detectedServices: {
    type: 'ollama';
    port: number;
    baseUrl: string;
    models?: string[];
    status: 'online' | 'offline';
  }[];
}> {
  const computers = loadComputers();

  const newComputer: LanComputer = {
    ...computer,
    id: `computer_${Date.now()}`,
    addedDate: new Date().toISOString(),
    services: [],
  };

  // Auto-detect services
  const detectedServices = await autoDetectServices(computer.ipAddress);

  // Add detected services
  for (const service of detectedServices) {
    newComputer.services?.push({
      id: `service_${Date.now()}_${service.type}`,
      type: service.type,
      name: service.type === 'ollama' ? 'Ollama API' : 'Unknown Service',
      enabled: true,
      port: service.port,
      baseUrl: service.baseUrl,
      config: { models: service.models || [] },
      addedDate: new Date().toISOString(),
      status: service.status,
      lastChecked: new Date().toISOString(),
    });
  }

  computers.push(newComputer);
  saveComputers(computers);

  return { computer: newComputer, detectedServices };
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

// Service management
export function addService(computerId: string, service: Omit<LanService, 'id' | 'addedDate'>): LanService {
  const computers = loadComputers();
  const index = computers.findIndex(c => c.id === computerId);

  if (index === -1) {
    throw new Error(`Computer ${computerId} not found`);
  }

  const newService: LanService = {
    ...service,
    id: `service_${Date.now()}`,
    addedDate: new Date().toISOString(),
  };

  if (!computers[index].services) {
    computers[index].services = [];
  }
  computers[index].services.push(newService);
  saveComputers(computers);

  return newService;
}

export function removeService(computerId: string, serviceId: string): void {
  const computers = loadComputers();
  const index = computers.findIndex(c => c.id === computerId);

  if (index !== -1 && computers[index].services) {
    computers[index].services = computers[index].services.filter(s => s.id !== serviceId);
    saveComputers(computers);
  }
}

export function updateService(computerId: string, serviceId: string, updates: Partial<LanService>): void {
  const computers = loadComputers();
  const computerIndex = computers.findIndex(c => c.id === computerId);

  if (computerIndex !== -1 && computers[computerIndex].services) {
    const serviceIndex = computers[computerIndex].services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
      computers[computerIndex].services[serviceIndex] = {
        ...computers[computerIndex].services[serviceIndex],
        ...updates,
      };
      saveComputers(computers);
    }
  }
}

// Ollama detection - check if Ollama API is available
export async function checkOllama(baseUrl: string, timeout = 2000): Promise<{
  available: boolean;
  models?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { models?: { name: string }[] };
    const models = data.models?.map((m) => m.name) || [];
    return { available: true, models };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Auto-detect services on a computer
export async function autoDetectServices(ipAddress: string): Promise<{
  type: 'ollama';
  port: number;
  baseUrl: string;
  models?: string[];
  status: 'online' | 'offline';
}[]> {
  const detected: {
    type: 'ollama';
    port: number;
    baseUrl: string;
    models?: string[];
    status: 'online' | 'offline';
  }[] = [];

  // Check Ollama on default port 11434
  const ollamaBaseUrl = `http://${ipAddress}:11434`;
  const ollamaResult = await checkOllama(ollamaBaseUrl, 1500);
  
  if (ollamaResult.available) {
    detected.push({
      type: 'ollama',
      port: 11434,
      baseUrl: ollamaBaseUrl,
      models: ollamaResult.models,
      status: 'online',
    });
  }

  return detected;
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
