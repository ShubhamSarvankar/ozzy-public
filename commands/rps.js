const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const gameStorage = new Map(); // To store game details and player choices

const VISITOR_ROLE_ID = '653261692867837971';
const ALWAYS_WIN_USER_ID = '221783949461028864';

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

// Applies visitor role disadvantage when exactly one player is a visitor
// Visitor can only win with scissors vs paper; any other non-tie outcome becomes a visitor loss
function getAdjustedWinner(playerOne, playerTwo, choiceOne, choiceTwo, visitorId) {
  // Tie: visitor wins against a non-visitor
  if (choiceOne === choiceTwo) return visitorId;

  const normalWinner = getNormalWinner(playerOne, playerTwo, choiceOne, choiceTwo);
  const nonVisitorId = visitorId === playerOne ? playerTwo : playerOne;
  const visitorChoice = visitorId === playerOne ? choiceOne : choiceTwo;
  const nonVisitorChoice = visitorId === playerOne ? choiceTwo : choiceOne;

  // The only winning condition allowed for the visitor: scissors vs paper
  if (visitorChoice === 'scissors' && nonVisitorChoice === 'paper') {
    return visitorId; // visitor's one legitimate win
  }

  // All other non-tie outcomes: visitor loses
  return nonVisitorId;
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

      // Create a unique game ID
      const gameId = `${playerOne.id}-${playerTwo.id}-${Date.now()}`;

      // Resolve GuildMembers to check roles
      const guild = interaction.guild;
      const memberOne = await guild.members.fetch(playerOne.id).catch(() => null);
      const memberTwo = await guild.members.fetch(playerTwo.id).catch(() => null);

      const oneIsVisitor = memberOne?.roles.cache.has(VISITOR_ROLE_ID) ?? false;
      const twoIsVisitor = memberTwo?.roles.cache.has(VISITOR_ROLE_ID) ?? false;

      // Initialize game storage, recording visitor status at game creation time
      gameStorage.set(gameId, {
        players: [playerOne.id, playerTwo.id],
        choices: {},
        oneIsVisitor,
        twoIsVisitor
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

          const { oneIsVisitor, twoIsVisitor } = game;

          // Determine which result path to use:
          // - Exactly one visitor vs one non-visitor: apply disadvantage
          // - Both visitors or neither: normal rules
          const applyDisadvantage = (oneIsVisitor && !twoIsVisitor) || (!oneIsVisitor && twoIsVisitor);
          const visitorId = oneIsVisitor ? playerOne : playerTwo;

          let result = '';
          if (game.players.includes(ALWAYS_WIN_USER_ID)) {
            const winner = ALWAYS_WIN_USER_ID;
            result = `<@${winner}> wins! <@${playerOne}> chose **${choiceOne.charAt(0).toUpperCase() + choiceOne.slice(1)}** and <@${playerTwo}> chose **${choiceTwo.charAt(0).toUpperCase() + choiceTwo.slice(1)}**.`;
          } else if (applyDisadvantage) {
            const winner = getAdjustedWinner(playerOne, playerTwo, choiceOne, choiceTwo, visitorId);
            result = `<@${winner}> wins! <@${playerOne}> chose **${choiceOne.charAt(0).toUpperCase() + choiceOne.slice(1)}** and <@${playerTwo}> chose **${choiceTwo.charAt(0).toUpperCase() + choiceTwo.slice(1)}**.`;
          } else if (choiceOne === choiceTwo) {
            result = `It's a tie! Both players chose **${choiceOne.charAt(0).toUpperCase() + choiceOne.slice(1)}**.`;
          } else {
            const winner = getNormalWinner(playerOne, playerTwo, choiceOne, choiceTwo);
            result = `<@${winner}> wins! <@${playerOne}> chose **${choiceOne.charAt(0).toUpperCase() + choiceOne.slice(1)}** and <@${playerTwo}> chose **${choiceTwo.charAt(0).toUpperCase() + choiceTwo.slice(1)}**.`;
          }

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
