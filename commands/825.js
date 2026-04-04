const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('825')
    .setDescription("Sends a random raccoon image with a life quote"),
  async execute(interaction) {
    // Ensure the correct path to the images directory
    const raccoonImagesPath = path.join(__dirname, '..', 'images', 'raccoons');
    const raccoonImages = fs.readdirSync(raccoonImagesPath).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    if (raccoonImages.length === 0) {
      await interaction.reply('No raccoon images found.');
      return;
    }

    // Select a random image
    const randomImage = raccoonImages[Math.floor(Math.random() * raccoonImages.length)];
    const randomImagePath = path.join(raccoonImagesPath, randomImage);

    // Raccoon life quotes
    const quotes = [
      "Here's your daily raccoon life quote!",
      "Raccoons believe in second chances, you should too.",
      "Life is simple, just like a raccoon’s love for shiny things.",
      "Embrace the night like a raccoon and find your true self.",
      "Adapt, survive, and thrive, just like a raccoon.",
      "Be curious, be adventurous, be raccoon-like.",
    ];

    // Select a random quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Reply with the random image and quote
    await interaction.reply({ content: randomQuote, files: [randomImagePath] });
  },
};