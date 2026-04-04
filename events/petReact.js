// ready.js
const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const channel = await client.channels.fetch('1386917556857602239');
    if (!channel.isTextBased()) return;

    // Filter only messages that include at least one image attachment
    const filter = msg =>
      msg.attachments.some(att => {
        const type = att.contentType || att.content_type;
        return type && type.startsWith('image/');
      });

    const collector = channel.createMessageCollector({ filter });

    collector.on('collect', message => {
      message.react('❤️').catch(console.error);
    });

    console.log(`petReact is watching #pets`);
  },
};
