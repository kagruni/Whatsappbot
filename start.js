// Next.js startup file for Plesk/Passenger deployment
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Set production mode
const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

// Log startup information
console.log(`Starting Next.js server in ${dev ? 'development' : 'production'} mode`);
console.log(`Current directory: ${process.cwd()}`);

// Check if .next directory exists (built app)
if (!dev && !fs.existsSync(path.join(process.cwd(), '.next'))) {
  console.error('Error: .next directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Initialize Next.js
const app = next({ dev });
const handle = app.getRequestHandler();

// Prepare and start server
app.prepare()
  .then(() => {
    createServer((req, res) => {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      
      // Let Next.js handle the request
      handle(req, res, parsedUrl);
    })
    .listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Error starting Next.js server:', err);
    process.exit(1);
  }); 