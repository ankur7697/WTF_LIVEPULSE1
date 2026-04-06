const { createMemoryStore } = require('./memoryStore');
const { createPgStore } = require('./pgStore');

module.exports = {
  createMemoryStore,
  createPgStore,
};
