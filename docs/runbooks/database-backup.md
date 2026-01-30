# Runbook: Database Backup and Restore

## Overview

pi-brain stores all knowledge in `~/.pi-brain/brain.db`. Regular backups protect against data loss.

## Backup Procedures

### Manual Backup

```bash
# Stop daemon for consistent backup
pi-brain daemon stop

# Create timestamped backup
cp ~/.pi-brain/brain.db ~/.pi-brain/backups/brain-$(date +%Y%m%d-%H%M%S).db

# Restart daemon
pi-brain daemon start
```

### Online Backup (no downtime)

SQLite supports online backup:

```bash
sqlite3 ~/.pi-brain/brain.db ".backup ~/.pi-brain/backups/brain-$(date +%Y%m%d).db"
```

### Automated Backup Script

Create `~/.pi-brain/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/.pi-brain/backups"
mkdir -p "$BACKUP_DIR"

# Online backup
sqlite3 ~/.pi-brain/brain.db ".backup $BACKUP_DIR/brain-$(date +%Y%m%d).db"

# Keep only last 7 days
find "$BACKUP_DIR" -name "brain-*.db" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/brain-$(date +%Y%m%d).db"
```

Add to crontab:

```bash
crontab -e
# Add: 0 2 * * * ~/.pi-brain/backup.sh
```

## Restore Procedures

### Restore from Backup

```bash
# Stop daemon
pi-brain daemon stop

# Verify backup integrity
sqlite3 ~/.pi-brain/backups/brain-YYYYMMDD.db "PRAGMA integrity_check;"

# Replace current database
mv ~/.pi-brain/brain.db ~/.pi-brain/brain.db.old
cp ~/.pi-brain/backups/brain-YYYYMMDD.db ~/.pi-brain/brain.db

# Restart daemon
pi-brain daemon start

# Verify
pi-brain health
```

### Partial Restore (specific tables)

```bash
# Attach backup and copy specific data
sqlite3 ~/.pi-brain/brain.db <<EOF
ATTACH '~/.pi-brain/backups/brain-YYYYMMDD.db' AS backup;
INSERT OR REPLACE INTO insights SELECT * FROM backup.insights WHERE id = 'xxx';
DETACH backup;
EOF
```

## Verification

### Check backup integrity

```bash
sqlite3 ~/.pi-brain/backups/brain-YYYYMMDD.db "PRAGMA integrity_check;"
```

### Compare row counts

```bash
echo "Current:"
sqlite3 ~/.pi-brain/brain.db "SELECT 'nodes:', COUNT(*) FROM nodes UNION SELECT 'edges:', COUNT(*) FROM edges;"

echo "Backup:"
sqlite3 ~/.pi-brain/backups/brain-YYYYMMDD.db "SELECT 'nodes:', COUNT(*) FROM nodes UNION SELECT 'edges:', COUNT(*) FROM edges;"
```

## Storage Considerations

### Backup size

```bash
du -sh ~/.pi-brain/brain.db
du -sh ~/.pi-brain/backups/
```

### Compress old backups

```bash
gzip ~/.pi-brain/backups/brain-20240101.db
```

### Remote backup

```bash
rsync -av ~/.pi-brain/backups/ user@backup-server:/backups/pi-brain/
```
