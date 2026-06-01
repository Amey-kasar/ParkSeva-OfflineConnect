const mongoose = require('mongoose');

class MultiDatabaseManager {
    constructor() {
        this.connections = new Map();
        this.mainConnection = null;
    }

    async initMainConnection() {
        if (!this.mainConnection) {
            this.mainConnection = await mongoose.createConnection(process.env.MONGODB_URI);
            console.log('Main database connected');
        }
        return this.mainConnection;
    }

    async getAdminConnection(adminId) {
        if (!this.connections.has(adminId)) {
            const dbName = `parking_admin_${adminId}`;
            const connection = await mongoose.createConnection(`${process.env.MONGODB_URI.split('/').slice(0, -1).join('/')}/${dbName}`);
            this.connections.set(adminId, connection);
            console.log(`Admin database connected: ${dbName}`);
        }
        return this.connections.get(adminId);
    }

    getMainConnection() {
        return this.mainConnection;
    }
}

module.exports = new MultiDatabaseManager();