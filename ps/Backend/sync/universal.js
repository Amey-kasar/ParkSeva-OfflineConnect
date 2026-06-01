const syncDb = require('./db');
const models = require('./models');

class UniversalSync {
    constructor() {
        this.localToCloudStreams = new Map();
        this.cloudToLocalStreams = new Map();
        this.resumeTokens = new Map();
        
        this.modelFactories = {
            User: models.createUserModel,
            Vehicle: models.createVehicleModel,
            ParkingSlot: models.createParkingSlotModel,
            ParkingEntry: models.createParkingEntryModel,
            Payment: models.createPaymentModel,
            AdminLocation: models.createAdminLocationModel,
            Chat: models.createChatModel
        };
    }

    async startLocalToCloudSync() {
        for (const [modelName, factory] of Object.entries(this.modelFactories)) {
            await this.startLocalToCloudForModel(modelName, factory);
        }
    }

    async startCloudToLocalSync() {
        for (const [modelName, factory] of Object.entries(this.modelFactories)) {
            await this.startCloudToLocalForModel(modelName, factory);
        }
    }

    async startLocalToCloudForModel(modelName, factory) {
        try {
            const localConn = await syncDb.connectLocal();
            const LocalModel = factory(localConn);

            const options = { fullDocument: 'updateLookup' };
            const resumeToken = this.resumeTokens.get(`local-${modelName}`);
            if (resumeToken) options.resumeAfter = resumeToken;

            const changeStream = LocalModel.watch([], options);

            changeStream.on('change', async (change) => {
                this.resumeTokens.set(`local-${modelName}`, change._id);
                await this.handleLocalToCloudChange(modelName, factory, change);
            });

            changeStream.on('error', (error) => {
                console.error(`Local ${modelName} sync error:`, error);
                setTimeout(() => this.startLocalToCloudForModel(modelName, factory), 5000);
            });

            this.localToCloudStreams.set(modelName, changeStream);
            console.log(`🔄 Local→Cloud sync started for ${modelName}`);
        } catch (error) {
            console.error(`Failed to start local sync for ${modelName}:`, error);
            setTimeout(() => this.startLocalToCloudForModel(modelName, factory), 5000);
        }
    }

    async startCloudToLocalForModel(modelName, factory) {
        try {
            const cloudConn = await syncDb.connectCloud();
            if (!cloudConn) {
                setTimeout(() => this.startCloudToLocalForModel(modelName, factory), 10000);
                return;
            }

            const CloudModel = factory(cloudConn);

            const options = { fullDocument: 'updateLookup' };
            const resumeToken = this.resumeTokens.get(`cloud-${modelName}`);
            if (resumeToken) options.resumeAfter = resumeToken;

            const changeStream = CloudModel.watch([], options);

            changeStream.on('change', async (change) => {
                this.resumeTokens.set(`cloud-${modelName}`, change._id);
                await this.handleCloudToLocalChange(modelName, factory, change);
            });

            changeStream.on('error', (error) => {
                console.error(`Cloud ${modelName} sync error:`, error);
                setTimeout(() => this.startCloudToLocalForModel(modelName, factory), 10000);
            });

            this.cloudToLocalStreams.set(modelName, changeStream);
            console.log(`🔄 Cloud→Local sync started for ${modelName}`);
        } catch (error) {
            console.error(`Failed to start cloud sync for ${modelName}:`, error);
            setTimeout(() => this.startCloudToLocalForModel(modelName, factory), 10000);
        }
    }

    async handleLocalToCloudChange(modelName, factory, change) {
        try {
            const cloudConn = syncDb.getCloudConnection();
            if (!cloudConn || cloudConn.readyState !== 1) return;

            const CloudModel = factory(cloudConn);
            const doc = change.fullDocument;

            if (doc && doc._lastSyncFrom === 'local') return;

            switch (change.operationType) {
                case 'insert':
                case 'update':
                case 'replace':
                    if (doc) {
                        doc._lastSyncFrom = 'local';
                        await CloudModel.updateOne({ _id: doc._id }, doc, { upsert: true });
                        console.log(`📤 ${modelName} synced: ${change.operationType}`);
                    }
                    break;

                case 'delete':
                    await CloudModel.updateOne(
                        { _id: change.documentKey._id },
                        { _deleted: true, _lastSyncFrom: 'local' },
                        { upsert: true }
                    );
                    console.log(`📤 ${modelName} delete synced`);
                    break;
            }
        } catch (error) {
            console.error(`Local→Cloud sync error for ${modelName}:`, error);
        }
    }

    async handleCloudToLocalChange(modelName, factory, change) {
        try {
            const localConn = syncDb.getLocalConnection();
            if (!localConn) return;

            const LocalModel = factory(localConn);
            const doc = change.fullDocument;

            if (doc && doc._lastSyncFrom === 'cloud') return;

            switch (change.operationType) {
                case 'insert':
                case 'update':
                case 'replace':
                    if (doc) {
                        doc._lastSyncFrom = 'cloud';
                        await LocalModel.updateOne({ _id: doc._id }, doc, { upsert: true });
                        console.log(`📥 ${modelName} synced: ${change.operationType}`);
                    }
                    break;

                case 'delete':
                    await LocalModel.updateOne(
                        { _id: change.documentKey._id },
                        { _deleted: true, _lastSyncFrom: 'cloud' },
                        { upsert: true }
                    );
                    console.log(`📥 ${modelName} delete synced`);
                    break;
            }
        } catch (error) {
            console.error(`Cloud→Local sync error for ${modelName}:`, error);
        }
    }

    async start() {
        await syncDb.connectLocal();
        await syncDb.connectCloud();
        await this.startLocalToCloudSync();
        await this.startCloudToLocalSync();
        console.log('🚀 Universal Sync Engine started');
    }

    stop() {
        for (const stream of this.localToCloudStreams.values()) {
            stream.close();
        }
        for (const stream of this.cloudToLocalStreams.values()) {
            stream.close();
        }
        console.log('🛑 Universal Sync Engine stopped');
    }
}

module.exports = new UniversalSync();