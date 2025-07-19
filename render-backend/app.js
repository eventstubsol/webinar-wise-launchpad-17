const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();

// Enable CORS
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization', 'zoom_connection_id', 'sync_type'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};
app.use(cors(corsOptions));

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api/users', require('./routes/users'));
app.use('/api/zoom', require('./routes/zoom'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/start-sync', require('./routes/start-sync-async'));
app.use('/api/sync-logs', require('./routes/sync-logs'));
app.use('/api/fix-webinar-data', require('./routes/fix-webinar-data'));

// Enhanced sync routes - Add the comprehensive fix routes
app.use('/api/sync-webinars', require('./routes/sync-webinars'));
app.use('/api/fix-webinar-data', require('./routes/fix-webinar-data'));
app.use('/api/comprehensive-fix', require('./routes/comprehensive-fix-webinar-data')); // NEW: Comprehensive fix routes

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).send('Not Found');
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

module.exports = app;
