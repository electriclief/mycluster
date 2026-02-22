/**
 * API Integration Tests
 * 
 * Tests server API endpoints directly.
 * Runs against a live server instance.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('Server API', () => {
  let serverApiKey: string | undefined;

  beforeAll(async () => {
    // Health check - ensure server is running
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    expect(healthResponse.ok).toBe(true);
    
    // Get API key if security is enabled
    try {
      const keysResponse = await fetch(`${BASE_URL}/api/security/keys`);
      if (keysResponse.ok) {
        const data = await keysResponse.json();
        const serverKey = data.keys?.find((k: any) => k.type === 'server');
        serverApiKey = serverKey?.key;
      }
    } catch {
      // Security not enabled, continue without key
    }
  });

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (serverApiKey) {
      headers['X-API-Key'] = serverApiKey;
    }
    return headers;
  };

  describe('Health & Stats', () => {
    it('should return health status', async () => {
      const response = await fetch(`${BASE_URL}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.uptime).toBeGreaterThan(0);
    });

    it('should return server stats', async () => {
      const response = await fetch(`${BASE_URL}/api/stats`, {
        headers: getHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.isRunning).toBe(true);
      expect(data.port).toBe(3000);
    });
  });

  describe('Jobs API', () => {
    let createdJobId: string;

    it('should list jobs', async () => {
      const response = await fetch(`${BASE_URL}/api/jobs`, {
        headers: getHeaders(),
      });
      expect(response.status).toBe(200);
      
      const jobs = await response.json();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should create a job', async () => {
      const jobData = {
        script: "print('Integration test')",
        targetComputerId: 'test_computer',
        priority: 5,
        args: {},
      };

      const response = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(jobData),
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.job).toBeDefined();
      expect(result.job.id).toBeDefined();
      
      createdJobId = result.job.id;
    });

    it('should get job by ID', async () => {
      if (!createdJobId) return;
      
      const response = await fetch(`${BASE_URL}/api/jobs/${createdJobId}`, {
        headers: getHeaders(),
      });
      expect(response.status).toBe(200);
      
      const job = await response.json();
      expect(job.id).toBe(createdJobId);
    });

    it('should get job stats', async () => {
      const response = await fetch(`${BASE_URL}/api/jobs/stats`, {
        headers: getHeaders(),
      });
      expect(response.status).toBe(200);
      
      const stats = await response.json();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('complete');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('Computers API', () => {
    it('should list computers', async () => {
      const response = await fetch(`${BASE_URL}/api/computers`, {
        headers: getHeaders(),
      });
      expect(response.status).toBe(200);
      
      const computers = await response.json();
      expect(Array.isArray(computers)).toBe(true);
    });

    it('should add a computer', async () => {
      const computerData = {
        ipAddress: '192.168.1.100',
        computerName: 'Test Computer',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };

      const response = await fetch(`${BASE_URL}/api/computers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(computerData),
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.computer.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('Security API', () => {
    it('should list API keys (if enabled)', async () => {
      const response = await fetch(`${BASE_URL}/api/security/keys`);
      
      // May be 503 if security not enabled
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.keys)).toBe(true);
      }
    });

    it('should get audit logs (if enabled)', async () => {
      const response = await fetch(`${BASE_URL}/api/security/audit-logs`);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.logs)).toBe(true);
      }
    });
  });
});
