const axios = require('axios');
const mongoose = require('mongoose');
const levelModel = require('../models/levelSchema');
require('dotenv').config();

const guildId = '545643483243872266';
const mee6Url = `https://mee6.xyz/api/plugins/levels/leaderboard/${guildId}`;
const database = process.env.MONGODB_SRV;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

mongoose.connect(database, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('Connected to the database!');

  try {
    let page = 0;
    let hasMore = true;
    const maxRetries = 5;

    while (hasMore) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.get(`${mee6Url}?page=${page}`);
          const users = response.data.players;

          if (users.length === 0) {
            hasMore = false;
          } else {
            for (const user of users) {
              // Skip users below level 2
              if (user.level < 2) continue;

              await levelModel.findOneAndUpdate(
                { userId: user.id, guildId: guildId },
                { xp: user.xp, level: user.level },
                { upsert: true }
              );
            }
            page += 1;
          }

          // If the request was successful, break out of the retry loop
          break;
        } catch (error) {
          console.error(`Error fetching MEE6 levels (attempt ${attempt}):`, error.message);
          if (attempt === maxRetries) {
            throw new Error('Max retries reached');
          }
          // Delay before retrying
          await delay(2000);
        }
      }
    }

    console.log('MEE6 levels imported successfully!');
  } catch (error) {
    console.error('Error fetching MEE6 levels:', error);
  } finally {
    mongoose.connection.close();
  }
}).catch((err) => {
  console.error(err);
});
