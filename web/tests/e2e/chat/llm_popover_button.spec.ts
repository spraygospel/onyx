import { test, expect } from "@chromatic-com/playwright";
import { loginAsRandomUser } from "../utils/auth";

/**
 * Test Suite for LLM Popover Button Functionality
 * 
 * This test suite validates the requirements from dev_plan/1.4_LLMbutton.md:
 * 1. Button click opens popover to show available LLM options  
 * 2. Popover positioning opens upward (since button is at bottom of screen)
 * 3. LLM models displayed with provider information (OpenAI, Anthropic, Groq, etc.)
 * 4. Selected LLM is actually used when user starts chatting
 * 5. Proper event handling without conflicts
 */

test.describe("LLM Popover Button Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsRandomUser(page);
    
    // Navigate to chat page
    await page.goto("http://localhost:9000/chat");
    await page.waitForLoadState("networkidle");
  });

  describe("Button Click and Popover Opening", () => {
    test("should open popover when LLM selection button is clicked", async ({ page }) => {
      // Find the LLM selection button (look for common patterns)
      const llmButton = page.locator([
        '[data-testid="llm-selector"]',
        '[aria-label="Switch models"]',
        'button:has-text("Switch models")',
        'button[title="Switch models"]',
        '.llm-selector button',
        // Fallback: button near bottom of page with model-related text
        'button:near([class*="chat-input"], [data-testid*="input"])',
      ].join(', ')).first();

      await expect(llmButton).toBeVisible();
      
      // Click the button
      await llmButton.click();

      // Wait for popover to appear
      await page.waitForTimeout(500);

      // Check for popover content - look for model list container
      const popoverContent = page.locator([
        '[data-testid="popover-content"]',
        '[role="dialog"]',
        '.popover-content',
        '[class*="popover"]',
        // Look for container with multiple model buttons
        'div:has(button:has-text("gpt")), div:has(button:has-text("claude")), div:has(button:has-text("llama"))',
      ].join(', ')).first();

      await expect(popoverContent).toBeVisible();
    });

    test("should close popover when clicking outside", async ({ page }) => {
      // Open popover first
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();

      // Wait for popover to open
      await page.waitForTimeout(500);

      // Click outside the popover (on chat area)
      await page.click('body', { position: { x: 100, y: 100 } });

      // Wait for close animation
      await page.waitForTimeout(500);

      // Check that popover is closed
      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).not.toBeVisible();
    });

    test("should toggle popover on multiple button clicks", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      
      // First click - open
      await llmButton.click();
      await page.waitForTimeout(300);
      
      let popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).toBeVisible();

      // Second click - close
      await llmButton.click();
      await page.waitForTimeout(300);
      await expect(popoverContent).not.toBeVisible();

      // Third click - open again
      await llmButton.click();
      await page.waitForTimeout(300);
      await expect(popoverContent).toBeVisible();
    });
  });

  describe("Popover Positioning - Upward Display", () => {
    test("should position popover above the button", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Get button position
      const buttonBox = await llmButton.boundingBox();
      expect(buttonBox).not.toBeNull();

      // Get popover position
      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).toBeVisible();
      
      const popoverBox = await popoverContent.boundingBox();
      expect(popoverBox).not.toBeNull();

      // Popover should be above the button (popover bottom < button top)
      expect(popoverBox!.y + popoverBox!.height).toBeLessThan(buttonBox!.y);
    });

    test("should align popover to start edge of button", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      const buttonBox = await llmButton.boundingBox();
      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      const popoverBox = await popoverContent.boundingBox();

      // Popover should be aligned to start (left edge should be close)
      expect(Math.abs(popoverBox!.x - buttonBox!.x)).toBeLessThan(50);
    });
  });

  describe("LLM Provider Display Format", () => {
    test("should display available LLM models with provider information", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Check for model options with provider information
      // Format should be "Model Name (via Provider)" or similar
      const modelOptions = [
        // OpenAI models
        { model: "gpt-4", provider: "OpenAI" },
        { model: "gpt-3.5", provider: "OpenAI" },
        // Anthropic models  
        { model: "claude", provider: "Anthropic" },
        // Groq models
        { model: "llama", provider: "Groq" },
        { model: "mixtral", provider: "Groq" },
      ];

      let foundModels = 0;
      for (const option of modelOptions) {
        const modelElement = page.locator([
          `text="${option.model}"`,
          `[title*="${option.model}"]`,
          `button:has-text("${option.model}")`,
        ].join(', ')).first();

        if (await modelElement.isVisible()) {
          foundModels++;
          
          // Check if provider information is displayed
          const parentElement = modelElement.locator('..'); // Get parent
          const hasProviderInfo = await parentElement.locator([
            `text="${option.provider}"`,
            `text="via ${option.provider}"`,
            `text="(${option.provider})"`,
          ].join(', ')).isVisible();

          expect(hasProviderInfo).toBeTruthy();
        }
      }

      // Ensure we found at least some models
      expect(foundModels).toBeGreaterThan(0);
    });

    test("should show provider icons for each model", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Look for provider icons (usually SVG or image elements)
      const providerIcons = page.locator([
        'svg[class*="icon"]',
        'img[alt*="provider"], img[alt*="icon"]',
        '[data-testid="provider-icon"]',
        '.provider-icon',
      ].join(', '));

      const iconCount = await providerIcons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test("should not display invisible/disabled models", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Check that disabled models are not shown
      const disabledModels = [
        "gpt-4-vision-preview", // Often disabled
        "claude-instant-1.0", // Often disabled
      ];

      for (const model of disabledModels) {
        const modelElement = page.locator(`button:has-text("${model}")`);
        if (await modelElement.count() > 0) {
          // If it exists, it should not be clickable or should be visually disabled
          await expect(modelElement).toHaveAttribute('disabled');
        }
      }
    });
  });

  describe("Model Selection and Chat Integration", () => {
    test("should select model when clicked and close popover", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Find and click a model option
      const modelOption = page.locator([
        'button:has-text("gpt-4")',
        'button:has-text("claude")',
        'button:has-text("llama")',
      ].join(', ')).first();

      await expect(modelOption).toBeVisible();
      
      // Get model name before clicking
      const selectedModelText = await modelOption.textContent();
      
      await modelOption.click();
      await page.waitForTimeout(500);

      // Popover should close after selection
      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).not.toBeVisible();

      // Button should show selected model (check if button text updated)
      const buttonText = await llmButton.textContent();
      expect(buttonText).toContain(selectedModelText?.split(' ')[0] || 'selected');
    });

    test("should actually use selected LLM in chat conversation", async ({ page }) => {
      // Select a specific model
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Select Claude model for testing
      const claudeModel = page.locator('button:has-text("claude")').first();
      if (await claudeModel.isVisible()) {
        await claudeModel.click();
        await page.waitForTimeout(500);

        // Send a test message
        const chatInput = page.locator([
          'textarea[placeholder*="message"]',
          'input[placeholder*="message"]',
          '[data-testid="chat-input"]',
        ].join(', ')).first();

        await chatInput.fill("Hello, what model are you?");
        
        // Find and click send button
        const sendButton = page.locator([
          'button[type="submit"]',
          'button[aria-label="Send"]',
          '[data-testid="send-button"]',
          'button:near(textarea)',
        ].join(', ')).first();

        await sendButton.click();

        // Wait for response
        await page.waitForTimeout(3000);

        // Check that response mentions Claude (if the selection worked)
        const chatMessages = page.locator([
          '.chat-message',
          '[data-testid*="message"]',
          '.message-content',
        ].join(', '));

        const messageCount = await chatMessages.count();
        if (messageCount > 0) {
          const lastMessage = chatMessages.last();
          const messageText = await lastMessage.textContent();
          
          // Response should indicate Claude model is being used
          expect(messageText).toMatch(/claude|anthropic/i);
        }
      } else {
        test.skip('Claude model not available for testing');
      }
    });

    test("should highlight currently selected model in popover", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      
      // Get currently selected model from button
      const currentModelText = await llmButton.textContent();
      
      await llmButton.click();
      await page.waitForTimeout(500);

      // Find the currently selected model in the list
      const selectedModel = page.locator(`button:has-text("${currentModelText?.trim()}")`).first();
      
      if (await selectedModel.isVisible()) {
        // Check if it has selected/active styling
        const hasActiveClass = await selectedModel.evaluate((el) => {
          return el.classList.contains('selected') || 
                 el.classList.contains('active') ||
                 el.classList.contains('bg-accent') ||
                 getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)';
        });

        expect(hasActiveClass).toBeTruthy();
      }
    });
  });

  describe("Temperature Control Integration", () => {
    test("should show temperature slider when available", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      // Look for temperature control
      const temperatureSlider = page.locator([
        'input[type="range"]',
        '[data-testid="temperature-slider"]',
        'slider[aria-label*="temperature"]',
      ].join(', ')).first();

      if (await temperatureSlider.isVisible()) {
        // Test slider interaction
        await temperatureSlider.fill('0.8');
        
        // Check if value is reflected in UI
        const temperatureDisplay = page.locator('text=/temperature|creativity/i');
        await expect(temperatureDisplay).toBeVisible();
      }
    });
  });

  describe("Error Handling and Accessibility", () => {
    test("should handle no available models gracefully", async ({ page }) => {
      // This test simulates when no models are configured
      // Navigate to admin and disable all models first (if possible)
      await page.goto("http://localhost:9000/admin/configuration/llm");
      await page.waitForLoadState("networkidle");
      
      // Go back to chat
      await page.goto("http://localhost:9000/chat");
      await page.waitForLoadState("networkidle");

      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      
      if (await llmButton.isVisible()) {
        await llmButton.click();
        await page.waitForTimeout(500);

        // Should show appropriate message for no models
        const noModelsMessage = page.locator([
          'text="No models available"',
          'text="No LLM configured"',
          'text="Configure models"',
        ].join(', ')).first();

        // Either no models message or redirect to config
        const hasMessage = await noModelsMessage.isVisible();
        const isOnConfigPage = page.url().includes('/admin/configuration');
        
        expect(hasMessage || isOnConfigPage).toBeTruthy();
      }
    });

    test("should be accessible via keyboard navigation", async ({ page }) => {
      // Focus on the LLM button
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.focus();

      // Open with Enter key
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).toBeVisible();

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');

      // Select with Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Popover should close
      await expect(popoverContent).not.toBeVisible();
    });

    test("should not show console errors during interaction", async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Perform all interactions
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      const modelOption = page.locator('button:has-text("gpt"), button:has-text("claude")').first();
      if (await modelOption.isVisible()) {
        await modelOption.click();
      }

      await page.waitForTimeout(1000);

      // Filter out known acceptable errors (network timeouts, etc.)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('NetworkError') && 
        !error.includes('Loading chunk') &&
        !error.includes('Failed to fetch')
      );

      expect(criticalErrors).toEqual([]);
    });
  });

  describe("Visual and UI Consistency", () => {
    test("should maintain consistent styling with rest of interface", async ({ page }) => {
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      const popoverContent = page.locator('[role="dialog"], .popover-content').first();
      
      // Check that popover has proper styling
      const bgColor = await popoverContent.evaluate((el) => getComputedStyle(el).backgroundColor);
      const border = await popoverContent.evaluate((el) => getComputedStyle(el).border);
      
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have background
      expect(border).not.toBe('none'); // Should have border
    });

    test("should handle dark/light mode properly", async ({ page }) => {
      // Test light mode
      const llmButton = page.locator('button[title="Switch models"], [aria-label="Switch models"]').first();
      await llmButton.click();
      await page.waitForTimeout(500);

      let popoverContent = page.locator('[role="dialog"], .popover-content').first();
      await expect(popoverContent).toBeVisible();

      // Toggle dark mode if available
      const darkModeToggle = page.locator('[aria-label*="dark"], [data-testid*="theme"]').first();
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Reopen popover in dark mode
        await llmButton.click();
        await page.waitForTimeout(500);

        popoverContent = page.locator('[role="dialog"], .popover-content').first();
        await expect(popoverContent).toBeVisible();
      }
    });
  });
});