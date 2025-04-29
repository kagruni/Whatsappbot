// Ultra simple diagnostic server
const http = require('http');
const fs = require('fs');
const path = require('path');

// Environment info
const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'not set';

// Create a simple server
const server = http.createServer((req, res) => {
  // Log request
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Basic routing
  if (req.url === '/health') {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage()
    }));
  } else if (req.url === '/diagnostics') {
    // System diagnostics
    let diagnostics = {
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: env,
        cwd: process.cwd(),
        memoryUsage: process.memoryUsage()
      },
      files: {}
    };
    
    // Check if critical files exist
    const filesToCheck = ['.env.local', '.env', 'package.json', 'node_modules/express'];
    filesToCheck.forEach(file => {
      try {
        const fullPath = path.join(process.cwd(), file);
        const exists = fs.existsSync(fullPath);
        const stat = exists ? fs.statSync(fullPath) : null;
        
        diagnostics.files[file] = {
          exists,
          isDirectory: stat ? stat.isDirectory() : null,
          size: stat ? stat.size : null,
          permissions: stat ? (stat.mode & parseInt('777', 8)).toString(8) : null
        };
      } catch (error) {
        diagnostics.files[file] = { error: error.message };
      }
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(diagnostics, null, 2));
  } else {
    // Default homepage
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>WhatsApp Server Diagnostics</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #4CAF50; }
            .info { background-color: #E8F5E9; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .links a { display: block; margin: 10px 0; padding: 10px; background: #f0f0f0; text-decoration: none; color: #333; border-radius: 5px; }
            .links a:hover { background: #e0e0e0; }
          </style>
        </head>
        <body>
          <h1>WhatsApp Server Diagnostics</h1>
          <div class="info">
            <p>Server is running!</p>
            <p>Node.js version: ${process.version}</p>
            <p>Environment: ${env}</p>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Current directory: ${process.cwd()}</p>
          </div>
          <div class="links">
            <a href="/health">Health Check</a>
            <a href="/diagnostics">System Diagnostics</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
  
  // Write error to a log file for persistence
  try {
    fs.appendFileSync(
      path.join(process.cwd(), 'server-error.log'),
      `${new Date().toISOString()} - Error: ${err.message}\n${err.stack}\n\n`
    );
  } catch (logError) {
    console.error('Failed to write to error log:', logError);
  }
});

// Start server
try {
  server.listen(PORT, () => {
    console.log(`Diagnostic server running on port ${PORT}`);
    console.log(`Environment: ${env}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Current directory: ${process.cwd()}`);
    
    // Write startup info to a log file
    try {
      fs.appendFileSync(
        path.join(process.cwd(), 'server-start.log'),
        `${new Date().toISOString()} - Server started\n` +
        `Environment: ${env}\n` +
        `Node.js version: ${process.version}\n` +
        `Current directory: ${process.cwd()}\n\n`
      );
    } catch (logError) {
      console.error('Failed to write startup log:', logError);
    }
  });
} catch (startupError) {
  console.error('Failed to start server:', startupError);
  
  // Write startup error to a log file
  try {
    fs.appendFileSync(
      path.join(process.cwd(), 'server-error.log'),
      `${new Date().toISOString()} - Startup Error: ${startupError.message}\n${startupError.stack}\n\n`
    );
  } catch (logError) {
    console.error('Failed to write to error log:', logError);
  }
} 