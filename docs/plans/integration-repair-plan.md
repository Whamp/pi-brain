# Integration Repair Plan: Web UI ↔ Backend Connection

This document outlines the steps required to fix the critical integration issues preventing the pi-brain web UI from functioning. These issues were identified through systematic exploration of the running application.

## 1. Problem Summary

The SvelteKit frontend successfully loads but displays errors on every page because:

1. The backend daemon (`pi-brain daemon`) crashes before the API server becomes stable.
2. Build assets (SQL migrations) are missing from the `dist/` folder.
3. The worker is not initialized before being started.
4. Environment validation requires skills that may not be present.
5. Frontend error handling doesn't gracefully handle API failures.

**Result**: The app is a non-functional shell with no data flow.

---

## 2. Tasks

### 2.1. Fix Build Pipeline for Migrations

**Context**: The daemon crashes with `ENOENT: no such file or directory, scandir '.../dist/migrations'` because `tsup` does not copy non-TS assets.

**Steps**:

1. **Update `package.json` build script**:
   - Add a post-build step to copy migrations:

   ```json
   "scripts": {
     "build": "tsup ... && npm run copy-assets",
     "copy-assets": "cp -r src/storage/migrations dist/"
   }
   ```

2. **Alternative: Use `tsup` `onSuccess` hook**:
   - Modify `tsup.config.ts` (if created) to use:

   ```ts
   export default defineConfig({
     onSuccess: "cp -r src/storage/migrations dist/",
   });
   ```

3. **Verification**:
   - Run `npm run build`.
   - Confirm `dist/migrations/*.sql` files exist.
   - Run `node dist/src/daemon/daemon-process.js` and verify no `ENOENT` error.

---

### 2.2. Fix Worker Initialization in Daemon Process

**Context**: The daemon crashes with `Worker not initialized. Call initialize() first.` because `worker.initialize(db)` is never called.

**File**: `src/daemon/daemon-process.ts`

**Steps**:

1. **Add initialization call after worker creation**:

   ```diff
     const worker = createWorker({
       id: "worker-1",
       config,
       logger: { ... },
     });
     console.log("[daemon] Worker created");

   + worker.initialize(db);
   + console.log("[daemon] Worker initialized");

     // Create scheduler...
   ```

2. **Verification**:
   - Rebuild with `npm run build`.
   - Start daemon: `node dist/src/daemon/daemon-process.js`.
   - Confirm no "Worker not initialized" error.

---

### 2.3. Make Environment Validation Non-Fatal or Configurable

**Context**: The worker's `validateEnvironment()` checks for required skills (e.g., `rlm`) and throws if missing. This crashes the entire daemon even when the API server would otherwise function.

**File**: `src/daemon/processor.ts` (or wherever `validateRequiredSkills` is defined)

**Options** (choose one):

#### Option A: Warn Instead of Crash

1. Change `validateRequiredSkills` to log a warning and return a status object instead of throwing:

   ```ts
   export async function validateRequiredSkills(): Promise<{
     valid: boolean;
     missing: string[];
   }> {
     const missing = REQUIRED_SKILLS.filter(
       (skill) => !existsSync(join(SKILLS_DIR, skill))
     );
     if (missing.length > 0) {
       console.warn(
         `[processor] Missing skills: ${missing.join(", ")}. Analysis will be disabled.`
       );
       return { valid: false, missing };
     }
     return { valid: true, missing: [] };
   }
   ```

2. Update `Worker.start()` to check the result and skip job processing if invalid:
   ```ts
   const envStatus = await this.processor.validateEnvironment();
   if (!envStatus.valid) {
     this.logger.warn("Environment validation failed. Worker will idle.");
     this.running = false;
     return;
   }
   ```

#### Option B: Make Skills Configurable

1. Add a `daemon.requiredSkills` array to the config schema.
2. Allow users to specify which skills are required (or empty to skip validation).

**Verification**:

- Remove or rename `~/skills/rlm` temporarily.
- Start daemon.
- Confirm API server starts and is reachable even if worker logs a warning.

---

### 2.4. Frontend: Graceful API Failure Handling

**Context**: When the API returns a 404 HTML page, the frontend tries to parse it as JSON and shows `Unexpected token '<'` errors.

**Files**: `src/web/app/src/lib/api.ts` (or equivalent fetch wrapper)

**Steps**:

1. **Wrap fetch calls with content-type checking**:

   ```ts
   async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
     const response = await fetch(url, options);

     const contentType = response.headers.get("content-type") || "";
     if (!contentType.includes("application/json")) {
       throw new Error(`API returned non-JSON response (${response.status})`);
     }

     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.message || `Request failed: ${response.status}`);
     }

     return response.json();
   }
   ```

2. **Update error display components**:
   - Show "API server is offline" or "Backend not running" when fetch fails with network error or non-JSON response.
   - Consider adding a global "API Status" indicator in the sidebar.

3. **Verification**:
   - Stop the daemon.
   - Refresh the web UI.
   - Confirm user-friendly error messages instead of JSON parsing errors.

---

### 2.5. Configure Vite Proxy for Development

**Context**: In development, the SvelteKit app runs on `:5173` but the API runs on `:8765`. The frontend's `/api/v1/*` requests return 404 from Vite.

**File**: `src/web/app/vite.config.ts`

**Steps**:

1. **Add API proxy configuration**:

   ```ts
   import { sveltekit } from "@sveltejs/kit/vite";
   import { defineConfig } from "vite";

   export default defineConfig({
     plugins: [sveltekit()],
     server: {
       proxy: {
         "/api": {
           target: "http://127.0.0.1:8765",
           changeOrigin: true,
         },
       },
     },
   });
   ```

2. **Verification**:
   - Start daemon: `node dist/src/daemon/daemon-process.js`.
   - Start web dev server: `npm run web:dev`.
   - Open `http://localhost:5173/`.
   - Confirm Dashboard loads data (or shows "No data" instead of errors).

---

### 2.6. Ensure RLM Skill is Properly Installed

**Context**: The `rlm` skill directory exists but may be incomplete (only contains `README.md`).

**Steps**:

1. **Investigate the expected structure**:
   - Check `src/daemon/processor.ts` for what files the skill must contain.
   - Likely needs a `SKILL.md` with frontmatter.

2. **Install or create the skill**:
   - If `rlm` is a pi-brain internal skill, create it in `skills/rlm/SKILL.md`.
   - If it's external, document the installation steps.

3. **Verification**:
   - Confirm `~/skills/rlm/SKILL.md` exists.
   - Start daemon without validation warnings.

---

## 3. Implementation Order

| Priority | Task                                 | Effort |              Blocking              |
| :------: | :----------------------------------- | :----: | :--------------------------------: |
|    1     | 2.1 Fix Build Pipeline               |  Low   |      All daemon functionality      |
|    2     | 2.2 Fix Worker Initialization        |  Low   |      All daemon functionality      |
|    3     | 2.5 Configure Vite Proxy             |  Low   | All frontend-backend communication |
|    4     | 2.3 Non-Fatal Environment Validation | Medium |        Graceful degradation        |
|    5     | 2.6 RLM Skill Installation           |  Low   |           Analysis jobs            |
|    6     | 2.4 Frontend Error Handling          | Medium |          User experience           |

**Total Estimated Effort**: ~0.5 - 1 day

---

## 4. Verification Checklist

After completing all tasks, verify the following:

- [ ] `npm run build` succeeds and `dist/migrations/` contains SQL files.
- [ ] `node dist/src/daemon/daemon-process.js` starts without crashing.
- [ ] `curl http://localhost:8765/health` returns `{"status":"ok",...}`.
- [ ] `npm run web:dev` starts the frontend.
- [ ] Dashboard page loads stats or shows "No data yet" (not error).
- [ ] Graph page shows empty state or nodes (not JSON parsing error).
- [ ] Sessions page shows projects list or empty state.
- [ ] Settings page loads configuration values.
- [ ] Sidebar shows "Daemon running" status indicator.

---

## 5. Future Improvements

Once the integration is repaired, consider:

1. **Health check polling**: Frontend periodically checks `/health` and updates status indicator.
2. **WebSocket connection**: Use the already-registered WebSocket plugin for real-time updates.
3. **Startup script**: Create `npm run start` that launches both daemon and web server.
4. **Docker Compose**: For production, bundle daemon + web UI with proper networking.
