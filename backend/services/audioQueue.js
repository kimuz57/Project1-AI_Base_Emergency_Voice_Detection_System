const aiService = require('./aiService');
require('dotenv').config();

const queue = [];
let isProcessing = false;

/**
 * Add audio file to processing queue
 * @param {object} audioData - { deviceCode, filepath, io, filename, timestamp }
 */
function push(audioData) {
  queue.push(audioData);
  console.log(`[Queue] Added audio to queue. Queue length: ${queue.length}`);
  processQueue();
}

/**
 * Process queue items one by one
 */
async function processQueue() {
  if (isProcessing) {
    console.log('[Queue] Already processing, waiting...');
    return;
  }

  if (queue.length === 0) {
    console.log('[Queue] Queue is empty');
    return;
  }

  isProcessing = true;
  const audioData = queue.shift();

  try {
    console.log(`[Queue] Processing: ${audioData.filename}`);
    const startTime = Date.now();

    // Process audio through AI service
    await aiService.processAudio(audioData);

    const processingTime = Date.now() - startTime;
    console.log(`[Queue] Completed: ${audioData.filename} (${processingTime}ms)`);

  } catch (error) {
    console.error('[Queue] Error processing audio:', error);
    // Optionally: push failed item back to queue or log to database
  } finally {
    isProcessing = false;
    // Continue processing if there are more items
    if (queue.length > 0) {
      setImmediate(() => processQueue());
    }
  }
}

/**
 * Get queue status
 */
function getStatus() {
  return {
    queueLength: queue.length,
    isProcessing,
    maxQueueSize: 1000
  };
}

/**
 * Clear queue
 */
function clear() {
  queue.length = 0;
  console.log('[Queue] Queue cleared');
}

module.exports = {
  push,
  getStatus,
  clear
};
