# rsync Setup for Multi-Computer Sync

This guide explains how to set up rsync to sync pi sessions from multiple computers (spokes) to a central machine (hub) where pi-brain runs.

## Overview

pi-brain uses a **hub/spoke** architecture:

- **Hub**: Your primary machine where the pi-brain daemon runs and analyzes sessions
- **Spokes**: Other machines (laptops, servers) that generate pi sessions and sync them to the hub

rsync is a simple, reliable method that works over SSH.

## Prerequisites

- rsync installed on both hub and spokes
- SSH access from hub to spokes (key-based authentication recommended)
- pi installed on spoke machines (where you run coding sessions)
- pi-brain installed on the hub

## Installation

### Linux

```bash
# Debian/Ubuntu
sudo apt install rsync

# Arch Linux
sudo pacman -S rsync

# Fedora
sudo dnf install rsync
```

### macOS

```bash
# rsync is pre-installed on macOS
# For a newer version:
brew install rsync
```

## Hub Setup

### 1. Create the Synced Sessions Directory

```bash
mkdir -p ~/.pi-brain/synced
```

### 2. Set Up SSH Key Access

For automated syncing, set up passwordless SSH access to your spokes:

```bash
# Generate a key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/pi-brain-sync -N ""

# Copy to each spoke
ssh-copy-id -i ~/.ssh/pi-brain-sync.pub user@laptop
ssh-copy-id -i ~/.ssh/pi-brain-sync.pub user@server
```

### 3. Test SSH Connectivity

```bash
# Test connection to each spoke
ssh -i ~/.ssh/pi-brain-sync user@laptop "ls ~/.pi/agent/sessions"
```

## Spoke Configuration

No additional setup needed on spokes beyond:

1. Having SSH server running
2. Having the SSH key authorized (done in hub setup)
3. pi sessions existing in `~/.pi/agent/sessions/`

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
    sync_method: rsync
    source: user@laptop:~/.pi/agent/sessions
    path: ~/.pi-brain/synced/laptop

  - name: server
    sync_method: rsync
    source: user@server:~/.pi/agent/sessions
    path: ~/.pi-brain/synced/server
```

### Configuration Fields

| Field         | Description                        |
| ------------- | ---------------------------------- |
| `name`        | Unique identifier for the spoke    |
| `sync_method` | Must be `rsync` for rsync sync     |
| `source`      | SSH source path (`user@host:path`) |
| `path`        | Local destination directory        |

## CLI Commands

### Check Sync Status

```bash
pi-brain sync status
```

Shows:

- Hub session count
- Configured spokes and their session counts
- Last sync time for each spoke
- rsync availability

### Run Sync

```bash
# Sync all rsync spokes
pi-brain sync run

# Sync specific spoke only
pi-brain sync run --spoke laptop

# Dry run (see what would be transferred)
pi-brain sync run --dry-run

# With bandwidth limit (KB/s)
pi-brain sync run --bwlimit 1000

# Delete files on hub that don't exist on spoke
pi-brain sync run --delete
```

### List Sessions

```bash
# List sessions from all spokes
pi-brain sync list

# List sessions from specific spoke
pi-brain sync list --spoke laptop

# Show full paths
pi-brain sync list --long
```

## Automated Syncing

### Option 1: Cron

Add to crontab (`crontab -e`):

```bash
# Sync every 15 minutes
*/15 * * * * /usr/local/bin/pi-brain sync run >> ~/.pi-brain/logs/sync.log 2>&1
```

### Option 2: Systemd Timer

Create the service file:

```ini
# ~/.config/systemd/user/pi-brain-sync.service
[Unit]
Description=Sync pi sessions from spokes

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pi-brain sync run
```

Create the timer file:

```ini
# ~/.config/systemd/user/pi-brain-sync.timer
[Unit]
Description=Sync pi sessions every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
systemctl --user enable --now pi-brain-sync.timer
```

## Security Best Practices

### 1. Use Dedicated SSH Keys

Use a dedicated key pair for pi-brain sync, separate from your regular SSH key:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pi-brain-sync -N "" -C "pi-brain sync"
```

### 2. Restrict SSH Key Permissions (Optional)

On the spoke, you can restrict the SSH key to only allow rsync:

```bash
# In ~/.ssh/authorized_keys on the spoke:
command="rrsync -ro ~/.pi/agent/sessions" ssh-ed25519 AAAA... pi-brain-sync
```

This requires the `rrsync` script (usually in `/usr/share/rsync/scripts/rrsync`).

### 3. Configure SSH for Custom Keys (Required)

pi-brain runs rsync without the `-e` option, so it uses your default SSH configuration.
**You must configure `~/.ssh/config`** to use your dedicated sync key:

```
# ~/.ssh/config
Host laptop-sync
    HostName laptop.local
    User will
    IdentityFile ~/.ssh/pi-brain-sync
    IdentitiesOnly yes
```

Then use `laptop-sync:~/.pi/agent/sessions` as the source in your config:

```yaml
spokes:
  - name: laptop
    sync_method: rsync
    source: laptop-sync:~/.pi/agent/sessions
    path: ~/.pi-brain/synced/laptop
```

> **Note**: If you use the default SSH key (`~/.ssh/id_ed25519` or `~/.ssh/id_rsa`),
> no SSH config entry is needed—rsync will find it automatically.

## Troubleshooting

### Connection Refused

- Ensure SSH server is running on the spoke: `sudo systemctl status sshd`
- Check firewall allows SSH: `sudo ufw status` or `sudo firewall-cmd --list-all`
- Verify hostname resolves: `ping laptop.local`

### Permission Denied

- Check SSH key is installed: `ssh -i ~/.ssh/pi-brain-sync user@laptop`
- Verify sessions directory exists: `ssh user@laptop ls ~/.pi/agent/sessions`
- Check file permissions on spoke

### Host Key Verification Failed

- Add spoke to known_hosts: `ssh-keyscan laptop >> ~/.ssh/known_hosts`
- Or connect manually once: `ssh user@laptop`

### Sync is Slow

- Use bandwidth limiting: `pi-brain sync run --bwlimit 5000`
- Check network connection quality
- Consider using compression (enabled by default with `-z`)

### Sessions Not Appearing in pi-brain

1. Verify sync completed: `pi-brain sync status`
2. Check daemon is watching synced directory: `pi-brain daemon status`
3. Check daemon logs: `tail -f ~/.pi-brain/logs/daemon.log`

## Comparison: rsync vs Syncthing

| Feature           | rsync                          | Syncthing                   |
| ----------------- | ------------------------------ | --------------------------- |
| Setup complexity  | Lower                          | Higher                      |
| Real-time sync    | No (scheduled)                 | Yes                         |
| Resource usage    | Low (only during sync)         | Continuous                  |
| Network traversal | Requires SSH                   | P2P, works through NAT      |
| Conflict handling | Manual                         | Automatic                   |
| Best for          | Occasional sync, low resources | Real-time, multiple devices |

Choose rsync if:

- You want simple, script-able syncing
- Spokes are always accessible via SSH
- You don't need real-time updates
- You want minimal resource usage

Choose Syncthing if:

- You want real-time session sync
- Spokes may not always be reachable
- You prefer a GUI for management
- You're syncing between many devices

See [SYNCTHING-SETUP.md](SYNCTHING-SETUP.md) for Syncthing configuration.
