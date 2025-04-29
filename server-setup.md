# Server Setup Guide

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Server Environment
NODE_ENV=production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WhatsApp API credentials
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_verify_token

# OpenAI (if used)
OPENAI_API_KEY=your_openai_api_key
```

## Troubleshooting Steps

### 1. Check Directory Permissions

```bash
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de
# Make sure owner is correct
chown -R whatsappmotherfucker_gmxca9789oc:psaserv Whatsappbot
# Set proper permissions
chmod -R 755 Whatsappbot
```

### 2. Check Node.js Installation

```bash
# Verify Node.js is installed and accessible
node -v
# Check where Node.js is installed
which node
```

If it's not at `/usr/bin/node`, update the path in `.htaccess`.

### 3. Check Server Logs

```bash
# Apache error logs
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/logs
cat error_log

# Application logs (created by our diagnostic script)
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
cat server-error.log
cat server-start.log
```

### 4. Test File Access and Environment

After the diagnostic server is running, visit these URLs:
- Main page: `http://whatsappmotherfucker.karelgrunert.de/`
- Health check: `http://whatsappmotherfucker.karelgrunert.de/health`
- System diagnostics: `http://whatsappmotherfucker.karelgrunert.de/diagnostics`

### 5. Restart Web Services

```bash
# Restart Apache
service apache2 restart
# or
systemctl restart apache2

# Check if Apache is running
systemctl status apache2
```

### 6. Check Passenger Configuration

```bash
# Check if Passenger is installed and running
passenger-status
passenger-memory-stats

# Check if Passenger can find Node.js
passenger-config about ruby-command
```

### 7. Manual Server Test

Try running the server directly to check for errors:

```bash
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
node start-simple.js
```

If it runs without errors, the issue is likely with how Passenger is starting the app.

## Directory Permissions

Make sure the application directory has the correct permissions:

```bash
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de
chown -R whatsappmotherfucker_gmxca9789oc:psaserv Whatsappbot
chmod -R 755 Whatsappbot
```

## Checking Logs

If you encounter errors, check the server logs:

```bash
cd /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/logs
cat error_log
```

## Restarting the Web Server

After making changes, restart the web server in Plesk or via command line:

```bash
service apache2 restart
# or
systemctl restart apache2
``` 