const UniversalSync = require('./universal');
const syncDb = require('./db');

class SyncEngine {
    constructor() {
        this.universalSync = UniversalSync;
    }

    async start() {
        try {
            await this.universalSync.start();
            console.log('🚀 Complete Sync Engine started for all models');
        } catch (error) {
            console.error('Sync Engine failed to start:', error);
        }
    }

    stop() {
        this.universalSync.stop();
        console.log('🛑 Complete Sync Engine stopped');
    }
}

module.exports = new SyncEngine();