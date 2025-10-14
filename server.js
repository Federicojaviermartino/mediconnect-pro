// Simple server for Render demo
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MediConnect Pro is running',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'MediConnect Pro',
    version: '1.0.0',
    description: 'Enterprise-grade telemedicine platform',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs'
    },
    demo: {
      message: 'This is a live demo of MediConnect Pro',
      credentials: {
        admin: 'admin@mediconnect.demo / Demo2024!Admin',
        doctor: 'dr.smith@mediconnect.demo / Demo2024!Doctor',
        patient: 'john.doe@mediconnect.demo / Demo2024!Patient'
      }
    }
  });
});

// API placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'MediConnect Pro API',
    version: 'v1',
    status: 'operational'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 MediConnect Pro running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
