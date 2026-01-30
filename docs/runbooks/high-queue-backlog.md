# Runbook: High Queue Backlog

## Symptoms

- `pi-brain daemon status` shows large pending queue
- New sessions not being analyzed promptly
- Memory or CPU usage growing

## Diagnosis

### 1. Check queue status

```bash
pi-brain daemon queue
```

Output shows:

- Pending count
- Processing count
- Failed count
- Oldest pending job age

### 2. Check system resources

```bash
top -p $(pgrep -f daemon-process)
free -h
df -h ~/.pi-brain
```

### 3. Check for stuck jobs

```bash
pi-brain daemon queue --verbose
```

Look for jobs stuck in "processing" state for >30 minutes.

## Resolution

### Scenario A: Normal backlog (catching up)

If daemon is healthy and processing:

```bash
# Monitor progress
watch -n 10 'pi-brain daemon queue'
```

No action needed. Queue will drain.

### Scenario B: Processing stalled

```bash
# Restart daemon to reset stuck jobs
pi-brain daemon stop
pi-brain daemon start
```

### Scenario C: LLM API issues

Check logs for rate limits or API errors:

```bash
grep -i "rate limit\|429\|api error" ~/.pi-brain/daemon.log | tail -20
```

If rate limited:

- Wait for rate limit to clear
- Consider reducing analysis concurrency in config

### Scenario D: Large sessions causing timeout

```bash
# Find failed jobs
pi-brain daemon queue --failed

# Skip problematic sessions temporarily
pi-brain daemon skip <session-id>
```

### Scenario E: Disk full

```bash
df -h ~/.pi-brain
```

If disk full:

1. Clear old logs: `rm ~/.pi-brain/*.log.old`
2. Vacuum database: `sqlite3 ~/.pi-brain/brain.db "VACUUM;"`
3. Remove old backups if needed

### Scenario F: Clear and restart queue

Nuclear option - clears all pending jobs:

```bash
pi-brain daemon stop
pi-brain daemon clear-queue
pi-brain daemon start
```

## Tuning

### Reduce concurrency

Edit `~/.pi-brain/config.yaml`:

```yaml
daemon:
  max_concurrent_analyses: 1 # Default is 2
```

### Increase timeout

```yaml
daemon:
  analysis_timeout_minutes: 30 # Default is 15
```

## Verification

```bash
pi-brain daemon status
pi-brain daemon queue
```

Queue should show decreasing pending count.
