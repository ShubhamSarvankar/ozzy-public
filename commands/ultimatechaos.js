const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ultimatechaos")
    .setDescription("Elp's vanity command - Pings literally every single role."),
  async execute(interaction) {
    // Check if the user invoking the command is the allowed user
    if (interaction.user.id === '416685672175239168') {
      // If allowed user, send the chaotic message with formatted mentions
      await interaction.reply(`
        <@&653261692867837971> <@&653262638721138698> <@&727488490991910933> 
        <@&653269225649078286> <@&810216266605264946> @everyone 
        <@&653261082684817418> <@&791927928044519445> 
        <@&667398472806170624> <@&667398412286558249> 
        <@&667398324990509067> <@&811597269592834119>

        LET'S GET READY TO RUUUMBBLEEEEEEEEEEEEEEEEEE
      `);
    } else {
      // If not allowed user, respond with a simple message
      await interaction.reply(`no.`);
    }
  },
};
