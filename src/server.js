/**
 * GroupSpace Application Entry Point & Port Listener
 */

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 GroupSpace Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🕒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
    console.error(`👉 Tip: Stop the conflicting process or set PORT=<new_port> in .env (e.g. PORT=3001)`);
  } else {
    console.error(`❌ Server error:`, err);
  }
});

module.exports = server;
