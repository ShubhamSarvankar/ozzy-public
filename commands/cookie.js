const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cookie")
    .setDescription("You can get a cookie, a lollipop, or a ban."),
  async execute(interaction) {
    // Generate a random number between 0 and 100
    const randomNumber = Math.floor(Math.random() * 101);

    // Define the animated emoji
    const flaxeyjompy = "<a:flaxeyjompy:1239974684007600129>";

    // Determine response based on the random number
    let response;
    if (randomNumber >= 0 && randomNumber < 15) {
      response = "🍪 You got a cookie!";
    } else if (randomNumber >= 15 && randomNumber < 50) {
      response = `${flaxeyjompy} The rats got the cookies.`;
    } else if (randomNumber >= 50 && randomNumber < 90) {
      response = "🍭 Here's a lollipop!";
    } else if (randomNumber >= 90 && randomNumber <= 100) {
      // Mention without triggering a ping notification
      response = "<@!416685672175239168> The rats are trying to steal the cookies!";
    }

    // Reply with the determined response and suppress mentions
    await interaction.reply({
      content: response,
      allowedMentions: {
        parse: [] // Suppress all mentions
      }
    });
  },
};
