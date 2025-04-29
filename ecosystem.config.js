module.exports = {
  apps: [{
    name: "whatsappbot",
    script: "./simple-server.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3657
    }
  }]
} 