// Startup file for Plesk managed server with Passenger
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Load environment variables
require('dotenv').config();

// Check if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production';

// Set the port Passenger expects 
const PORT = process.env.PORT || 3000;

// For Next.js apps in production, we need to use the built app
if (isProduction) {
  try {
    // Check if .next directory exists
    if (!fs.existsSync(path.join(__dirname, '.next'))) {
      console.log('Building Next.js application...');
      // Synchronously build the app if it's not built yet
      exec('npm run build', (error, stdout, stderr) => {
        if (error) {
          console.error(`Build error: ${error}`);
          return;
        }
        console.log(`Build output: ${stdout}`);
        startApp();
      });
    } else {
      startApp();
    }
  } catch (error) {
    console.error('Error checking or building Next.js app:', error);
  }
} else {
  // In development, use the main app.js Express server
  require('./src/app');
}

function startApp() {
  // For Next.js production deployment, we need to require the built server
  try {
    // Start the Next.js server
    const next = require('next');
    const app = next({ dev: false, dir: __dirname });
    const handle = app.getRequestHandler();
    
    const express = require('express');
    const server = express();
    
    app.prepare().then(() => {
      // Pass all requests to Next.js
      server.all('*', (req, res) => {
        return handle(req, res);
      });
      
      server.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${PORT}`);
      });
    });
  } catch (error) {
    console.error('Error starting Next.js server:', error);
    // Fallback to Express server if Next.js fails
    console.log('Falling back to Express server...');
    require('./src/app');
  }
}

console.log('Application startup script executed'); 