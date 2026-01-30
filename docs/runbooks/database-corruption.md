# Runbook: Database Corruption

## Symptoms

- `SQLITE_CORRUPT` errors in logs
- Queries returning unexpected results
- Daemon crashes on startup
- `pi-brain health` reports database errors

## Diagnosis

### 1. Run integrity check

```bash
sqlite3 ~/.pi-brain/brain.db "PRAGMA integrity_check;"
```

Expected: `ok`

### 2. Check database file

```bash
ls -la ~/.pi-brain/brain.db
file ~/.pi-brain/brain.db
```

### 3. Check for WAL issues

```bash
ls -la ~/.pi-brain/brain.db-wal
ls -la ~/.pi-brain/brain.db-shm
```

## Resolution

### Scenario A: Minor corruption (integrity check passes)

```bash
# Vacuum to rebuild
sqlite3 ~/.pi-brain/brain.db "VACUUM;"
```

### Scenario B: WAL checkpoint stuck

```bash
pi-brain daemon stop
sqlite3 ~/.pi-brain/brain.db "PRAGMA wal_checkpoint(TRUNCATE);"
pi-brain daemon start
```

### Scenario C: Recoverable corruption

```bash
pi-brain daemon stop

# Export what can be recovered
sqlite3 ~/.pi-brain/brain.db ".recover" | sqlite3 ~/.pi-brain/brain-recovered.db

# Verify recovered database
sqlite3 ~/.pi-brain/brain-recovered.db "PRAGMA integrity_check;"

# Replace if recovery successful
mv ~/.pi-brain/brain.db ~/.pi-brain/brain.db.corrupt
mv ~/.pi-brain/brain-recovered.db ~/.pi-brain/brain.db

pi-brain daemon start
```

### Scenario D: Full corruption - restore from backup

```bash
pi-brain daemon stop

# List backups
ls -la ~/.pi-brain/backups/

# Restore latest
cp ~/.pi-brain/backups/brain-YYYYMMDD.db ~/.pi-brain/brain.db

pi-brain daemon start
```

### Scenario E: No backup - rebuild from sessions

```bash
pi-brain daemon stop
mv ~/.pi-brain/brain.db ~/.pi-brain/brain.db.corrupt

# Start fresh - daemon will create new database
pi-brain daemon start

# Queue all sessions for reanalysis
pi-brain daemon analyze --all
```

## Prevention

- Enable automatic backups in config
- Use UPS or proper shutdown procedures
- Monitor disk health

## Verification

```bash
sqlite3 ~/.pi-brain/brain.db "PRAGMA integrity_check;"
pi-brain health
pi-brain daemon status
```
