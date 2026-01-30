# Runbook: Log Rotation

## Overview
pi-brain logs can grow large over time. This runbook covers managing log file size.

## Log Locations

| Log | Location | Description |
|-----|----------|-------------|
| Daemon | `~/.pi-brain/daemon.log` | Main daemon operations |
| API | `~/.pi-brain/api.log` | HTTP/WebSocket requests |
| Analysis | `~/.pi-brain/analysis.log` | Session analysis details |

## Manual Rotation

### Quick cleanup
```bash
# Truncate current log (keeps file handle valid)
: > ~/.pi-brain/daemon.log

# Or rotate with timestamp
mv ~/.pi-brain/daemon.log ~/.pi-brain/daemon.log.$(date +%Y%m%d)
```

### Archive old logs
```bash
# Compress logs older than 1 day
find ~/.pi-brain -name "*.log.*" -mtime +1 -exec gzip {} \;

# Delete logs older than 30 days
find ~/.pi-brain -name "*.log.*.gz" -mtime +30 -delete
```

## Automated Rotation with logrotate

### Create config
```bash
sudo tee /etc/logrotate.d/pi-brain << 'EOF'
/home/*/.pi-brain/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644
    dateext
    dateformat -%Y%m%d
}
EOF
```

### Test configuration
```bash
sudo logrotate -d /etc/logrotate.d/pi-brain
```

### Force rotation
```bash
sudo logrotate -f /etc/logrotate.d/pi-brain
```

## Built-in Log Management

### Configure in config.yaml
```yaml
logging:
  level: info          # debug, info, warn, error
  max_size_mb: 100     # Rotate when file exceeds this
  max_files: 5         # Keep this many rotated files
  compress: true       # Gzip old logs
```

### Reduce log verbosity
For less disk usage:
```yaml
logging:
  level: warn  # Only warnings and errors
```

## Disk Space Recovery

### Check log sizes
```bash
du -sh ~/.pi-brain/*.log*
du -sh ~/.pi-brain/
```

### Emergency cleanup
```bash
# Clear all logs (daemon will recreate)
pi-brain daemon stop
rm ~/.pi-brain/*.log*
pi-brain daemon start
```

### Clean analysis details
```bash
# These can be regenerated
rm ~/.pi-brain/analysis-*.log
```

## Monitoring Log Size

### Add to crontab
```bash
crontab -e
```

Add:
```
0 * * * * [ $(du -sm ~/.pi-brain/daemon.log | cut -f1) -gt 500 ] && : > ~/.pi-brain/daemon.log
```

This truncates the log if it exceeds 500MB.

## Verification
```bash
ls -lh ~/.pi-brain/*.log*
df -h ~/.pi-brain
```
