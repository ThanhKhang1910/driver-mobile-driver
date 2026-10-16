const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Node 24 Windows V8 Zone Allocation out-of-memory crash in jest-worker
config.maxWorkers = 2;

module.exports = config;
