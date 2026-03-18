const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const workflowRoutes = require('./routes/workflows');
const stepRoutes = require('./routes/steps');
const ruleRoutes = require('./routes/rules');
const executionRoutes = require('./routes/executions');

const app = express();

app.use(cors());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());

app.use('/api/workflows', workflowRoutes);
app.use('/api', stepRoutes);
app.use('/api', ruleRoutes);
app.use('/api', executionRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not set in .env'); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    // Try to start the server; if the port is already in use, try the next one.
    const maxPortRetries = 5;
    const startServer = (port, attempt = 1) => {
      const server = app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
      server.on('error', err => {
        if (err.code === 'EADDRINUSE' && attempt < maxPortRetries) {
          console.warn(`⚠️  Port ${port} is in use; trying port ${port + 1} (attempt ${attempt + 1}/${maxPortRetries})`);
          startServer(port + 1, attempt + 1);
        } else {
          console.error('❌ Server error:', err);
          process.exit(1);
        }
      });
    };

    startServer(parseInt(PORT, 10));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });