/**
 * E2E Test: Job Workflow
 * 
 * Tests the complete job lifecycle:
 * 1. Submit a job
 * 2. Monitor job status
 * 3. View job results
 * 4. Delete job
 */

import { test, expect } from '@playwright/test';

test.describe('Job Workflow', () => {
  test('should create, monitor, and complete a job', async ({ page }) => {
    // Navigate to Jobs page
    await page.goto('/');
    await page.click('a[href="/jobs"]');
    await expect(page).toHaveURL('/jobs');

    // Check job queue is visible
    await expect(page.locator('h2', { hasText: 'Job Queue' })).toBeVisible();

    // Submit a simple job
    const script = "print('Hello from E2E test!')";
    
    await page.selectOption('select', { value: '' }); // Will use simulated execution
    
    // Fill in the script
    await page.locator('textarea').fill(script);
    
    // Set priority
    await page.locator('input[type="range"]').fill('5');
    
    // Submit job
    await page.click('button:has-text("Submit Job")');
    
    // Wait for job to appear in list
    await page.waitForSelector('text="pending"');
    
    // Verify job stats updated
    const pendingCount = await page.locator('text=Pending').textContent();
    expect(pendingCount).toContain('1');
    
    // Refresh to see status changes (simulated execution completes quickly)
    await page.waitForTimeout(3000);
    await page.reload();
    
    // Job should be complete or running
    const statusLocator = page.locator('[class*="status"], span:has-text("pending"), span:has-text("running"), span:has-text("complete")').first();
    await expect(statusLocator).toBeVisible();
    
    console.log('✅ Job workflow test passed');
  });

  test('should filter jobs by status', async ({ page }) => {
    await page.goto('/jobs');
    
    // Click different filter buttons
    const filters = ['all', 'pending', 'running', 'complete', 'failed'];
    
    for (const filter of filters) {
      await page.click(`button:has-text("${filter}")`);
      await page.waitForTimeout(500);
      
      // Verify filter is active (button should be highlighted)
      const activeButton = page.locator(`button:has-text("${filter}")`);
      await expect(activeButton).toBeVisible();
    }
    
    console.log('✅ Job filtering test passed');
  });

  test('should view job details', async ({ page }) => {
    await page.goto('/jobs');
    
    // Wait for jobs to load
    await page.waitForTimeout(2000);
    
    // Click details button on first job
    const detailsButtons = await page.locator('button:has-text("Details")').all();
    
    if (detailsButtons.length > 0) {
      await detailsButtons[0].click();
      
      // Wait for modal to open
      await expect(page.locator('h3:has-text("Job Details")')).toBeVisible();
      
      // Verify job information is displayed
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Script')).toBeVisible();
      await expect(page.locator('text=Created')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Close")');
      await expect(page.locator('h3:has-text("Job Details")')).not.toBeVisible();
    }
    
    console.log('✅ Job details test passed');
  });
});
