const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Logger middleware
app.use(logger('dev'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parsing middleware
app.use(cookieParser());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/zoom-connections', require('./routes/zoom-connections'));
app.use('/api/zoom-credentials', require('./routes/zoom-credentials'));
app.use('/api/sync-webinars', require('./routes/sync-webinars'));
app.use('/api/sync-logs', require('./routes/sync-logs'));
app.use('/api/webinars', require('./routes/webinars'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/fix-webinar-data', require('./routes/fix-webinar-data')); // NEW: Add fix route

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname+'/public/index.html'));
});

// Error handling
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}!`)
});

module.exports = app;
