# Troubleshooting Commands

Run these commands on the server to diagnose the issue:

## 1. Check logs

```bash
# Check Apache error logs
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/logs
cat error_log | tail -100

# Check application logs
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
ls -la logs/
cat logs/test-log.txt
cat logs/test-error.txt
```

## 2. Check Node.js version and environment

```bash
# Check Node.js version
node -v

# Check where Node.js is installed
which node

# Check memory
free -m

# Check disk space
df -h
```

## 3. Try running the server directly

```bash
# Run the test server directly
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
NODE_ENV=production node test.js
```

If this works but accessing via the web doesn't, it's likely a Passenger issue.

## 4. Check permissions

```bash
# Check file permissions
ls -la
ls -la test.js
ls -la logs/

# Fix permissions if needed
chmod -R 755 .
chmod 644 test.js
chmod -R 755 logs/
chown -R whatsappmotherfucker_gmxca9789oc:psaserv .
```

## 5. Check for Passenger logs

```bash
# Check if Passenger is running
passenger-status

# Check Passenger memory usage
passenger-memory-stats 
```

After running these diagnostics, if you find the test.js server works directly but not through Passenger, you can:

1. Ensure the Node.js path in .htaccess matches the actual Node.js installation
2. Verify Passenger is properly installed and configured
3. Try restarting the web server with `service apache2 restart` 