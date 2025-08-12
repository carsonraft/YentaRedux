require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3004'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth-extended'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/prospects', require('./routes/prospects'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/mdf', require('./routes/mdf'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/vetting', require('./routes/vetting'));
app.use('/api/qualification', require('./routes/qualification'));
app.use('/api/validation', require('./routes/public-validation'));
app.use('/api/ai/v1', require('./routes/ai-v1'));
app.use('/api/ai', require('./routes/ai-extraction'));
app.use('/api/auth', require('./routes/linkedin-auth'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});