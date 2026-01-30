# Runbooks

Operational procedures for pi-brain. Each runbook covers a specific scenario with step-by-step instructions.

## Index

### Incident Response
- [daemon-not-running.md](./daemon-not-running.md) - Daemon stopped or won't start
- [database-corruption.md](./database-corruption.md) - SQLite database issues
- [high-queue-backlog.md](./high-queue-backlog.md) - Analysis queue growing too large
- [api-unresponsive.md](./api-unresponsive.md) - API server not responding

### Maintenance
- [database-backup.md](./database-backup.md) - Backup and restore procedures
- [log-rotation.md](./log-rotation.md) - Managing log file size
- [upgrade-procedure.md](./upgrade-procedure.md) - Upgrading pi-brain versions

### Troubleshooting
- [sync-failures.md](./sync-failures.md) - Session sync from spokes failing
- [embedding-errors.md](./embedding-errors.md) - Vector embedding generation issues
- [slow-queries.md](./slow-queries.md) - Query performance problems

## Quick Reference

### Check System Health
```bash
pi-brain health
pi-brain daemon status
```

### View Logs
```bash
tail -f ~/.pi-brain/daemon.log
```

### Restart Daemon
```bash
pi-brain daemon stop
pi-brain daemon start
```

### Database Location
```
~/.pi-brain/brain.db
```
