# Sync Protocol

Hub/spoke architecture for multi-computer session synchronization.

## Overview

pi-brain uses a hub/spoke model for multi-computer deployments:

- **Hub**: Primary computer where daemon runs and analysis happens
- **Spokes**: Secondary computers that generate sessions and sync to hub

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Hub (Desktop)                                       │
│                                                                               │
│   ┌─────────────────┐    ┌──────────────┐    ┌──────────────────────────────┐│
│   │ Local Sessions  │───▶│              │◀───│ Synced Sessions              ││
│   │ ~/.pi/agent/    │    │   Daemon     │    │ ~/.pi-brain/synced/          ││
│   │  sessions/      │    │              │    │ ├── laptop/                  ││
│   └─────────────────┘    └──────────────┘    │ └── server/                  ││
│                                              └──────────────────────────────┘│
│                                   ▲                                          │
└───────────────────────────────────│──────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Spoke (Laptop)  │  │  Spoke (Server)  │  │  Spoke (...)     │
    │                  │  │                  │  │                  │
    │  ~/.pi/agent/    │  │  ~/.pi/agent/    │  │  ~/.pi/agent/    │
    │   sessions/      │  │   sessions/      │  │   sessions/      │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Design Principles

1. **Sessions are append-only**: Never modify synced sessions on hub
2. **Analysis is centralized**: Only hub runs daemon and analysis
3. **Sync is one-way**: Spokes → Hub only
4. **Conflict resolution**: Latest timestamp wins (rarely needed)
5. **Offline-tolerant**: Spokes work offline, sync when connected

## Sync Methods

### Method 1: Syncthing (Recommended)

Real-time, peer-to-peer sync using Syncthing.

**Pros:**

- Real-time sync
- No manual configuration after setup
- Works over internet or LAN
- Encrypted, secure

**Cons:**

- Requires Syncthing installation on all machines
- Slightly more complex initial setup

**Setup:**

1. Install Syncthing on hub and all spokes
2. Share spoke's `~/.pi/agent/sessions/` folder with hub
3. Configure hub to receive into `~/.pi-brain/synced/<spoke-name>/`
4. Set folder to "receive only" on hub (prevent modifications)

**Hub Syncthing Config:**

```xml
<folder id="laptop-sessions" label="Laptop Sessions"
        path="~/.pi-brain/synced/laptop" type="receiveonly">
  <device id="LAPTOP-DEVICE-ID" />
</folder>
```

**pi-brain Config:**

```yaml
spokes:
  - name: laptop
    sync_method: syncthing
    path: ~/.pi-brain/synced/laptop
```

### Method 2: rsync

Periodic sync using rsync over SSH.

**Pros:**

- Simple, works everywhere
- Low resource usage
- Fine-grained control

**Cons:**

- Not real-time (requires scheduling)
- Requires SSH access

**Setup:**

1. Ensure SSH access from hub to spokes
2. Configure rsync in cron or systemd timer

**Cron Entry (hub):**

```bash
# Sync every 15 minutes
*/15 * * * * rsync -avz --delete \
  user@laptop:~/.pi/agent/sessions/ \
  ~/.pi-brain/synced/laptop/
```

**Systemd Timer:**

```ini
# ~/.config/systemd/user/pi-brain-sync.timer
[Unit]
Description=Sync pi sessions from spokes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

```ini
# ~/.config/systemd/user/pi-brain-sync.service
[Unit]
Description=Sync pi sessions from spokes

[Service]
Type=oneshot
ExecStart=/home/user/.pi-brain/scripts/sync-all.sh
```

**Sync Script:**

```bash
#!/bin/bash
# ~/.pi-brain/scripts/sync-all.sh

SYNC_DIR="$HOME/.pi-brain/synced"

# Laptop
rsync -avz --delete \
  user@laptop:~/.pi/agent/sessions/ \
  "$SYNC_DIR/laptop/"

# Server
rsync -avz --delete \
  user@server:~/.pi/agent/sessions/ \
  "$SYNC_DIR/server/"
```

**pi-brain Config:**

```yaml
spokes:
  - name: laptop
    sync_method: rsync
    source: user@laptop:~/.pi/agent/sessions/
    path: ~/.pi-brain/synced/laptop

  - name: server
    sync_method: rsync
    source: user@server:~/.pi/agent/sessions/
    path: ~/.pi-brain/synced/server
```

### Method 3: Manual Copy

Simple file copying for occasional sync.

**Pros:**

- No setup required
- Works with any transfer method

**Cons:**

- Manual effort
- Easy to forget

**Usage:**

```bash
# On spoke, copy to hub
scp -r ~/.pi/agent/sessions/* hub:~/.pi-brain/synced/laptop/

# Or use USB drive, cloud storage, etc.
```

### Method 4: API Sync (Future)

Direct API sync for machines that can't use file-based sync.

**Pros:**

- Works through firewalls
- Real-time possible
- Most flexible

**Cons:**

- More complex implementation
- Requires hub to be reachable

**Architecture:**

```
Spoke                              Hub
  │                                 │
  │  POST /api/v1/sync/sessions    │
  │────────────────────────────────>│
  │  { sessions: [...] }           │
  │                                 │
  │  200 OK                        │
  │<────────────────────────────────│
  │  { received: 5, new: 3 }       │
```

## Configuration

### Hub Configuration

```yaml
# ~/.pi-brain/config.yaml

hub:
  sessions_dir: ~/.pi/agent/sessions
  synced_sessions_dir: ~/.pi-brain/synced
  database_dir: ~/.pi-brain/data

spokes:
  - name: laptop
    sync_method: syncthing
    path: ~/.pi-brain/synced/laptop
    enabled: true

  - name: server
    sync_method: rsync
    source: user@server:~/.pi/agent/sessions/
    path: ~/.pi-brain/synced/server
    schedule: "*/15 * * * *"
    enabled: true

  - name: work-laptop
    sync_method: rsync
    source: user@work:~/.pi/agent/sessions/
    path: ~/.pi-brain/synced/work-laptop
    enabled: false # Disabled
```

### Spoke Identification

Each session includes the source computer in the `computer` field.

**Detection:**

```typescript
function getComputerName(): string {
  // Use hostname
  return os.hostname();
}

// Stored in node.source.computer
```

**Mapping Synced Paths:**

```typescript
function getComputerFromPath(sessionPath: string): string {
  const config = loadConfig();

  // Check if in synced directory
  for (const spoke of config.spokes) {
    if (sessionPath.startsWith(spoke.path)) {
      return spoke.name;
    }
  }

  // Local session
  return os.hostname();
}
```

## File Watching

The daemon watches both local and synced directories:

```typescript
class SyncedSessionWatcher {
  constructor(private config: DaemonConfig) {}

  getWatchPaths(): string[] {
    const paths = [this.config.hub.sessions_dir];

    for (const spoke of this.config.spokes) {
      if (spoke.enabled) {
        paths.push(spoke.path);
      }
    }

    return paths;
  }

  async start() {
    const watchPaths = this.getWatchPaths();

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: false,
      depth: 2,
      awaitWriteFinish: {
        stabilityThreshold: 5000, // Longer for network syncs
        pollInterval: 500,
      },
    });

    this.watcher
      .on("add", this.handleNewSession.bind(this))
      .on("change", this.handleSessionChange.bind(this));
  }

  private async handleNewSession(path: string) {
    if (!path.endsWith(".jsonl")) return;

    const computer = this.getComputerFromPath(path);
    console.log(`New session from ${computer}: ${path}`);

    this.emit("new-session", { path, computer });
  }
}
```

## Conflict Handling

### Session File Conflicts

Sessions are identified by their unique ID in the header. Conflicts are rare but possible.

**Resolution Strategy:**

```typescript
async function resolveSessionConflict(
  localSession: SessionInfo,
  syncedSession: SessionInfo
): Promise<SessionInfo> {
  // Sessions with same ID from different computers = keep both
  if (
    localSession.header.id === syncedSession.header.id &&
    localSession.computer !== syncedSession.computer
  ) {
    // Rename synced to include computer name
    const newPath = syncedSession.path.replace(
      ".jsonl",
      `-${syncedSession.computer}.jsonl`
    );
    await fs.rename(syncedSession.path, newPath);
    return { ...syncedSession, path: newPath };
  }

  // Same session, different content = take latest entry
  const localLast = getLastEntry(localSession);
  const syncedLast = getLastEntry(syncedSession);

  if (syncedLast.timestamp > localLast.timestamp) {
    return syncedSession;
  }

  return localSession;
}
```

### Node Conflicts

If the same session segment is analyzed on multiple machines (shouldn't happen normally):

```typescript
async function resolveNodeConflict(
  existingNode: Node,
  newNode: Node
): Promise<void> {
  // Keep both as versions
  newNode.version = existingNode.version + 1;
  newNode.previousVersions = [
    ...existingNode.previousVersions,
    `${existingNode.id}-v${existingNode.version}`,
  ];

  await storage.updateNode(newNode);
}
```

## Sync Status Monitoring

### Status API

```typescript
interface SyncStatus {
  spokes: SpokeStatus[];
  lastSync: Record<string, string>; // spoke -> ISO timestamp
  pendingSessions: number;
  errors: SyncError[];
}

interface SpokeStatus {
  name: string;
  method: string;
  enabled: boolean;
  connected: boolean;
  lastSeen: string;
  sessionsCount: number;
}

// API endpoint
app.get("/api/v1/sync/status", async (req, res) => {
  const status = await getSyncStatus();
  res.json({ status: "success", data: status });
});
```

### Dashboard Widget

```svelte
<!-- Sync Status Widget -->
<div class="sync-status">
  <h3>Connected Computers</h3>

  <div class="computers">
    <div class="computer local">
      <span class="indicator connected"></span>
      <span class="name">desktop (hub)</span>
      <span class="count">{localSessionCount} sessions</span>
    </div>

    {#each spokes as spoke}
      <div class="computer spoke">
        <span class="indicator" class:connected={spoke.connected}></span>
        <span class="name">{spoke.name}</span>
        <span class="count">{spoke.sessionsCount} sessions</span>
        <span class="last-sync">
          {spoke.connected ? 'synced' : formatRelative(spoke.lastSeen)}
        </span>
      </div>
    {/each}
  </div>
</div>
```

## Security Considerations

### SSH Key Management

For rsync method, use dedicated SSH keys:

```bash
# On hub, generate key for sync
ssh-keygen -t ed25519 -f ~/.ssh/pi-brain-sync -N ""

# On spoke, add to authorized_keys with restrictions
echo 'command="/home/user/.pi-brain/scripts/rsync-wrapper.sh",no-pty,no-agent-forwarding ssh-ed25519 AAA... pi-brain-sync' >> ~/.ssh/authorized_keys
```

**rsync Wrapper (spoke):**

```bash
#!/bin/bash
# Only allow rsync to sessions directory

if [[ "$SSH_ORIGINAL_COMMAND" =~ ^rsync.*--server.*~/.pi/agent/sessions ]]; then
  eval "$SSH_ORIGINAL_COMMAND"
else
  echo "Unauthorized command"
  exit 1
fi
```

### Syncthing Security

- Use strong folder passwords
- Enable "Ignore Permissions" for cross-platform sync
- Use receive-only mode on hub
- Consider separate Syncthing instances for pi-brain

### Network Considerations

For API sync (future):

- HTTPS required
- API key authentication
- Rate limiting
- IP allowlisting option

## Troubleshooting

### Common Issues

| Issue                  | Cause                           | Solution                     |
| ---------------------- | ------------------------------- | ---------------------------- |
| Sessions not syncing   | Syncthing paused                | Resume in Syncthing UI       |
| Duplicate sessions     | Same session on multiple spokes | Normal, will be deduplicated |
| Old sessions appearing | Full rsync sync                 | Expected on first sync       |
| High disk usage        | Many sessions                   | Configure retention policy   |

### Diagnostic Commands

```bash
# Check sync status
pi-brain sync status

# List synced sessions by spoke
pi-brain sync list --spoke laptop

# Force sync (rsync method)
pi-brain sync run --spoke laptop

# Verify sync integrity
pi-brain sync verify
```

### Log Messages

```
INFO  Sync: New session from laptop: .../2026-01-24...jsonl
INFO  Sync: Watching 3 directories
WARN  Sync: Spoke 'server' not seen for 2h
ERROR Sync: rsync failed for 'laptop': connection refused
```

## Performance Considerations

### Large Session Volumes

For machines with many sessions:

```yaml
# Limit initial sync depth
sync:
  initial_sync_days: 30 # Only sync last 30 days initially

  # Or exclude old sessions from watch
  exclude_patterns:
    - "*/2024/*" # Exclude old years
```

### Network Bandwidth

```yaml
# Rsync bandwidth limit
spokes:
  - name: laptop
    sync_method: rsync
    rsync_options:
      - "--bwlimit=1000" # 1 MB/s limit
```

### Incremental Updates

Both Syncthing and rsync are incremental by default. Only new/changed files are transferred.

## Migration

### Adding a New Spoke

1. Configure spoke in `config.yaml`
2. Set up sync method (Syncthing share or rsync)
3. Run initial sync: `pi-brain sync run --spoke new-laptop`
4. Daemon will detect and process new sessions

### Removing a Spoke

1. Disable in config: `enabled: false`
2. Optionally remove synced directory
3. Sessions already analyzed remain in database

### Changing Sync Method

1. Disable old method in config
2. Configure new method
3. Ensure directory paths match
4. Run verification: `pi-brain sync verify --spoke laptop`
