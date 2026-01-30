# Runbook: Daemon Not Running

## Symptoms
- `pi-brain daemon status` shows "not running"
- No new sessions being analyzed
- Web UI shows stale data
- `pi-brain health` reports daemon offline

## Diagnosis

### 1. Check daemon status
```bash
pi-brain daemon status
```

Expected output when running:
```
Daemon: running (PID 12345)
Uptime: 2h 15m
Queue: 3 pending, 0 processing
```

### 2. Check for process
```bash
pgrep -f "daemon-process"
ps aux | grep pi-brain
```

### 3. Check logs
```bash
tail -100 ~/.pi-brain/daemon.log
```

Look for:
- Crash messages
- Uncaught exceptions
- Memory errors

## Resolution

### Scenario A: Clean restart needed
```bash
pi-brain daemon stop
pi-brain daemon start
```

### Scenario B: Stale PID file
If `daemon status` shows running but process doesn't exist:
```bash
rm ~/.pi-brain/daemon.pid
pi-brain daemon start
```

### Scenario C: Port conflict
If API port (8765) is in use:
```bash
lsof -i :8765
# Kill conflicting process or change port in config
```

### Scenario D: Database locked
```bash
# Check for stuck processes
fuser ~/.pi-brain/brain.db

# If stuck, kill and restart
pi-brain daemon stop --force
pi-brain daemon start
```

### Scenario E: Out of memory
Check system memory:
```bash
free -h
```

If memory exhausted:
1. Restart daemon with lower concurrency
2. Check for memory leaks in logs
3. Consider increasing system memory

## Verification
```bash
pi-brain daemon status
pi-brain health
```

## Escalation
If daemon repeatedly crashes:
1. Collect logs: `cp ~/.pi-brain/daemon.log ~/daemon-crash-$(date +%Y%m%d).log`
2. Check for patterns in crash timing
3. Open issue with logs attached
