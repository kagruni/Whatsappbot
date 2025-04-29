# WhatsApp Bot Deployment Guide for Plesk

This document provides instructions for deploying this Next.js application on a Plesk server using PM2 and Apache as a reverse proxy.

## Prerequisites
- Node.js v18+ installed on the server
- Access to the server via SSH
- Ability to modify Apache configuration files
- PM2 installed globally

## Files
- `simple-server.js`: A simplified server to run the Next.js application
- `ecosystem.config.js`: PM2 configuration file

## Deployment Steps
1. Build the application locally
2. Push to the server (including these deployment files)
3. Configure and start the application on the server
4. Configure Apache as a reverse proxy

See the step-by-step instructions below for detailed commands. 