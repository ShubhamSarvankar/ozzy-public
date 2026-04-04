const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("visitors")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDescription("Pings visitors because they have no rights"),
  async execute(interaction) {
    const roleMention = "<@&653261692867837971>";
    const imageUrl = "https://media.discordapp.net/attachments/796421495240654871/1120055273395069019/shirtimage-3.png?width=677&height=567";
    
    // Reply with role mention and image link
    await interaction.reply(`${roleMention} WAKEY WAKEY!\n\n${imageUrl}`);
  },
};
