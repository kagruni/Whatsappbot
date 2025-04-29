# Plesk and Passenger Check Guide

## 1. Check if Passenger is installed on the system

```bash
# Check for Passenger installation
passenger -v
# or
passenger-config --version

# Check which Passenger modules are installed
dpkg -l | grep passenger
```

## 2. Check Plesk configuration for Node.js support

```bash
# Check if Node.js support is enabled in Plesk
plesk bin node_js --info

# Get Node.js enabled status for the domain
plesk bin domain --info whatsappmotherfucker.karelgrunert.de | grep node_js
```

## 3. Enable Node.js support in Plesk if needed

```bash
# Enable Node.js support for the domain
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -node_js true

# Set application root (if needed)
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -document_root /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
```

## 4. Configure static file serving through Plesk

If Passenger isn't working, you could try a different approach by serving a static HTML file first:

```bash
# Create a simple html file
cat > /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot/index.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
  <title>Static Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px; }
    h1 { color: #4CAF50; }
  </style>
</head>
<body>
  <h1>Static Test Page</h1>
  <p>This is a static HTML file being served directly by the web server.</p>
  <p>Time: $(date)</p>
</body>
</html>
EOL

# Update document root if needed
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -document_root /var/www/vhosts/whatsappmotherfucker.karelgrunert.de/Whatsappbot
```

## 5. Use the native Node.js support in Plesk

Plesk may use a different approach than Passenger for Node.js applications. Try configuring a direct Node.js application:

```bash
# Set application mode
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -php_handler_type node.js

# Set Node.js version
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -node_js_version 18

# Set startup file
plesk bin domain --update whatsappmotherfucker.karelgrunert.de -node_js_startup_file static-html-test.js
```

## 6. Check Apache configuration

```bash
# Check if the domain's Apache config has Passenger directives
cat /var/www/vhosts/conf/web/whatsappmotherfucker.karelgrunert.de.conf

# Check Apache modules
apache2ctl -M | grep passenger
```

## 7. Restart services

```bash
# Restart Apache
service apache2 restart

# Restart Plesk services
plesk sbin httpdmng --reconfigure-all
``` 