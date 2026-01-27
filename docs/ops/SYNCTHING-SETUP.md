# Syncthing Setup for Multi-Computer Sync

This guide explains how to set up Syncthing to sync pi sessions from multiple computers (spokes) to a central machine (hub) where pi-brain runs.

## Overview

pi-brain uses a **hub/spoke** architecture:

- **Hub**: Your primary machine where the pi-brain daemon runs and analyzes sessions
- **Spokes**: Other machines (laptops, servers) that generate pi sessions and sync them to the hub

```
┌─────────────────┐       ┌─────────────────┐
│  Hub (Desktop)  │◀──────│  Spoke (Laptop) │
│                 │       │                 │
│  pi-brain       │       │  pi sessions    │
│  daemon         │       │  ~/.pi/agent/   │
│                 │       │    sessions/    │
└─────────────────┘       └─────────────────┘
        ▲
        │
        └─────────────────┐
                          │
┌─────────────────┐       │
│  Spoke (Server) │───────┘
│                 │
│  pi sessions    │
│  ~/.pi/agent/   │
│    sessions/    │
└─────────────────┘
```

## Why Syncthing?

Syncthing is the recommended sync method because:

- **Real-time sync**: Sessions sync as they're updated
- **Peer-to-peer**: No cloud service needed
- **End-to-end encrypted**: Secure without extra configuration
- **Cross-platform**: Works on Linux, macOS, and Windows
- **Automatic conflict resolution**: Handles simultaneous edits gracefully
- **Zero configuration after setup**: Just works once configured

## Prerequisites

- Syncthing installed on all machines (hub and spokes)
- Network connectivity between machines (LAN or internet)
- pi installed on spoke machines (where you run coding sessions)
- pi-brain installed on the hub

## Installation

### Linux

```bash
# Debian/Ubuntu
sudo apt install syncthing

# Arch Linux
sudo pacman -S syncthing

# Fedora
sudo dnf install syncthing

# Start Syncthing (user service)
systemctl --user enable syncthing
systemctl --user start syncthing
```

### macOS

```bash
# Using Homebrew
brew install syncthing

# Start Syncthing
brew services start syncthing
```

### All Platforms

Alternatively, download from [syncthing.net](https://syncthing.net/downloads/) and run manually:

```bash
syncthing
```

Access the web UI at `http://localhost:8384`.

## Hub Setup

The hub is where pi-brain runs. It receives sessions from spokes and processes them.

### 1. Create the Synced Sessions Directory

```bash
mkdir -p ~/.pi-brain/synced
```

### 2. Get the Hub's Device ID

Open Syncthing web UI at `http://localhost:8384` and copy your Device ID from:

**Actions → Show ID**

It looks like: `XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX-XXXXXXX`

### 3. Add Spoke Devices

For each spoke you want to sync from:

1. Click **Add Remote Device**
2. Paste the spoke's Device ID
3. Give it a name (e.g., "Laptop", "Server")
4. Click **Save**

## Spoke Setup

Each spoke shares its pi sessions folder with the hub.

### 1. Get the Spoke's Device ID

On the spoke machine, open Syncthing web UI and copy the Device ID.

### 2. Add the Hub Device

1. Click **Add Remote Device**
2. Paste the hub's Device ID
3. Give it a name (e.g., "Desktop-Hub")
4. Click **Save**

### 3. Share the Sessions Folder

1. Click **Add Folder**
2. Configure:
   - **Folder Label**: `pi-sessions` (or any name)
   - **Folder Path**: `~/.pi/agent/sessions`
   - **Folder ID**: Use something unique like `pi-sessions-laptop`
3. Click the **Sharing** tab
4. Check the box next to your hub device
5. Click **Save**

## Hub: Accept and Configure Shared Folders

When a spoke shares a folder, you'll see a notification on the hub.

### 1. Accept the Shared Folder

Click **Add** when prompted about the new folder share.

### 2. Configure the Folder

Set the folder path to a spoke-specific directory:

- **Folder Path**: `~/.pi-brain/synced/laptop` (replace `laptop` with the spoke name)
- **Folder Type**: **Receive Only** (important!)

The "Receive Only" setting prevents the hub from modifying synced sessions, which could cause sync conflicts.

### 3. Repeat for Each Spoke

Each spoke gets its own subdirectory:

```
~/.pi-brain/synced/
├── laptop/          ← Sessions from laptop
├── work-laptop/     ← Sessions from work laptop
└── server/          ← Sessions from server
```

## pi-brain Configuration

Update your pi-brain config to include the spokes:

```yaml
# ~/.pi-brain/config.yaml

hub:
  sessions_dir: ~/.pi/agent/sessions
  database_dir: ~/.pi-brain/data
  web_ui_port: 8765

spokes:
  - name: laptop
    sync_method: syncthing
    path: ~/.pi-brain/synced/laptop

  - name: work-laptop
    sync_method: syncthing
    path: ~/.pi-brain/synced/work-laptop

  - name: server
    sync_method: syncthing
    path: ~/.pi-brain/synced/server
```

The daemon will automatically watch these directories and process new sessions.

## Verifying the Setup

### 1. Check Syncthing Status

On both hub and spoke, the web UI should show:

- Devices as "Connected" (green)
- Folders as "Up to Date" (green)

### 2. Test with a New Session

On a spoke machine, run a pi session:

```bash
pi "echo test"
```

Within seconds, the session file should appear in the hub's synced folder:

```bash
ls ~/.pi-brain/synced/laptop/
```

### 3. Verify Daemon Detection

The pi-brain daemon should detect and process new synced sessions. Check the logs:

```bash
pi-brain daemon status
```

## Security Best Practices

### 1. Use Receive-Only on Hub

Always set synced folders to "Receive Only" on the hub. This prevents any changes on the hub from propagating back to spokes.

### 2. Enable Encryption

Syncthing encrypts all data in transit by default. For additional security:

1. Go to **Actions → Settings → Connections**
2. Ensure "Enable NAT traversal" is only used if needed
3. Consider using a dedicated Syncthing instance for pi-brain

### 3. Firewall Configuration

Syncthing uses these ports:

- **22000/TCP**: Sync protocol
- **22000/UDP**: Sync protocol (QUIC)
- **21027/UDP**: Discovery (optional, for LAN discovery)

If connecting over the internet, ensure only devices you trust can connect.

### 4. Device Authorization

Only add devices you control. Each device must be explicitly authorized on both ends.

## Troubleshooting

### Sessions Not Syncing

1. **Check device connection**: Both devices should show "Connected" in the UI
2. **Check folder status**: The folder should show "Up to Date" on both sides
3. **Check permissions**: Ensure Syncthing can read the sessions directory on the spoke
4. **Check disk space**: Ensure the hub has space for synced sessions

### Sync is Slow

1. **Check network**: Large session files may take time over slow connections
2. **Check for conflicts**: Resolve any conflict files (see below)
3. **Increase rescan interval**: In folder settings, increase "Rescan Interval" to reduce CPU usage (Syncthing also uses filesystem events for real-time sync)

### Conflict Files

If the same file is modified on multiple machines, Syncthing creates conflict files:

```
session.jsonl
session.sync-conflict-20260126-123456-ABCDEF.jsonl
```

For pi sessions, conflicts are rare because sessions are append-only. If they occur:

1. Check which version is more complete (more entries)
2. Keep the larger file, remove the conflict copy
3. Or keep both if they represent different work

### Folder Shows "Out of Sync"

Click on the folder and then **Rescan All** to force a resync.

### Can't Connect Devices

1. Ensure both devices are online
2. Try adding the Device ID manually (copy/paste exactly)
3. Check firewall settings on both machines
4. Use the **Introducer** feature if devices are on different networks

## Advanced Configuration

### Syncthing via Command Line

For headless servers, configure Syncthing via its REST API or config file:

```bash
# Location of Syncthing config
~/.config/syncthing/config.xml
```

### Ignoring Old Sessions

To reduce sync time for old sessions, create a `.stignore` file in the sessions directory on the spoke:

```bash
# On the spoke machine, create .stignore in the sessions directory
cat > ~/.pi/agent/sessions/.stignore << 'EOF'
// Ignore sessions older than 2024
2023*
2022*
EOF
```

Alternatively, use the Syncthing web UI:

1. Click on the shared folder → **Edit**
2. Click the **Ignore Patterns** button
3. Add the patterns and save

### Bandwidth Limiting

To limit bandwidth usage:

1. Go to **Actions → Settings**
2. Set **Incoming Rate Limit** and **Outgoing Rate Limit**

## Next Steps

Once Syncthing is configured:

1. **Start the daemon**: `pi-brain daemon start`
2. **View the dashboard**: Open `http://localhost:8765` in your browser
3. **Query across all sessions**: Use `/brain` to search sessions from all machines

The daemon will automatically process sessions from all configured spokes, populating the knowledge graph with insights from every computer you use.
