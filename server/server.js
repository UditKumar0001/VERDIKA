import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';

// Route imports
import authRoutes from './routes/auth.js';
import underwritingRoutes from './routes/underwriting.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Security and utility middleware
app.use(generalLimiter);
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount application routes
app.use('/api/auth', authRoutes);
app.use('/api/underwriting', underwritingRoutes);
app.use('/api/admin', adminRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database & start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(config.port, () => {
      logger.info(`Verdika Server running on port ${config.port} (env: ${config.nodeEnv})`);
      logger.info(`Accepting requests from client origin: ${config.clientOrigin}`);
    });
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start listening if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
