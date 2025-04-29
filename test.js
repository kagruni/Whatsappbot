// Minimal test file to verify Passenger + Node.js functionality
console.log('Test started at ' + new Date().toISOString());

const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a log directory if it doesn't exist
try {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
} catch (err) {
  console.error('Could not create logs directory:', err);
}

// Write to a log file
try {
  fs.appendFileSync(
    path.join(__dirname, 'logs', 'test-log.txt'),
    `Server started at ${new Date().toISOString()}\n`
  );
} catch (err) {
  console.error('Could not write to log file:', err);
}

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  const logMessage = `Request received: ${req.method} ${req.url} at ${new Date().toISOString()}\n`;
  console.log(logMessage);
  
  // Log the request
  try {
    fs.appendFileSync(
      path.join(__dirname, 'logs', 'test-log.txt'),
      logMessage
    );
  } catch (err) {
    console.error('Could not write to log file:', err);
  }
  
  // Send a simple HTML response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Node.js Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #4CAF50; }
          .info { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Node.js Test Server</h1>
        <div class="info">
          <p>✅ The server is working correctly!</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Node.js Version: ${process.version}</p>
          <p>Platform: ${process.platform}</p>
          <p>Architecture: ${process.arch}</p>
        </div>
      </body>
    </html>
  `);
});

// Note: Passenger will set the PORT environment variable
const PORT = process.env.PORT || 3000;

// Handle server errors
server.on('error', (err) => {
  const errorMessage = `Server error at ${new Date().toISOString()}: ${err.message}\n${err.stack}\n`;
  console.error(errorMessage);
  
  try {
    fs.appendFileSync(
      path.join(__dirname, 'logs', 'test-error.txt'),
      errorMessage
    );
  } catch (logErr) {
    console.error('Could not write to error log file:', logErr);
  }
});

// Start the server
server.listen(PORT, () => {
  const startMessage = `Server running on port ${PORT} at ${new Date().toISOString()}\n`;
  console.log(startMessage);
  
  try {
    fs.appendFileSync(
      path.join(__dirname, 'logs', 'test-log.txt'),
      startMessage
    );
  } catch (err) {
    console.error('Could not write to log file:', err);
  }
}); 