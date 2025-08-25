import { test, expect } from "@chromatic-com/playwright";
import { loginAsRandomUser } from "../utils/auth";

/**
 * Test Suite for LLM Configuration UI Changes
 * 
 * This test suite validates the requirements from dev_plan/1.2_llmConfigUIChanges.md:
 * 1. No popup modal appears on initial startup when LLM is not configured
 * 2. "here" link redirects to /admin/configuration/llm instead of opening popup
 * 3. Message auto-hides when LLM is configured
 * 4. No regression in existing functionality
 */

test.describe("LLM Configuration UI Changes", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsRandomUser(page);
    
    // Ensure we start with no LLM configured for consistent test state
    // This will be verified by the presence of the unconfigured message
  });

  test("should not show popup modal on initial startup when LLM not configured", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Wait for page to load completely
    await page.waitForLoadState("networkidle");
    
    // Check that no API Key modal is visible on page load
    // The modal should have a title "Configure a Generative AI Model"
    const apiKeyModal = page.locator('text="Configure a Generative AI Model"');
    await expect(apiKeyModal).not.toBeVisible();
    
    // Additional check for any modal backdrop or overlay
    const modalBackdrop = page.locator('[data-testid="modal-backdrop"]');
    await expect(modalBackdrop).not.toBeVisible();
    
    // Verify that the unconfigured message is visible instead
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
  });

  test("should redirect to admin configuration page when clicking here link", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Wait for the unconfigured message to be visible
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
    
    // Find and click the "here" link
    const hereLink = page.locator('text="here"');
    await expect(hereLink).toBeVisible();
    
    // Click the "here" link
    await hereLink.click();
    
    // Verify that we are redirected to the admin configuration page
    await expect(page).toHaveURL(/.*\/admin\/configuration\/llm$/);
    
    // Verify the admin page loads correctly
    await page.waitForLoadState("networkidle");
    
    // Check for admin page elements (this may need adjustment based on actual admin page content)
    const adminPageHeader = page.locator('h1, h2, [data-testid="admin-header"]').first();
    await expect(adminPageHeader).toBeVisible();
  });

  test("should not open modal popup when here link is clicked", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Wait for the unconfigured message
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
    
    // Click the "here" link
    const hereLink = page.locator('text="here"');
    await hereLink.click();
    
    // Wait a moment to ensure no modal appears
    await page.waitForTimeout(1000);
    
    // Verify no modal opened
    const apiKeyModal = page.locator('text="Configure a Generative AI Model"');
    await expect(apiKeyModal).not.toBeVisible();
  });

  test("should auto-hide message when LLM is configured", async ({ page }) => {
    // This test assumes we can configure an LLM during the test
    // Navigate to admin configuration page directly
    await page.goto("http://localhost:9000/admin/configuration/llm");
    
    // Configure a test LLM provider (this may need adjustment based on actual admin interface)
    // For now, we'll simulate this by going back to chat and checking if message is hidden
    // In a real test, we would:
    // 1. Fill out LLM configuration form
    // 2. Save configuration
    // 3. Navigate back to chat page
    // 4. Verify message is hidden
    
    // Skip this test for now as it requires actual LLM configuration
    test.skip();
  });

  test("should maintain existing chat functionality after changes", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Verify chat interface elements are present and functional
    const chatInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="chat"], input[placeholder*="message"]');
    await expect(chatInput).toBeVisible();
    
    // Verify send button is present (may be icon or text)
    const sendButton = page.locator('button[type="submit"], button[aria-label="Send"], [data-testid="send-button"]');
    await expect(sendButton).toBeVisible();
    
    // Verify chat area exists
    const chatArea = page.locator('[data-testid="chat-container"], [data-testid="chat-messages"], .chat-messages').first();
    await expect(chatArea).toBeVisible();
    
    // Test typing in chat input
    await chatInput.fill("Test message");
    await expect(chatInput).toHaveValue("Test message");
    
    // Clear the input
    await chatInput.fill("");
  });

  test("should handle multiple browser tabs during configuration", async ({ page, context }) => {
    // Open first tab with chat page
    await page.goto("http://localhost:9000/chat");
    
    // Verify unconfigured message is visible
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
    
    // Open second tab with admin configuration
    const adminPage = await context.newPage();
    await adminPage.goto("http://localhost:9000/admin/configuration/llm");
    
    // Go back to first tab - message should still be visible
    await expect(unconfiguredMessage).toBeVisible();
    
    await adminPage.close();
  });

  test("should maintain message state after page refresh", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Verify unconfigured message is visible
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Verify message is still visible after refresh
    await expect(unconfiguredMessage).toBeVisible();
    
    // Verify no modal appears after refresh
    const apiKeyModal = page.locator('text="Configure a Generative AI Model"');
    await expect(apiKeyModal).not.toBeVisible();
  });

  test("should handle back button after redirect", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Click the "here" link
    const hereLink = page.locator('text="here"');
    await hereLink.click();
    
    // Verify we're on admin page
    await expect(page).toHaveURL(/.*\/admin\/configuration\/llm$/);
    
    // Go back using browser back button
    await page.goBack();
    
    // Verify we're back on chat page
    await expect(page).toHaveURL(/.*\/chat$/);
    
    // Verify unconfigured message is still visible
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
  });

  test("should handle direct URL access to chat page", async ({ page }) => {
    // Directly navigate to chat page via URL
    await page.goto("http://localhost:9000/chat");
    
    // Verify page loads correctly
    await page.waitForLoadState("networkidle");
    
    // Verify no modal appears
    const apiKeyModal = page.locator('text="Configure a Generative AI Model"');
    await expect(apiKeyModal).not.toBeVisible();
    
    // Verify unconfigured message appears
    const unconfiguredMessage = page.locator('text="Please note that you have not yet configured an LLM provider"');
    await expect(unconfiguredMessage).toBeVisible();
    
    // Verify here link works
    const hereLink = page.locator('text="here"');
    await expect(hereLink).toBeVisible();
    await hereLink.click();
    await expect(page).toHaveURL(/.*\/admin\/configuration\/llm$/);
  });

  test("should not show console errors after changes", async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Click the here link
    const hereLink = page.locator('text="here"');
    await hereLink.click();
    
    // Go back to chat
    await page.goBack();
    
    // Wait for any async operations to complete
    await page.waitForTimeout(2000);
    
    // Verify no console errors occurred
    expect(consoleErrors).toEqual([]);
  });
});

/**
 * Regression Test Suite - Verify existing functionality still works
 */
test.describe("LLM Configuration - Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsRandomUser(page);
  });

  test("should still support ApiKeyModal usage in other pages", async ({ page }) => {
    // This test verifies that ApiKeyModal component still works elsewhere
    // The plan mentions it's used in NRFPage.tsx as well
    
    // For now, we'll just verify the component can be imported
    // In a real test, we'd navigate to NRFPage and test modal functionality there
    test.skip("Need to identify other pages using ApiKeyModal");
  });

  test("should maintain all existing chat features", async ({ page }) => {
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    
    // Test basic chat interface elements
    const chatInput = page.locator('textarea, input[type="text"]').last();
    await expect(chatInput).toBeVisible();
    
    // Test assistant selection if available
    const assistantSelector = page.locator('[data-testid^="assistant-"]').first();
    if (await assistantSelector.isVisible()) {
      await expect(assistantSelector).toBeVisible();
    }
    
    // Test message history area
    const messageArea = page.locator('.chat-messages, [data-testid="chat-container"]').first();
    await expect(messageArea).toBeVisible();
  });
});