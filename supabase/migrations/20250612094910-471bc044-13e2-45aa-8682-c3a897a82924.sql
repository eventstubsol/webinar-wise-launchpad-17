
-- Enable required PostgreSQL extensions for Webinar Wise
-- These extensions are needed for UUID generation and encryption functionality

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptography extension for token encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
