import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for the Settings UI (/settings)
 * Tests tab navigation, form editing, save behavior, and spokes CRUD.
 *
 * These tests use network request mocking to simulate backend responses.
 */

// Mock data for API responses
const mockDaemonConfig = {
  provider: "zai",
  model: "glm-4.7",
  idleTimeoutMinutes: 10,
  parallelWorkers: 1,
  maxRetries: 3,
  retryDelaySeconds: 60,
  analysisTimeoutMinutes: 10,
  maxConcurrentAnalysis: 1,
  maxQueueSize: 100,
  backfillLimit: 50,
  reanalysisLimit: 20,
  connectionDiscoveryLimit: 20,
  connectionDiscoveryLookbackDays: 7,
  connectionDiscoveryCooldownHours: 24,
  semanticSearchThreshold: 0.6,
  embeddingProvider: "ollama",
  embeddingModel: "nomic-embed-text",
  hasApiKey: false,
  embeddingBaseUrl: "",
  embeddingDimensions: null,
  reanalysisSchedule: "0 2 * * *",
  connectionDiscoverySchedule: "0 3 * * *",
  patternAggregationSchedule: "0 3 * * *",
  clusteringSchedule: "0 4 * * *",
  backfillEmbeddingsSchedule: "0 5 * * *",
  defaults: {
    reanalysisSchedule: "0 2 * * *",
    connectionDiscoverySchedule: "0 3 * * *",
    patternAggregationSchedule: "0 3 * * *",
    clusteringSchedule: "0 4 * * *",
    backfillEmbeddingsSchedule: "0 5 * * *",
  },
};

const mockProviders = {
  providers: [
    { id: "zai", name: "Zhipu AI", models: ["glm-4.7", "glm-4.6"] },
    {
      id: "anthropic",
      name: "Anthropic",
      models: ["claude-sonnet-4-20250514"],
    },
    { id: "openai", name: "OpenAI", models: ["gpt-4o"] },
  ],
};

const mockQueryConfig = {
  provider: "zai",
  model: "glm-4.7",
};

const mockApiConfig = {
  port: 8765,
  host: "localhost",
  corsOrigins: ["http://localhost:5173"],
};

const mockHubConfig = {
  sessionsDir: "~/.pi/agent/sessions",
  databaseDir: "~/.pi-brain/data",
  webUiPort: 8765,
};

const mockSpokes = {
  spokes: [
    {
      name: "laptop",
      syncMethod: "syncthing",
      path: "~/.pi-brain/spokes/laptop",
      enabled: true,
    },
    {
      name: "workstation",
      syncMethod: "rsync",
      path: "~/.pi-brain/spokes/workstation",
      source: "user@host:~/.pi/agent/sessions",
      schedule: "0 * * * *",
      enabled: false,
    },
  ],
};

// Setup mock routes for all tests
async function setupMocks(page: Page) {
  // Mock all the settings API endpoints
  await page.route("**/api/v1/config/daemon", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: mockDaemonConfig,
        }),
      });
    } else if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { ...mockDaemonConfig, ...body, message: "Settings saved" },
        }),
      });
    }
  });

  await page.route("**/api/v1/providers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: mockProviders }),
    });
  });

  await page.route("**/api/v1/config/query", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: mockQueryConfig }),
      });
    } else if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { ...mockQueryConfig, ...body },
        }),
      });
    }
  });

  await page.route("**/api/v1/config/api", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: mockApiConfig }),
      });
    } else if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: mockApiConfig,
          ...body,
        }),
      });
    }
  });

  await page.route("**/api/v1/config/hub", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: mockHubConfig }),
      });
    } else if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { ...mockHubConfig, ...body },
        }),
      });
    }
  });

  await page.route("**/api/v1/config/spokes", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: mockSpokes }),
      });
    } else if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { spoke: body },
        }),
      });
    }
  });

  await page.route("**/api/v1/config/spokes/*", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { spoke: body },
        }),
      });
    } else if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: { message: "Spoke deleted" },
        }),
      });
    }
  });
}

test.describe("Settings Page - Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings");
  });

  test("displays all tabs", async ({ page }) => {
    // Verify all tabs are visible
    await expect(page.getByRole("tab", { name: "Daemon" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Embeddings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Schedules" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Query" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "API Server" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Hub" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Spokes" })).toBeVisible();
  });

  test("defaults to Daemon tab", async ({ page }) => {
    const daemonTab = page.getByRole("tab", { name: "Daemon" });
    await expect(daemonTab).toHaveAttribute("aria-selected", "true");

    // Verify daemon content is visible
    await expect(page.getByText("Daemon Agent Model")).toBeVisible();
  });

  test("switches tabs on click", async ({ page }) => {
    // Click Embeddings tab
    await page.getByRole("tab", { name: "Embeddings" }).click();

    // Verify tab is now active
    await expect(page.getByRole("tab", { name: "Embeddings" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // Verify embeddings content is visible
    await expect(page.getByText("Embedding Configuration")).toBeVisible();
    await expect(page.getByLabel("Provider")).toBeVisible();
  });

  test("updates URL hash when switching tabs", async ({ page }) => {
    // Click Query tab
    await page.getByRole("tab", { name: "Query" }).click();

    // Verify URL has updated
    await expect(page).toHaveURL(/.*#query$/);
  });

  test("respects URL hash on page load", async ({ page }) => {
    // Navigate directly to a specific tab
    await page.goto("/settings#hub");

    // Verify the Hub tab is active
    await expect(page.getByRole("tab", { name: "Hub" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    // Verify Hub content is visible
    await expect(page.getByText("Hub Configuration")).toBeVisible();
  });

  test("supports keyboard navigation between tabs", async ({ page }) => {
    // Focus the first tab
    const daemonTab = page.getByRole("tab", { name: "Daemon" });
    await daemonTab.focus();
    await expect(daemonTab).toBeFocused();

    // Press ArrowRight to move to next tab
    await page.keyboard.press("ArrowRight");

    // Embeddings tab should now be selected (keyboard navigation activates the tab)
    await expect(page.getByRole("tab", { name: "Embeddings" })).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 2000 }
    );
  });
});

test.describe("Settings Page - Form Editing", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings");
  });

  test("loads and displays daemon config values", async ({ page }) => {
    // Check that the values from the mock are displayed
    await expect(page.locator("#idleTimeout")).toHaveValue("10");
    await expect(page.locator("#parallelWorkers")).toHaveValue("1");
    await expect(page.locator("#maxRetries")).toHaveValue("3");
  });

  test("save button is disabled when no changes", async ({ page }) => {
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await expect(saveButton).toBeDisabled();
  });

  test("save button enables when a field is changed", async ({ page }) => {
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await expect(saveButton).toBeDisabled();

    // Change a value
    await page.locator("#idleTimeout").fill("15");

    // Save button should now be enabled
    await expect(saveButton).toBeEnabled();
  });

  test("reset button restores original values", async ({ page }) => {
    const resetButton = page.getByRole("button", { name: "Reset" });
    const idleTimeout = page.locator("#idleTimeout");

    // Change a value
    await idleTimeout.fill("25");
    await expect(idleTimeout).toHaveValue("25");

    // Reset should be enabled now
    await expect(resetButton).toBeEnabled();

    // Click reset
    await resetButton.click();

    // Value should be restored
    await expect(idleTimeout).toHaveValue("10");
  });

  test("semantic search threshold slider works", async ({ page }) => {
    // Scroll to the semantic search section
    await page.locator("#semanticThreshold").scrollIntoViewIfNeeded();

    // Get the slider and verify initial value display
    const rangeValue = page.locator(".range-value");
    await expect(rangeValue).toHaveText("0.60");

    // Change the slider value
    await page.locator("#semanticThreshold").fill("0.8");

    // Verify the display updates
    await expect(rangeValue).toHaveText("0.80");
  });
});

test.describe("Settings Page - Save and Persist", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings");
  });

  test("saves changes when save button is clicked", async ({ page }) => {
    // Change a value
    await page.locator("#idleTimeout").fill("20");

    // Click save
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await saveButton.click();

    // Wait for save to complete - button should say "Saving..." briefly
    await expect(page.getByRole("button", { name: /Saving/ })).toBeVisible();

    // After save, button should be disabled again (no unsaved changes)
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // Toast notification should appear
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("shows toast notification after save", async ({ page }) => {
    // Change a value
    await page.locator("#parallelWorkers").fill("3");

    // Click save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Toast should appear with success message (may have different classes)
    await expect(page.locator(".toast")).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Settings Page - Embeddings Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings#embeddings");
  });

  test("displays embedding configuration", async ({ page }) => {
    await expect(page.getByText("Embedding Configuration")).toBeVisible();
    await expect(page.locator("#embeddingProvider")).toHaveValue("ollama");
    await expect(page.locator("#embeddingModel")).toHaveValue(
      "nomic-embed-text"
    );
  });

  test("shows API key field for non-Ollama providers", async ({ page }) => {
    // Initially Ollama - no API key field
    await expect(page.getByText("API Key")).not.toBeVisible();

    // Switch to OpenAI
    await page.locator("#embeddingProvider").selectOption("openai");

    // API Key field should now be visible
    await expect(page.getByText("API Key")).toBeVisible();
    await expect(page.getByText("Base URL")).toBeVisible();
    await expect(page.getByText("Dimensions")).toBeVisible();
  });

  test("hides API fields when switching back to Ollama", async ({ page }) => {
    // Switch to OpenAI first
    await page.locator("#embeddingProvider").selectOption("openai");
    await expect(page.getByText("API Key")).toBeVisible();

    // Switch back to Ollama
    await page.locator("#embeddingProvider").selectOption("ollama");

    // API key field should be hidden
    await expect(page.getByText("API Key")).not.toBeVisible();
  });
});

test.describe("Settings Page - Spokes Tab", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings#spokes");
  });

  test("displays spoke list", async ({ page }) => {
    await expect(page.getByText("Multi-Computer Sync")).toBeVisible();

    // Check for configured count (header shows "X configured")
    await expect(page.locator(".spoke-list-header")).toContainText(
      "configured"
    );

    // Verify spoke names are visible (use exact match to avoid matching paths)
    await expect(
      page.locator(".spoke-name", { hasText: "laptop" })
    ).toBeVisible();
    await expect(
      page.locator(".spoke-name", { hasText: "workstation" })
    ).toBeVisible();
  });

  test("shows correct status badges", async ({ page }) => {
    // laptop is enabled
    const laptopRow = page.locator(".spoke-item", { hasText: "laptop" });
    await expect(laptopRow.locator(".status-badge.enabled")).toBeVisible();

    // workstation is disabled
    const workstationRow = page.locator(".spoke-item", {
      hasText: "workstation",
    });
    await expect(
      workstationRow.locator(".status-badge.disabled")
    ).toBeVisible();
  });

  test("opens add spoke modal", async ({ page }) => {
    // Click Add Spoke button
    await page.getByRole("button", { name: "Add Spoke" }).click();

    // Modal should be visible
    await expect(page.getByRole("dialog", { name: "Add Spoke" })).toBeVisible();
    await expect(page.locator("#spoke-name")).toBeVisible();
    await expect(page.locator("#sync-method")).toBeVisible();
    await expect(page.locator("#spoke-path")).toBeVisible();
  });

  test("creates new spoke", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: "Add Spoke" }).click();

    // Fill in the form
    await page.locator("#spoke-name").fill("desktop");
    await page.locator("#spoke-path").fill("~/.pi-brain/spokes/desktop");

    // Submit
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Spoke" })
      .click();

    // Modal should close and toast should appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("validates required fields in add modal", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: "Add Spoke" }).click();

    // Try to submit without filling required fields
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Spoke" })
      .click();

    // Validation errors should appear
    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Path is required")).toBeVisible();
  });

  test("opens edit spoke modal", async ({ page }) => {
    // Click edit button on laptop spoke
    const laptopRow = page.locator(".spoke-item", { hasText: "laptop" });
    await laptopRow.getByRole("button", { name: "Edit spoke" }).click();

    // Modal should open with edit mode
    await expect(
      page.getByRole("dialog", { name: "Edit Spoke: laptop" })
    ).toBeVisible();

    // Name field should not be present (can't edit name)
    await expect(page.locator("#spoke-name")).not.toBeVisible();

    // Path should have existing value
    await expect(page.locator("#spoke-path")).toHaveValue(
      "~/.pi-brain/spokes/laptop"
    );
  });

  test("shows rsync fields when sync method is rsync", async ({ page }) => {
    // Open add modal
    await page.getByRole("button", { name: "Add Spoke" }).click();

    // Initially no source field (syncthing is default)
    await expect(page.locator("#spoke-source")).not.toBeVisible();

    // Change to rsync
    await page.locator("#sync-method").selectOption("rsync");

    // Source field should now be visible
    await expect(page.locator("#spoke-source")).toBeVisible();
    await expect(page.getByText("Sync Schedule")).toBeVisible();
  });

  test("opens delete confirmation dialog", async ({ page }) => {
    // Click delete button on laptop spoke
    const laptopRow = page.locator(".spoke-item", { hasText: "laptop" });
    await laptopRow.getByRole("button", { name: "Delete spoke" }).click();

    // Confirmation dialog should appear
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByText('Are you sure you want to delete the spoke "laptop"?')
    ).toBeVisible();
  });

  test("deletes spoke when confirmed", async ({ page }) => {
    // Click delete button
    const laptopRow = page.locator(".spoke-item", { hasText: "laptop" });
    await laptopRow.getByRole("button", { name: "Delete spoke" }).click();

    // Wait for confirmation dialog to be visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Confirm deletion using exact match for the Delete button in dialog
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Dialog should close and toast should appear
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("toggles spoke enabled state", async ({ page }) => {
    // Click disable button on laptop spoke (currently enabled)
    const laptopRow = page.locator(".spoke-item", { hasText: "laptop" });
    await laptopRow.getByRole("button", { name: "Disable spoke" }).click();

    // Toast should appear
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("closes modal on cancel", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: "Add Spoke" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Modal should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("closes modal on escape key", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: "Add Spoke" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click inside the modal to focus it (on the name input)
    await page.locator("#spoke-name").click();

    // Press escape
    await page.keyboard.press("Escape");

    // Modal should close (wait a moment for animation)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe("Settings Page - Other Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test("Query tab displays and edits correctly", async ({ page }) => {
    await page.goto("/settings#query");

    await expect(page.getByText("Query Configuration")).toBeVisible();
    await expect(page.locator("#queryProvider")).toBeVisible();
    await expect(page.locator("#queryModel")).toBeVisible();

    // Change provider
    await page.locator("#queryProvider").selectOption("anthropic");

    // Save should be enabled
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeEnabled();
  });

  test("API Server tab displays CORS origins", async ({ page }) => {
    await page.goto("/settings#api");

    await expect(page.getByText("API Server Configuration")).toBeVisible();
    await expect(page.locator("#apiPort")).toHaveValue("8765");
    await expect(page.locator("#apiHost")).toHaveValue("localhost");

    // CORS origins should be displayed
    await expect(page.getByText("CORS Origins")).toBeVisible();
  });

  test("Hub tab shows warning about path changes", async ({ page }) => {
    await page.goto("/settings#hub");

    await expect(page.getByText("Hub Configuration")).toBeVisible();

    // Warning box should be visible
    await expect(page.locator(".warning-box")).toBeVisible();
    await expect(
      page.getByText("Changing directory paths requires a daemon restart")
    ).toBeVisible();
  });

  test("Schedules tab displays cron inputs", async ({ page }) => {
    await page.goto("/settings#schedules");

    await expect(page.getByText("Background Task Schedules")).toBeVisible();
    await expect(page.getByText("Reanalysis")).toBeVisible();
    await expect(page.getByText("Connection Discovery")).toBeVisible();
    await expect(page.getByText("Pattern Aggregation")).toBeVisible();
    await expect(page.getByText("Clustering")).toBeVisible();
    await expect(page.getByText("Backfill Embeddings")).toBeVisible();
  });
});

test.describe("Settings Page - No save button on Spokes tab", () => {
  test("spokes tab does not show save/reset buttons", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings#spokes");

    // Verify we're on the spokes tab
    await expect(page.getByText("Multi-Computer Sync")).toBeVisible();

    // Save and Reset buttons should NOT be visible
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).not.toBeVisible();
  });

  test("other tabs show save/reset buttons", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/settings#daemon");

    // Save and Reset buttons should be visible (but disabled)
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();
  });
});
