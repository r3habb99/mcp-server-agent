/**
 * Jest test setup file
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.MAX_FILE_SIZE = '1048576'; // 1MB for tests
process.env.MAX_BATCH_SIZE = '10';
process.env.COMMAND_TIMEOUT = '5000';
process.env.AUGMENT_ENABLED = 'false';
