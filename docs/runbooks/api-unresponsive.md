# Runbook: API Server Unresponsive

## Symptoms

- Web UI won't load or shows connection errors
- `curl http://localhost:8765/api/v1/health` times out or fails
- CLI commands hang when querying

## Diagnosis

### 1. Check if API is listening

```bash
lsof -i :8765
netstat -tlnp | grep 8765
```

### 2. Check daemon status

```bash
pi-brain daemon status
```

### 3. Test API directly

```bash
curl -v http://localhost:8765/api/v1/health
```

### 4. Check logs

```bash
tail -50 ~/.pi-brain/daemon.log | grep -i "api\|server\|error"
```

## Resolution

### Scenario A: API not started

Daemon running but API not listening:

```bash
pi-brain daemon stop
pi-brain daemon start
```

### Scenario B: Port in use

```bash
# Find what's using the port
lsof -i :8765

# Kill conflicting process
kill <PID>

# Or change port in config
# ~/.pi-brain/config.yaml:
# api:
#   port: 8766
```

### Scenario C: Firewall blocking

```bash
# Check firewall (Linux)
sudo iptables -L -n | grep 8765

# Allow port if needed
sudo iptables -A INPUT -p tcp --dport 8765 -j ACCEPT
```

### Scenario D: Hung request blocking event loop

```bash
# Force restart
pi-brain daemon stop --force
pi-brain daemon start
```

### Scenario E: Memory exhaustion

```bash
free -h
ps aux --sort=-%mem | head -10

# If daemon using too much memory, restart
pi-brain daemon stop
pi-brain daemon start
```

### Scenario F: Database lock blocking API

```bash
# Check for database locks
fuser ~/.pi-brain/brain.db

# Release locks
pi-brain daemon stop
# Wait 5 seconds
pi-brain daemon start
```

## Testing API Endpoints

### Health check

```bash
curl http://localhost:8765/api/v1/health
```

### Query test

```bash
curl http://localhost:8765/api/v1/nodes?limit=1
```

### WebSocket test

```bash
websocat ws://localhost:8765/ws
```

## Verification

```bash
pi-brain daemon status
curl http://localhost:8765/api/v1/health
# Open http://localhost:5173 in browser
```
