// Startup file for Plesk managed server
// This file serves as the entry point for the application

// Import required modules
const path = require('path');
require('dotenv').config();

// Load the main application
require('./src/app');

console.log('Application started via Plesk startup file'); 