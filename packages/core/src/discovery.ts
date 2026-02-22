/**
 * LAN Discovery - Ping-based computer detection
 */
import { spawn } from 'child_process';
import { Computer, ScanResult, OllamaResult, Service } from './types.js';

/**
 * Ping an IP address
 */
export async function ping(ip: string, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const args = isWin
      ? ['-n', '1', '-w', timeout.toString(), ip]
      : ['-c', '1', '-W', '1', ip];

    const proc = spawn('ping', args);
    let responded = false;
    const timer = setTimeout(() => {
      proc.kill();
      resolve(false);
    }, timeout + 500);

    proc.stdout.on('data', (data: Buffer) => {
      const output = data.toString().toLowerCase();
      if (output.includes('reply') || output.includes('ttl=')) {
        responded = true;
      }
    });

    proc.on('close', () => {
      clearTimeout(timer);
      resolve(responded);
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Scan a range of IPs
 */
export async function scanIpRange(
  baseIp: string,
  start: number,
  end: number,
  onProgress?: (result: ScanResult) => void
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

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

/**
 * Check if Ollama API is available
 */
export async function checkOllama(baseUrl: string, timeout = 2000): Promise<OllamaResult> {
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

/**
 * Auto-detect services on a computer
 */
export async function autoDetectServices(ipAddress: string): Promise<
  Array<{
    type: 'ollama';
    port: number;
    baseUrl: string;
    models?: string[];
    status: 'online' | 'offline';
  }>
> {
  const detected: Array<{
    type: 'ollama';
    port: number;
    baseUrl: string;
    models?: string[];
    status: 'online' | 'offline';
  }> = [];

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

/**
 * Add computer with auto-detected services
 */
export async function addComputerWithAutoDetect(
  computer: Omit<Computer, 'id' | 'addedDate' | 'services'>,
  storage: { saveComputer: (c: Computer) => Promise<void> }
): Promise<{
  computer: Computer;
  detectedServices: Array<{
    type: 'ollama';
    port: number;
    baseUrl: string;
    models?: string[];
    status: 'online' | 'offline';
  }>;
}> {
  const newComputer: Computer = {
    ...computer,
    id: `computer_${Date.now()}`,
    addedDate: new Date().toISOString(),
    services: [],
  };

  const detectedServices = await autoDetectServices(computer.ipAddress);

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

  await storage.saveComputer(newComputer);

  return { computer: newComputer, detectedServices };
}
