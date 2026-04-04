const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getMemberColor } = require('../utils/getMemberColor');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows a paginated list of all commands and their descriptions'),
  async execute(interaction) {
    console.log("Help command executed by:", interaction.user.tag);

    // Fetch member & color
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const color = getMemberColor(member);

    // Load all command files dynamically
    const commandsPath = __dirname;
    let commandFiles;
    try {
      commandFiles = fs.readdirSync(commandsPath)
        .filter(file => file.endsWith('.js') && file !== path.basename(__filename));
    } catch (err) {
      console.error('Error reading commands folder:', err);
      return interaction.reply({ content: 'Could not load commands.', ephemeral: true });
    }

    const commands = [];
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        if (command.data && command.data.name && command.data.description) {
          commands.push({
            name: command.data.name,
            description: command.data.description,
          });
        }
      } catch (err) {
        console.error(`Error loading command ${file}:`, err);
      }
    }

    if (commands.length === 0) {
      return interaction.reply({ content: 'No commands available.', ephemeral: true });
    }

    // Pagination setup
    const commandsPerPage = 10;
    const totalPages = Math.ceil(commands.length / commandsPerPage);

    const generateEmbed = (page) => {
      const start = page * commandsPerPage;
      const paginated = commands.slice(start, start + commandsPerPage);
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Help — Page ${page + 1}/${totalPages}`)
        .setFooter({ text: 'Ozzy', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      for (const cmd of paginated) {
        embed.addFields({ name: `/${cmd.name}`, value: cmd.description, inline: false });
      }
      return embed;
    };

    // Buttons
    const prevButton = new ButtonBuilder()
      .setCustomId('help_prev')
      .setLabel('◀️ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
    const nextButton = new ButtonBuilder()
      .setCustomId('help_next')
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalPages <= 1);

    const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

    // Send initial embed
    let currentPage = 0;
    const message = await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [row],
      fetchReply: true
    });
    console.log("Help message sent with ID:", message.id);

    // Collector
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'These buttons aren’t for you!', ephemeral: true });
      }

      // Update page index
      if (i.customId === 'help_prev') {
        currentPage = Math.max(currentPage - 1, 0);
      } else if (i.customId === 'help_next') {
        currentPage = Math.min(currentPage + 1, totalPages - 1);
      }

      // Update button states
      prevButton.setDisabled(currentPage === 0);
      nextButton.setDisabled(currentPage === totalPages - 1);

      // Update embed
      await i.update({
        embeds: [generateEmbed(currentPage)],
        components: [row]
      });
    });

    collector.on('end', async () => {
      // Disable buttons when collector ends
      prevButton.setDisabled(true);
      nextButton.setDisabled(true);
      try {
        await interaction.editReply({ components: [row] });
      } catch (err) {
        console.error('Error disabling help buttons:', err);
      }
    });
  },
};
