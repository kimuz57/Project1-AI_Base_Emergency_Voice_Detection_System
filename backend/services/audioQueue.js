// ============================================
// Guardian AI — Audio Processing Queue
// ============================================
const { processAudio } = require("./aiService");

class AudioQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.io = null;
  }

  /**
   * Set Socket.io instance
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Add audio to processing queue
   * @param {string} audioPath - Path to .wav file
   * @param {number} eventId - event_sound row ID
   */
  enqueue(audioPath, eventId) {
    this.queue.push({ audioPath, eventId });
    console.log(`📥 Queue: Added event #${eventId} (queue size: ${this.queue.length})`);
    this._processNext();
  }

  /**
   * Process next item in queue
   */
  async _processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { audioPath, eventId } = this.queue.shift();

    try {
      await processAudio(audioPath, eventId, this.io);
    } catch (err) {
      console.error(`❌ Queue processing error (event #${eventId}):`, err.message);
    }

    this.isProcessing = false;
    console.log(`📤 Queue: Completed event #${eventId} (remaining: ${this.queue.length})`);

    // Process next in queue
    if (this.queue.length > 0) {
      this._processNext();
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// Singleton instance
const audioQueue = new AudioQueue();
module.exports = audioQueue;
