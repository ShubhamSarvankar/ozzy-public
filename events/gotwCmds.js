const { Events, EmbedBuilder } = require('discord.js');
const { getMemberColor } = require('../utils/getMemberColor');
const gotwModel = require('../models/gotwSchema');

const ALLOWED_ROLE_ID = '653262058514808842';
const IMAGE_URL_RE = /(https?:\/\/\S+\.(?:gif|png|jpe?g|webp)(?:\?\S*)?)/i;

function makeEmbed(member, response) {
  const embed = new EmbedBuilder()
    .setColor(getMemberColor(member) || '#5865F2');

  const urlMatch = response.match(IMAGE_URL_RE);
  if (urlMatch) {
    const [url] = urlMatch;
    const text = response.replace(url, '').trim();
    if (text) embed.setDescription(text);
    embed.setImage(url);
  } else {
    embed.setDescription(response);
  }

  return embed;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    const content = message.content.trim();
    if (!content.startsWith('!')) return;

    const baseCtx = {
      messageId: message.id,
      authorId: message.author.id,
      authorTag: message.author.tag,
      guildId: message.guild?.id,
      channelId: message.channel?.id,
      rawContent: content,
    };

    if (!message.member.roles.cache.has(ALLOWED_ROLE_ID)) return;

    const trigger = content.slice(1).toLowerCase();
    if (!trigger) return;

    try {
      const cmd = await gotwModel.findOne({ trigger });
      if (!cmd) return;

      if (!Array.isArray(cmd.responses) || cmd.responses.length === 0) {
        console.error(`[gotwCmds] trigger:empty-responses-array`, JSON.stringify({ ...baseCtx, trigger, docId: cmd._id?.toString() }));
        return;
      }

      // Pick randomly if multiple responses, otherwise just use the one
      let response;
      if (cmd.responses.length > 1) {
        response = cmd.responses[Math.floor(Math.random() * cmd.responses.length)];
      } else {
        response = cmd.responses[0];
      }

      if (!response || !String(response).trim()) {
        console.error(`[gotwCmds] response:empty-or-invalid`, JSON.stringify({ ...baseCtx, trigger, response }));
        return;
      }

      const urlMatch = response.match(IMAGE_URL_RE);
      if (urlMatch) {
        const embed = makeEmbed(message.member, response);
        await message.channel.send({ embeds: [embed] });
      } else {
        await message.channel.send(response);
      }
    } catch (err) {
      console.error('[gotwCmds] error', JSON.stringify({ ...baseCtx, trigger }), err);
    }
  }
};
