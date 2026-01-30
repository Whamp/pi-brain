# Runbook: Upgrade Procedure

## Pre-upgrade Checklist

- [ ] Check current version: `pi-brain --version`
- [ ] Read release notes for breaking changes
- [ ] Backup database (see [database-backup.md](./database-backup.md))
- [ ] Check disk space: `df -h`
- [ ] Schedule maintenance window if needed

## Standard Upgrade

### 1. Stop daemon
```bash
pi-brain daemon stop
```

### 2. Backup database
```bash
cp ~/.pi-brain/brain.db ~/.pi-brain/brain.db.pre-upgrade
```

### 3. Pull latest code
```bash
cd ~/projects/pi-brain
git fetch origin
git checkout main
git pull origin main
```

### 4. Install dependencies
```bash
npm install
```

### 5. Build
```bash
npm run build
```

### 6. Run migrations
Migrations run automatically on daemon start, but can be run manually:
```bash
pi-brain migrate
```

### 7. Start daemon
```bash
pi-brain daemon start
```

### 8. Verify
```bash
pi-brain --version
pi-brain health
pi-brain daemon status
```

## Upgrade with npm link

If using global CLI:
```bash
cd ~/projects/pi-brain
npm run build
npm link
```

## Rollback Procedure

If upgrade causes issues:

### 1. Stop daemon
```bash
pi-brain daemon stop
```

### 2. Restore previous version
```bash
cd ~/projects/pi-brain
git checkout <previous-tag>
npm install
npm run build
```

### 3. Restore database if needed
```bash
cp ~/.pi-brain/brain.db.pre-upgrade ~/.pi-brain/brain.db
```

### 4. Restart
```bash
pi-brain daemon start
```

## Major Version Upgrades

Major versions may have breaking changes. Extra steps:

### 1. Read migration guide
Check `docs/MIGRATION.md` for version-specific instructions.

### 2. Export data (optional)
```bash
pi-brain export --format json > ~/pi-brain-export.json
```

### 3. Test in isolation
```bash
# Use separate database for testing
PI_BRAIN_DB=~/.pi-brain/test.db pi-brain daemon start
```

### 4. Verify data integrity
```bash
pi-brain health --verbose
sqlite3 ~/.pi-brain/brain.db "PRAGMA integrity_check;"
```

## Upgrading Dependencies

### Check for updates
```bash
npm outdated
```

### Update specific package
```bash
npm update <package-name>
```

### Update all (careful)
```bash
npm update
npm run build
npm test
```

## Post-upgrade Tasks

### Rebuild embeddings (if embedding model changed)
```bash
pi-brain daemon rebuild-embeddings
```

### Rebuild search index (if schema changed)
```bash
pi-brain daemon rebuild-index
```

### Clear caches
```bash
rm -rf ~/.pi-brain/cache/*
```

## Verification Checklist

- [ ] `pi-brain --version` shows new version
- [ ] `pi-brain health` passes
- [ ] `pi-brain daemon status` shows running
- [ ] Web UI loads at http://localhost:5173
- [ ] Query test: `pi-brain query "test"`
- [ ] Check logs for errors: `tail ~/.pi-brain/daemon.log`
