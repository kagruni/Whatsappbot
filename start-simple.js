const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Load environment variables
require('dotenv').config();

// Simple middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// Main route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WhatsApp Bot Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #4CAF50; }
          .status { padding: 10px; background-color: #E8F5E9; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>WhatsApp Bot Server</h1>
        <div class="status">
          <p>Server is up and running!</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 