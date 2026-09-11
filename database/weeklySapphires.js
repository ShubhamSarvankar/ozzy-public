const { Auth } = require("../config.js");
const { MongoClient, ServerApiVersion } = require("mongodb");

const conn = new MongoClient(Auth.CLUSTER_AUTH_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

const TABLE_NAME = "weekly_sapphires";
const METADATA_COLLECTION = "leaderboard_metadata";

const document = {
    _id: null,
    weeklySapphires: 0,
};

class Database {
    async connect() {
        if (!conn.isConnected) {
            await conn.connect();
            conn.isConnected = true;
        }
    }

    cursor() {
        return conn.db(Auth.DB_NAME);
    }

    async destroy() {
        if (conn.isConnected) {
            await conn.close();
            conn.isConnected = false;
        }
    }
}

const DB = new Database();

async function createTable() {
    const db = DB.cursor();
    let collections = await db.collections();
    collections = collections.map((vl) => vl.collectionName);
    if (!collections.includes(TABLE_NAME)) {
        await db.createCollection(TABLE_NAME);
        console.log(`Created collection: ${TABLE_NAME}`);
    }
}

async function resetWeeklySapphires() {
    const db = DB.cursor().collection(TABLE_NAME);
    const result = await db.updateMany({}, { $set: { weeklySapphires: 0 } });
    console.log(`Reset weekly sapphires for ${result.modifiedCount} users.`);
}

async function updateWeeklySapphires(userId, amount) {
    const db = DB.cursor().collection(TABLE_NAME);
    const result = await db.updateOne({ _id: userId }, { $inc: { weeklySapphires: amount } }, { upsert: true });
    console.log(`Updated sapphires for user ${userId}:`, result);
}

async function getTopWeeklyEarners(limit = 10) {
    const db = DB.cursor().collection(TABLE_NAME);
    const users = await db.find().sort({ weeklySapphires: -1 }).limit(limit).toArray();
    console.log(`Retrieved top ${limit} weekly earners:`, users);
    return users;
}

async function updateCreatedMessageId(serverId, messageId) {
    const db = DB.cursor().collection(METADATA_COLLECTION);
    const result = await db.updateOne({ serverId: serverId }, { $set: { createdMessageId: messageId } }, { upsert: true });
    console.log(`Updated createdMessageId for server ${serverId}:`, result);
}

async function getCreatedMessageId(serverId) {
    const db = DB.cursor().collection(METADATA_COLLECTION);
    const result = await db.findOne({ serverId: serverId });
    return result ? result.createdMessageId : null;
}

module.exports = {
    DB,
    createTable,
    resetWeeklySapphires,
    updateWeeklySapphires,
    getTopWeeklyEarners,
    updateCreatedMessageId,
    getCreatedMessageId,
};
