const { SlashCommandBuilder } = require('@discordjs/builders');
const levelModel = require('../models/levelSchema');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level or the level of another user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user whose level you want to check')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply(); // Acknowledge the interaction immediately
    
    const user = interaction.options.getUser('user') || interaction.user;
    const levelData = await levelModel.findOne({ userId: user.id, guildId: interaction.guild.id });

    if (!levelData) {
      await interaction.followUp(`${user.tag} has no level data yet.`);
    } else {
      await interaction.followUp(`${user.tag} is currently level ${levelData.level} with ${levelData.xp} XP.`);
    }
  },
};
