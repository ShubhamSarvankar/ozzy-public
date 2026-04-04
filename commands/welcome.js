const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Sends a welcome GIF"),
  async execute(interaction) {
    const gifUrl = "https://cdn.discordapp.com/attachments/653298061275037696/1220883723248078879/WelcomeHF.gif?ex=66108f92&is=65fe1a92&hm=93e85fc9a3a0f27ff8b5902f59d123b9def239ccebd8739f0493f6e6d309be2f&";
    
    // Reply with the GIF link
    await interaction.reply(gifUrl);
  },
};
