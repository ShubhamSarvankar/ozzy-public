const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const gameStorage = new Map(); // To store game details and player choices

const THE_GREAT_LICE_ID = '416685672175239168';

const choices = ['rock', 'paper', 'scissors'];
const createButton = (label, style, customId) =>
  new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);

const choiceButtons = new ActionRowBuilder().addComponents(
  createButton('🪨 Rock', ButtonStyle.Primary, 'rock'),
  createButton('📜 Paper', ButtonStyle.Primary, 'paper'),
  createButton('✂ Scissors', ButtonStyle.Primary, 'scissors')
);

// Determines the winner ID under normal RPS rules
function getNormalWinner(playerOne, playerTwo, choiceOne, choiceTwo) {
  if (choiceOne === choiceTwo) return null; // tie
  return (
    (choiceOne === 'rock' && choiceTwo === 'scissors') ||
    (choiceOne === 'paper' && choiceTwo === 'rock') ||
    (choiceOne === 'scissors' && choiceTwo === 'paper')
  ) ? playerOne : playerTwo;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Rock Paper Scissors - HFs answer to a court of justice')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a Rock Paper Scissors game')
        .addUserOption(option =>
          option.setName('one')
            .setDescription('Player one')
            .setRequired(true))
        .addUserOption(option =>
          option.setName('two')
            .setDescription('Player two')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('accept')
        .setDescription('Accept a Rock Paper Scissors challenge')
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'start') {
      const playerOne = interaction.options.getUser('one');
      const playerTwo = interaction.options.getUser('two');

      if (playerOne.id === playerTwo.id) {
        await interaction.reply('Players cannot challenge themselves!');
        return;
      }

      if (playerOne.id === THE_GREAT_LICE_ID || playerTwo.id === THE_GREAT_LICE_ID) {
        await interaction.reply('Your greatness is not enough to challenge the Great Lice');
        return;
      }

      // Create a unique game ID
      const gameId = `${playerOne.id}-${playerTwo.id}-${Date.now()}`;

      gameStorage.set(gameId, {
        players: [playerOne.id, playerTwo.id],
        choices: {}
      });

      await interaction.reply(`Rock Paper Scissors game started between <@${playerOne.id}> and <@${playerTwo.id}>! If you're not a chicken, accept the challenge using \`/rps accept\`.`);

      // Ping the players in the server
      await interaction.followUp({
        content: `Waiting for both players! Use \`/rps accept\` to play.`,
        allowedMentions: { users: [playerOne.id, playerTwo.id] }
      });

    } else if (interaction.options.getSubcommand() === 'accept') {
      const playerId = interaction.user.id;
      let gameId;

      // Find the game this player is part of
      for (let [id, game] of gameStorage.entries()) {
        if (game.players.includes(playerId)) {
          gameId = id;
          break;
        }
      }

      if (!gameId) {
        await interaction.reply({ content: 'You are not part of any active Rock Paper Scissors game.', ephemeral: true });
        return;
      }

      const game = gameStorage.get(gameId);

      if (game.choices[playerId]) {
        await interaction.reply({ content: 'You have already made your choice.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content: 'Make your choice:',
        components: [choiceButtons],
        ephemeral: true,
      });

      const filter = i => i.user.id === playerId;
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

      collector.on('collect', async i => {
        const choice = i.customId;
        game.choices[playerId] = choice;

        await i.update({ content: `You chose ${choice}`, components: [] });

        // Check if both players have made their choice
        if (Object.keys(game.choices).length === 2) {
          const [playerOne, playerTwo] = game.players;
          const choiceOne = game.choices[playerOne];
          const choiceTwo = game.choices[playerTwo];

          const isTie = choiceOne === choiceTwo;
          const winner = isTie ? null : getNormalWinner(playerOne, playerTwo, choiceOne, choiceTwo);

          const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
          let result = isTie
            ? `It's a tie! Both players chose **${capitalize(choiceOne)}**.`
            : `<@${winner}> wins! <@${playerOne}> chose **${capitalize(choiceOne)}** and <@${playerTwo}> chose **${capitalize(choiceTwo)}**.`;

          await interaction.followUp({
            content: 'Results are in!',
            embeds: [new EmbedBuilder().setTitle('Rock Paper Scissors Result').setDescription(result)]
          });

          // Remove the game from storage
          gameStorage.delete(gameId);
        }
      });

      collector.on('end', collected => {
        if (Object.keys(game.choices).length < 2) {
          gameStorage.delete(gameId);
          interaction.followUp({ content: 'The game timed out. Not all players made a choice.', ephemeral: true });
        }
      });
    }
  }
};
