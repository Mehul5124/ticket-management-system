require('dotenv/config');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./src/routes/auth');
const ticketRoutes = require('./src/routes/tickets');
const agentRoutes = require('./src/routes/agents');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/agents', agentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Helpdesk API is running.' });
});

// Root route — shows available endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Helpdesk API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET  /api/health',
      login: 'POST /api/auth/login',
      logout: 'POST /api/auth/logout',
      me: 'GET  /api/auth/me',
      tickets: 'GET  /api/tickets',
      agents: 'GET  /api/agents',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Helpdesk API running at http://localhost:${PORT}`);
});
