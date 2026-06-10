module.exports = {
  apps: [
    {
      name: 'hs-api',
      script: 'node',
      args: '--env-file=/var/www/hs-muebles/.env ./server/index.js',
      cwd: '/var/www/hs-muebles',
      instances: 1,
      exec_mode: 'fork',
      out_file: '/var/log/hs-api/out.log',
      error_file: '/var/log/hs-api/err.log',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
