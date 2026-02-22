/**
 * YAML file storage provider for MyCluster
 * Compatible with existing YAML format from original implementation
 */
import * as fs from 'fs';
import * as path from 'path';
import { Computer, Service, Job, StorageProvider } from '@mycluster/core';

export interface YamlStorageOptions {
  dataDir: string;
}

export class YamlStorage implements StorageProvider {
  private readonly computersFile: string;

  constructor(options: YamlStorageOptions) {
    this.computersFile = path.join(options.dataDir, 'computers.yaml');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    const dir = path.dirname(this.computersFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Simple YAML parser - handles our specific format
  private parseSimpleYaml(content: string): Computer[] {
    const computers: Computer[] = [];
    const lines = content.split('\n');
    let current: Partial<Computer> = { services: [] };
    let currentService: Partial<Service> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Computer entry
      if (trimmed.startsWith('- id:')) {
        if (current.id) {
          computers.push(current as Computer);
        }
        current = { services: [] };
        currentService = null;

        const rest = trimmed.slice(5).trim();
        current.id = rest.replace(/^["']|["']$/g, '');
      } else if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        const cleanValue = value.replace(/^["']|["']$/g, '');

        if (key === 'services' && cleanValue === '[]') {
          current.services = [];
          continue;
        }

        // Check if this is a service entry
        if (trimmed.startsWith('    - service:')) {
          currentService = {
            id: `service_${Date.now()}`,
            type: 'custom',
            enabled: true,
            config: {},
            addedDate: new Date().toISOString(),
          };
          const serviceType = trimmed.replace('    - service:', '').trim();
          if (serviceType) {
            currentService.type = serviceType as 'ollama' | 'custom';
          }
          if (!current.services) current.services = [];
          current.services.push(currentService as Service);
        } else if (currentService && ['type', 'name', 'enabled', 'port', 'baseUrl', 'id', 'addedDate', 'lastChecked', 'status'].includes(key)) {
          // Parse service properties
          (currentService as Record<string, unknown>)[key] = 
            key === 'enabled' ? cleanValue === 'true' :
            key === 'port' ? parseInt(cleanValue, 10) :
            cleanValue;
        } else if (current && ['ipAddress', 'computerName', 'isOnline', 'lastSeen', 'addedDate'].includes(key)) {
          // Parse computer properties
          (current as Record<string, unknown>)[key] = 
            key === 'isOnline' ? cleanValue === 'true' :
            cleanValue;
        }
      }
    }

    // Don't forget the last computer
    if (current.id) {
      computers.push(current as Computer);
    }

    return computers;
  }

  private toSimpleYaml(computers: Computer[]): string {
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

  private loadComputers(): Computer[] {
    if (!fs.existsSync(this.computersFile)) {
      return [];
    }
    const content = fs.readFileSync(this.computersFile, 'utf-8');
    return this.parseSimpleYaml(content);
  }

  private saveComputers(computers: Computer[]): void {
    const yaml = this.toSimpleYaml(computers);
    fs.writeFileSync(this.computersFile, yaml, 'utf-8');
  }

  // StorageProvider implementation
  async getComputers(): Promise<Computer[]> {
    return this.loadComputers();
  }

  async saveComputer(computer: Computer): Promise<void> {
    const computers = this.loadComputers();
    const index = computers.findIndex(c => c.id === computer.id);
    if (index !== -1) {
      computers[index] = computer;
    } else {
      computers.push(computer);
    }
    this.saveComputers(computers);
  }

  async updateComputer(id: string, updates: Partial<Computer>): Promise<void> {
    const computers = this.loadComputers();
    const index = computers.findIndex(c => c.id === id);
    if (index !== -1) {
      computers[index] = { ...computers[index], ...updates };
      this.saveComputers(computers);
    }
  }

  async deleteComputer(id: string): Promise<void> {
    const computers = this.loadComputers();
    const filtered = computers.filter(c => c.id !== id);
    this.saveComputers(filtered);
  }

  async addService(computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service> {
    const computers = this.loadComputers();
    const index = computers.findIndex(c => c.id === computerId);

    if (index === -1) {
      throw new Error(`Computer ${computerId} not found`);
    }

    const newService: Service = {
      ...service,
      id: `service_${Date.now()}`,
      addedDate: new Date().toISOString(),
    };

    if (!computers[index].services) {
      computers[index].services = [];
    }
    computers[index].services!.push(newService);
    this.saveComputers(computers);

    return newService;
  }

  async removeService(computerId: string, serviceId: string): Promise<void> {
    const computers = this.loadComputers();
    const index = computers.findIndex(c => c.id === computerId);

    if (index !== -1 && computers[index].services) {
      computers[index].services = computers[index].services.filter(s => s.id !== serviceId);
      this.saveComputers(computers);
    }
  }

  async updateService(computerId: string, serviceId: string, updates: Partial<Service>): Promise<void> {
    const computers = this.loadComputers();
    const index = computers.findIndex(c => c.id === computerId);

    if (index !== -1 && computers[index].services) {
      const serviceIndex = computers[index].services.findIndex(s => s.id === serviceId);
      if (serviceIndex !== -1) {
        computers[index].services[serviceIndex] = {
          ...computers[index].services[serviceIndex],
          ...updates,
        };
        this.saveComputers(computers);
      }
    }
  }

  // Job operations - not implemented for YAML (use SQLite for jobs)
  async getJobs(): Promise<Job[]> {
    return [];
  }

  async saveJob(_job: Job): Promise<void> {
    throw new Error('Job storage not supported in YAML provider. Use SQLite storage.');
  }

  async updateJob(_id: string, _updates: Partial<Job>): Promise<void> {
    throw new Error('Job storage not supported in YAML provider. Use SQLite storage.');
  }

  async deleteJob(_id: string): Promise<void> {
    throw new Error('Job storage not supported in YAML provider. Use SQLite storage.');
  }
}
