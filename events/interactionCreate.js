const { Events } = require("discord.js");
const profileModel = require("../models/profileSchema");  
const levelModel = require("../models/levelSchema");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    let levelData;
    try {
      levelData = await levelModel.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!levelData) {
        levelData = await levelModel.create({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        });
      }
    } catch (err) {
      console.log(err);
    }

    // get user db information
    let profileData;
    try {
      profileData = await profileModel.findOne({ userId: interaction.user.id });
      if (!profileData) {
        profileData = await profileModel.create({
          userId: interaction.user.id,
          serverId: interaction.guild.id,
          sapphires: 10,
        });
      }
    } catch (err) {
      console.log(err);
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, profileData, levelData); // Pass profileData here
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  },
};
