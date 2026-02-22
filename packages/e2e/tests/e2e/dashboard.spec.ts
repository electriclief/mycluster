/**
 * E2E Test: Dashboard & Cluster Metrics
 * 
 * Tests the main dashboard functionality:
 * 1. Cluster metrics display
 * 2. Real-time updates
 * 3. Navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should load dashboard with metrics', async ({ page }) => {
    await page.goto('/');
    
    // Check main dashboard elements
    await expect(page.locator('h1:has-text("MyCluster")')).toBeVisible();
    
    // Check cluster metrics section
    const metricsSection = page.locator('text=Cluster Metrics, text=Server Status, text=Agents, text=Jobs');
    await expect(metricsSection.first()).toBeVisible();
    
    console.log('✅ Dashboard load test passed');
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to Jobs
    await page.click('a:has-text("Jobs")');
    await expect(page).toHaveURL('/jobs');
    await expect(page.locator('h2:has-text("Job Queue")')).toBeVisible();
    
    // Test navigation to Results
    await page.click('a:has-text("Results")');
    await expect(page).toHaveURL('/results');
    await expect(page.locator('h2:has-text("Results Viewer")')).toBeVisible();
    
    // Test navigation to Settings
    await page.click('a:has-text("Settings")');
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h2:has-text("Settings")')).toBeVisible();
    
    // Navigate back to Dashboard
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL('/');
    
    console.log('✅ Navigation test passed');
  });

  test('should show WebSocket connection status', async ({ page }) => {
    await page.goto('/');
    
    // Wait for WebSocket connection indicator
    await page.waitForTimeout(2000);
    
    // Should show either connected or connecting status
    const statusText = await page.locator('text=Real-time, text=Connecting, text=WebSocket').count();
    expect(statusText).toBeGreaterThan(0);
    
    console.log('✅ WebSocket status test passed');
  });
});
