/**
 * GroupSpace Express Application Configuration
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Connect & initialize Neon PostgreSQL tables
const sql = require('./config/db.config');
if (sql && typeof sql.initDb === 'function') {
  sql.initDb();
}

// Feature Route Modules
const authRoutes = require('./modules/auth/auth.routes');
const groupRoutes = require('./modules/groups/group.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const notebookRoutes = require('./modules/notebook/notebook.routes');
const expenseRoutes = require('./modules/expenses/expense.routes');
const personalRoutes = require('./modules/personal-space/personal.routes');
const discussionRoutes = require('./modules/discussions/discussion.routes');

const app = express();

// Standard Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Frontend Assets from public/
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// API Feature Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/tasks', taskRoutes);
app.use('/api/groups/:groupId/notes', notebookRoutes);
app.use('/api/groups/:groupId/expenses', expenseRoutes);
app.use('/api/groups/:groupId/discussions', discussionRoutes);
app.use('/api/personal', personalRoutes);

// Health check endpoint with Neon database ping
app.get('/api/health', async (req, res) => {
  try {
    await sql`SELECT 1`;
    return res.json({
      status: 'online',
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'GroupSpace API'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
      service: 'GroupSpace API'
    });
  }
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GroupSpace Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

module.exports = app;
