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