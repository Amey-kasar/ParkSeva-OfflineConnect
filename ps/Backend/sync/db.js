const mongoose = require('mongoose');

class SyncDatabase {
    constructor() {
        this.localConnection = null;
        this.cloudConnection = null;
    }

    async connectLocal() {
        if (!this.localConnection) {
            this.localConnection = await mongoose.createConnection('mongodb://127.0.0.1:27017/park_local', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('✅ Local MongoDB connected');
        }
        return this.localConnection;
    }

    async connectCloud() {
        if (!this.cloudConnection) {
            try {
                this.cloudConnection = await mongoose.createConnection(
                    'mongodb+srv://sankalpkarkhele554_db_user:GznLujsIYzqEBrxG@cluster0.dnvv9bo.mongodb.net/park_cloud',
                    {
                        useNewUrlParser: true,
                        useUnifiedTopology: true
                    }
                );
                console.log('✅ Cloud MongoDB connected');
            } catch (error) {
                console.log('❌ Cloud MongoDB unavailable:', error.message);
                this.cloudConnection = null;
            }
        }
        return this.cloudConnection;
    }

    getLocalConnection() {
        return this.localConnection;
    }

    getCloudConnection() {
        return this.cloudConnection;
    }

    isCloudAvailable() {
        return this.cloudConnection && this.cloudConnection.readyState === 1;
    }
}

module.exports = new SyncDatabase();