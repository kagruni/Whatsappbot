// Super simple script to test basic Node.js functionality and file permissions
console.log('Permission test script started');

const fs = require('fs');
const path = require('path');
const os = require('os');

// Information to write to file
const info = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  hostname: os.hostname(),
  username: process.env.USER || process.env.USERNAME || 'unknown',
  currentDirectory: process.cwd(),
  env: process.env.NODE_ENV || 'not set',
  uid: process.getuid && process.getuid() || 'not available',
  gid: process.getgid && process.getgid() || 'not available'
};

// Create string to write
const output = Object.entries(info)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

console.log('\nSystem Information:');
console.log(output);

// Try writing to different locations
const locations = [
  'permission-test.log',               // Current directory 
  './logs/permission-test.log',        // logs subdirectory
  '../permission-test.log',            // Parent directory
  '/tmp/permission-test.log'           // System temp directory
];

console.log('\nTrying to write to multiple locations:');

locations.forEach(location => {
  try {
    fs.writeFileSync(location, output);
    console.log(`✅ Successfully wrote to ${location}`);
  } catch (error) {
    console.error(`❌ Failed to write to ${location}: ${error.message}`);
  }
});

console.log('\nPermission test complete'); 