const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const profileModel = require('../models/profileSchema');
const { DB, updateWeeklySapphires } = require('../database/weeklySapphires');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactforsapphires')
    .setDescription('Create a reaction event for users to earn sapphires')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('The number of sapphires to give for reacting')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option
        .setName('time')
        .setDescription('The time (in seconds) for which reactions will be counted')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message for users to react to')
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger('amount');
    const time = interaction.options.getInteger('time');
    const messageContent = interaction.options.getString('message');
    const sapphireEmote = "<:Sapphires:792479793756110868>";

    const embed = new EmbedBuilder()
      .setTitle('React for Sapphires!')
      .setDescription(`${messageContent}\n\nReact with ${sapphireEmote} to receive ${amount} sapphires!`)
      .setColor(0x45d6fd)
      .setTimestamp();

    const message = await interaction.channel.send({ embeds: [embed] });
    await message.react(sapphireEmote); // Add the sapphire emote to the message

    await interaction.editReply('Reaction event started!');

    const filter = (reaction, user) => !user.bot && reaction.emoji.name === 'Sapphires';
    const collector = message.createReactionCollector({ filter, time: time * 1000 }); // Convert time to milliseconds

    const usersWhoReacted = new Set();

    collector.on('collect', async (reaction, user) => {
      usersWhoReacted.add(user.id);

      try {
        await DB.connect(); 
        let profile = await profileModel.findOne({ userId: user.id });
        if (!profile) {
          profile = await profileModel.create({
            userId: user.id,
            serverId: interaction.guild.id,
            sapphires: 0,
          });
        }

        profile.sapphires += amount;
        await profile.save();
        await updateWeeklySapphires(user.id, amount); // Update weekly sapphires

        console.log(`Added ${amount} sapphires to ${user.username}`);
      } catch (error) {
        console.error(`Error adding sapphires to ${user.username}:`, error);
      }
    });

    collector.on('end', async () => {
      embed.setDescription('This event has ended. Thank you for attending!');
      await message.edit({ embeds: [embed] });
      console.log('Reaction event ended');

      // Send a summary message
      if (usersWhoReacted.size > 0) {
        const summaryEmbed = new EmbedBuilder()
          .setTitle('Reaction Event Summary')
          .setColor(0x45d6fd)
          .setDescription(`The following users received ${amount} sapphires:`);

        const userMentions = Array.from(usersWhoReacted).map(userId => `<@${userId}>`).join('\n');
        summaryEmbed.addFields({ name: 'Users', value: userMentions });

        await interaction.followUp({ embeds: [summaryEmbed] });
      } else {
        await interaction.followUp('No users reacted to the event.');
      }
    });
  },
};
