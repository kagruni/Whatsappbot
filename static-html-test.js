// Ultra basic static HTML server for testing with Passenger
console.log('Static server starting at ' + new Date().toISOString());

const http = require('http');
const PORT = process.env.PORT || 3000;

// Simple static HTML that doesn't require any file access
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Static Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px; }
    h1 { color: #4CAF50; }
    .success { background: #E8F5E9; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Static Test Page</h1>
  <div class="success">
    <p>✅ This page is being served by a simple Node.js server!</p>
    <p>Time: ${new Date().toISOString()}</p>
    <p>Node.js Version: ${process.version}</p>
  </div>
</body>
</html>
`;

// Create server that just returns the static HTML
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(html);
});

// Start server
server.listen(PORT, () => {
  console.log(`Static server running on port ${PORT} at ${new Date().toISOString()}`);
}); 