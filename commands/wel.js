const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wel")
    .setDescription("Sends a welcome image"),
  async execute(interaction) {
    const imageUrl = "https://media.discordapp.net/attachments/653292446779834398/653752093269557365/image0.png?width=1200&height=454";
    
    // Reply with the image link
    await interaction.reply(imageUrl);
  },
};
