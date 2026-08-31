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

module.exports = server;
