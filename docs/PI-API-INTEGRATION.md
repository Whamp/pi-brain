# Pi API Integration Plan

## Overview

This document outlines the plan to properly integrate the dashboard extension with Pi's Extension API for navigation, forking, session switching, and summarization.

## Current State

The dashboard currently:
- ✅ Scans and displays all sessions globally
- ✅ Shows fork relationships between sessions  
- ✅ Extracts and displays topics
- ✅ Real-time updates via WebSocket
- ✅ Navigation from dashboard (via command proxying)
- ✅ Fork from dashboard (via command proxying)
- ✅ Session switching (via `/resume` command)
- ✅ Summarization (via `navigateTree` with `summarize: true`)

## Problem: Context Lifecycle

The core issue is that `ExtensionContext` methods like `navigateTree()`, `fork()`, and `newSession()` are only available in `ExtensionCommandContext` (command handlers), not in regular event handlers.

Current flow:
```
/dashboard command → startServer(ctx) → server stores ctx
                                      ↓
WebSocket command → onNavigate(id) → ctx.ui.notify() ← stale context?
```

The `ctx` passed to `startServer` is from the original `/dashboard` command. While we update `currentCtx` on events, the callbacks in `createServer` still close over the original `ctx`.

## Solution Architecture

### Option 1: Command Proxying (Recommended)

Keep WebSocket commands as "requests" that trigger Pi commands. The commands have proper `ExtensionCommandContext`.

```
Browser → WS: { type: "navigate", entryId: "abc" }
       ↓
Server → stores pending request
       ↓
Server → ctx.ui.notify("Use /dashboard-nav abc") 
         OR auto-inject via pi.sendUserMessage("/dashboard-nav abc")
       ↓
/dashboard-nav command handler → ctx.navigateTree(entryId)
       ↓
session_tree event → broadcastSessionState()
```

**Implementation:**

1. Use `pi.sendUserMessage()` to inject commands programmatically
2. Register `/dashboard-nav`, `/dashboard-fork`, `/dashboard-switch` commands  
3. WebSocket handlers call `pi.sendUserMessage("/dashboard-nav <id>")` instead of notifying

**Pros:**
- Clean separation of concerns
- Proper context for each action
- Works with Pi's event system

**Cons:**
- Messages appear in session (could use `deliverAs: "handled"` trick)
- Slight indirection

### Option 2: Event-Based Actions

Use `pi.events` bus to communicate between server and extension:

```
Browser → WS: { type: "navigate", entryId: "abc" }
       ↓
Server → pi.events.emit("dashboard:navigate", { entryId: "abc" })
       ↓
Extension listens → queues action for next command context
```

**Problem:** Still need a command context to execute `navigateTree()`.

### Option 3: RPC Bridge (Future)

If Pi exposes an RPC API, the dashboard could call it directly. Not currently available.

---

## Implementation Plan

### Phase 1: Fix Context Handling

**Goal:** Ensure callbacks use fresh context

**Files:** `extensions/dashboard/index.ts`, `extensions/dashboard/server.ts`

1. Move action callbacks outside `createServer`:
   ```typescript
   // index.ts
   let pendingActions: Array<{ type: string; data: any }> = [];
   
   function queueAction(action) {
     pendingActions.push(action);
   }
   
   // In createServer options:
   onNavigate: (entryId, summarize) => queueAction({ 
     type: "navigate", 
     entryId, 
     summarize 
   })
   ```

2. Process queued actions in command handlers:
   ```typescript
   pi.registerCommand("dashboard-process", {
     handler: async (args, ctx) => {
       while (pendingActions.length > 0) {
         const action = pendingActions.shift();
         if (action.type === "navigate") {
           await ctx.navigateTree(action.entryId, { summarize: action.summarize });
         }
         // ... other actions
       }
     }
   });
   ```

3. Auto-trigger processing via `pi.sendUserMessage()`:
   ```typescript
   // In server.ts onNavigate callback:
   pi.sendUserMessage("/dashboard-process", { deliverAs: "steer" });
   ```

### Phase 2: Navigation from Dashboard

**Goal:** Click node in browser → navigates in Pi

**Files:** 
- `extensions/dashboard/server.ts`
- `extensions/dashboard/index.ts`

1. Add `SummarizeCommand` type to server.ts:
   ```typescript
   export interface SummarizeCommand {
     type: "summarize";
     entryId: string;
     customInstructions?: string;
   }
   ```

2. Update `handleCommand` in server.ts to queue navigation:
   ```typescript
   case "navigate": {
     options.queueAction({ 
       type: "navigate", 
       entryId: command.entryId,
       summarize: command.summarize ?? false
     });
     ws.send(JSON.stringify({ type: "response", data: { queued: true } }));
     break;
   }
   ```

3. Create hidden `/dashboard-exec` command that processes queue:
   ```typescript
   pi.registerCommand("dashboard-exec", {
     description: "Internal: Execute dashboard actions",
     handler: async (args, ctx) => {
       const action = pendingActions.shift();
       if (!action) return;
       
       switch (action.type) {
         case "navigate":
           await ctx.navigateTree(action.entryId, { 
             summarize: action.summarize,
             customInstructions: action.customInstructions 
           });
           break;
         case "fork":
           await ctx.fork(action.entryId);
           break;
         case "switch":
           // Session switching is more complex...
           break;
       }
     }
   });
   ```

4. Auto-invoke after queueing:
   ```typescript
   // After queueAction:
   pi.sendUserMessage("/dashboard-exec", { deliverAs: "steer" });
   ```

### Phase 3: Fork from Dashboard

**Goal:** Click "Fork from here" → creates new session forked from that point

Same pattern as navigation:
1. WebSocket sends `{ type: "fork", entryId: "..." }`
2. Server queues action
3. Triggers `/dashboard-exec`
4. Command handler calls `ctx.fork(entryId)`
5. `session_fork` event broadcasts new state

### Phase 4: Session Switching

**Goal:** Click session in sidebar → switches to that session

This is more complex because:
- `ctx.newSession()` creates a *new* session
- There's no direct "switch to existing session" API
- `/resume` command exists but takes session path

**Options:**

A. **Use `/resume` directly:**
   ```typescript
   pi.sendUserMessage(`/resume ${sessionPath}`);
   ```
   
B. **Internal resume mechanism:**
   Need to check if Pi exposes session resume programmatically.

**For now:** Notify user with path, let them use `/resume`.

### Phase 5: Summarization

**Goal:** "Summarize this branch" button in dashboard

Pi's tree navigation already supports summarization via `{ summarize: true }`. For standalone summarization:

1. Add a `/dashboard-summarize` command:
   ```typescript
   pi.registerCommand("dashboard-summarize", {
     handler: async (args, ctx) => {
       const [entryId] = args.split(" ");
       
       // Use Pi's summarization (if exposed)
       // OR call LLM directly via ctx.model
       
       const entries = ctx.sessionManager.getEntries();
       const branch = getEntriesFromRoot(entries, entryId);
       const text = formatBranchForSummarization(branch);
       
       // Generate summary using current model
       // This requires access to the model API...
     }
   });
   ```

**Challenge:** Direct LLM access from extensions is limited. Options:
- Use `pi.sendUserMessage("Summarize the following branch: ...")` 
- Request Pi to expose a summarization utility

---

## API Gaps

Things we need that Pi doesn't currently expose:

| Need | Current State | Workaround |
|------|--------------|------------|
| Switch to existing session | Only `/resume` command | `sendUserMessage("/resume path")` |
| Direct LLM call from extension | Not exposed | Inject as user message |
| Get session by path | Not in API | Parse sessionManager entries |

---

## File Changes Summary

### `extensions/dashboard/index.ts`

```typescript
// Add action queue
let pendingActions: DashboardAction[] = [];

interface DashboardAction {
  type: "navigate" | "fork" | "switch" | "summarize";
  entryId?: string;
  sessionPath?: string;
  summarize?: boolean;
  customInstructions?: string;
}

// Update createServer to use queue
server = await createServer({
  ...
  onNavigate: (entryId, summarize) => {
    pendingActions.push({ type: "navigate", entryId, summarize });
    pi.sendUserMessage("/dashboard-exec");
  },
  onFork: (entryId) => {
    pendingActions.push({ type: "fork", entryId });
    pi.sendUserMessage("/dashboard-exec");
  },
  ...
});

// Add execution command
pi.registerCommand("dashboard-exec", {
  description: "Execute queued dashboard action",
  handler: async (args, ctx) => {
    const action = pendingActions.shift();
    if (!action) return;
    
    switch (action.type) {
      case "navigate":
        await ctx.navigateTree(action.entryId!, { 
          summarize: action.summarize 
        });
        ctx.ui.notify(`Navigated to ${action.entryId!.slice(0, 8)}...`, "success");
        break;
      case "fork":
        const result = await ctx.fork(action.entryId!);
        if (!result.cancelled) {
          ctx.ui.notify("Forked successfully", "success");
        }
        break;
      case "switch":
        // For now, just notify - full switch requires more work
        ctx.ui.notify(`Use /resume ${action.sessionPath}`, "info");
        break;
    }
  }
});
```

### `extensions/dashboard/server.ts`

```typescript
// Add to DashboardServerOptions
export interface DashboardServerOptions {
  ...
  queueAction?: (action: DashboardAction) => void;
}

// Update handleCommand
case "navigate": {
  options.queueAction?.({
    type: "navigate",
    entryId: command.entryId,
    summarize: command.summarize
  });
  ws.send(JSON.stringify({ type: "response", data: { queued: true } }));
  break;
}
```

---

## Testing Plan

1. **Navigation:**
   - Open dashboard
   - Click on a past user message node
   - Verify Pi navigates to that point
   - Verify dashboard updates with new leaf

2. **Forking:**
   - Click "Fork from here" on a node
   - Verify new session created
   - Verify fork relationship appears in session list

3. **Session switching:**
   - Click different session in sidebar
   - Verify notification shows `/resume` command
   - Verify manual `/resume` works

4. **Real-time updates:**
   - Send message in Pi
   - Verify dashboard shows new node immediately

---

## Timeline

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Context fix | 1-2 hours | High |
| Phase 2: Navigation | 2-3 hours | High |
| Phase 3: Forking | 1 hour | Medium |
| Phase 4: Session switching | 2-3 hours | Medium |
| Phase 5: Summarization | 3-4 hours | Low |

Total: ~10-12 hours

---

## Open Questions

1. Should navigation from dashboard require confirmation?
2. How to handle "navigation while streaming" - wait or interrupt?
3. Should session switching work across projects?
4. Do we want branch summarization as a separate feature or only during navigation?
