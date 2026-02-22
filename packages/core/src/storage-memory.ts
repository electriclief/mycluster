/**
 * In-memory storage provider for testing
 */
import { Computer, Service, Job, StorageProvider } from './types.js';

export class MemoryStorage implements StorageProvider {
  private computers: Map<string, Computer> = new Map();
  private jobs: Map<string, Job> = new Map();

  async getComputers(): Promise<Computer[]> {
    return Array.from(this.computers.values());
  }

  async saveComputer(computer: Computer): Promise<void> {
    this.computers.set(computer.id, computer);
  }

  async updateComputer(id: string, updates: Partial<Computer>): Promise<void> {
    const computer = this.computers.get(id);
    if (computer) {
      this.computers.set(id, { ...computer, ...updates });
    }
  }

  async deleteComputer(id: string): Promise<void> {
    this.computers.delete(id);
  }

  async addService(computerId: string, service: Omit<Service, 'id' | 'addedDate'>): Promise<Service> {
    const computer = this.computers.get(computerId);
    if (!computer) {
      throw new Error(`Computer ${computerId} not found`);
    }

    const newService: Service = {
      ...service,
      id: `service_${Date.now()}`,
      addedDate: new Date().toISOString(),
    };

    if (!computer.services) {
      computer.services = [];
    }
    computer.services.push(newService);
    await this.saveComputer(computer);
    return newService;
  }

  async removeService(computerId: string, serviceId: string): Promise<void> {
    const computer = this.computers.get(computerId);
    if (computer && computer.services) {
      computer.services = computer.services.filter(s => s.id !== serviceId);
      await this.saveComputer(computer);
    }
  }

  async updateService(computerId: string, serviceId: string, updates: Partial<Service>): Promise<void> {
    const computer = this.computers.get(computerId);
    if (computer && computer.services) {
      const serviceIndex = computer.services.findIndex(s => s.id === serviceId);
      if (serviceIndex !== -1) {
        computer.services[serviceIndex] = { ...computer.services[serviceIndex], ...updates };
        await this.saveComputer(computer);
      }
    }
  }

  async getJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async saveJob(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  async deleteJob(id: string): Promise<void> {
    this.jobs.delete(id);
  }
}
