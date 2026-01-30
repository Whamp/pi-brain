# Runbook: Session Sync Failures

## Symptoms

- Sessions from spoke machines not appearing
- `pi-brain sync status` shows errors
- Spoke sessions out of date

## Diagnosis

### 1. Check sync status

```bash
pi-brain sync status
```

Shows each spoke's:

- Last sync time
- Files synced
- Errors

### 2. Test SSH connectivity

```bash
# Test connection to spoke
ssh spoke-name "echo 'Connected'"
```

### 3. Check rsync manually

```bash
rsync -avzn spoke-name:~/.pi/agent/sessions/ ~/.pi-brain/sessions/spoke-name/ --stats
```

The `-n` flag does a dry run.

## Resolution

### Scenario A: SSH key issues

```bash
# Check SSH key exists
ls -la ~/.ssh/id_*

# Test specific key
ssh -i ~/.ssh/id_ed25519 spoke-name "echo 'OK'"

# Add key to agent
ssh-add ~/.ssh/id_ed25519
```

### Scenario B: SSH host key changed

If you see "Host key verification failed":

```bash
# Remove old host key
ssh-keygen -R spoke-name

# Reconnect to accept new key
ssh spoke-name "echo 'OK'"
```

### Scenario C: Spoke unreachable

```bash
# Check network
ping spoke-name

# Check DNS
nslookup spoke-name

# Try IP directly
ssh user@192.168.1.x
```

### Scenario D: rsync not installed on spoke

```bash
ssh spoke-name "which rsync"
# If missing, install on spoke:
# sudo apt install rsync
```

### Scenario E: Permission issues

```bash
# Check source directory on spoke
ssh spoke-name "ls -la ~/.pi/agent/sessions/"

# Check local destination
ls -la ~/.pi-brain/sessions/
```

### Scenario F: Disk space

```bash
# Check local disk
df -h ~/.pi-brain

# Check spoke disk
ssh spoke-name "df -h ~/.pi"
```

## Manual Sync

Force immediate sync:

```bash
pi-brain sync run spoke-name
```

Sync all spokes:

```bash
pi-brain sync run --all
```

## Configuration

Check spoke config in `~/.pi-brain/config.yaml`:

```yaml
sync:
  spokes:
    - name: laptop
      host: laptop.local
      user: will
      session_dir: ~/.pi/agent/sessions
      ssh_key: ~/.ssh/id_ed25519
    - name: desktop
      host: 192.168.1.50
      user: will
```

## Verification

```bash
pi-brain sync status
ls -la ~/.pi-brain/sessions/spoke-name/
```
