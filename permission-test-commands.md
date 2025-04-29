# Permission Testing Commands

## 1. Fix ownership of logs directory

```bash
# Create logs directory with proper permissions
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
mkdir -p logs
chown -R www-data:www-data logs
chmod 777 logs  # temporary for testing
```

## 2. Run the permission test script directly

```bash
# Run the script directly to see console output and any errors
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
node permissions-test.js
```

## 3. Check for log files in all possible locations

```bash
# Check if any log files were created
ls -la permission-test.log
ls -la logs/permission-test.log
ls -la ../permission-test.log
ls -la /tmp/permission-test.log
```

## 4. Check Apache/Passenger logs

```bash
# Check Apache error log
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/logs
cat error_log | tail -200

# Check Passenger application logs (if available)
cd /var/log/passenger
ls -la

# Check system logs for any Node.js or Passenger errors
journalctl -u apache2 --since "1 hour ago"
```

## 5. Determine Passenger process user

```bash
# This will show which user Passenger is running as
passenger-status
ps aux | grep passenger

# Check if Passenger can find Node.js
passenger-config about ruby-command
```

## 6. Final permissions fix after testing

```bash
# After determining the correct user, set proper permissions
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
chown -R [correct-user]:[correct-group] logs
chmod 755 logs
chmod 644 logs/*
``` 