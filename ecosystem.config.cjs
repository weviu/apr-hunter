const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "apr-hunter",
      cwd: __dirname,
      script: path.join(
        __dirname,
        "node_modules/next/dist/bin/next"
      ),
      args: "start",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
