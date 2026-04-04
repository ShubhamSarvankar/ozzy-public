const { Events } = require("discord.js");
const reminderModel = require('../models/reminderSchema');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready~ Logged in as ${client.user.tag}`);

    try {
      const reminders = await reminderModel.find();
      reminders.forEach(reminder => {
        setInterval(async () => {
          const channel = await client.channels.fetch(reminder.channelId);
          if (channel) {
            const formattedMessage = reminder.message.replace(/\\n/g, '\n');
            channel.send(formattedMessage);
          }
        }, reminder.interval * 60 * 1000);
      });
    } catch (error) {
      console.error('Error setting up reminders:', error);
    }
  },
};
