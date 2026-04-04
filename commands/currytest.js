const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, ComponentType } = require('discord.js');
const QuizScore = require('../models/scoreSchema'); // Adjust the path to your schema

const questions = [
  { question: "Do you wear shoes inside your house?", correctAnswer: "no" },
  { question: "Do you eat curry quite often?", correctAnswer: "yes" },
  { question: "Do you own a rice cooker?", correctAnswer: "yes" },
  { question: "Have you ever been beaten by an everyday item, like a slipper or a broom?", correctAnswer: "yes" },
  { question: "Do your parents allow you to stay out late?", correctAnswer: "no" },
  { question: "Do your parents regift the gifts you received?", correctAnswer: "yes" },
  { question: "Do weddings in your family involve more than just a wedding day event?", correctAnswer: "no" },
  { question: "Does your daily diet include a tortilla-like bread?", correctAnswer: "yes" },
  { question: "Are you working towards a non STEM career?", correctAnswer: "no" },
  { question: "Have you ever had Biryani?", correctAnswer: "yes" },
  { question: "Has your mom ever answered 'Where should I keep this' with 'On my head'?", correctAnswer: "yes" },
  { question: "Have you ever had to lie about where you were going?", correctAnswer: "yes" },
  { question: "Do you prefer coffee over chai?", correctAnswer: "no" },
  { question: "Have you ever been to a Hindu temple?", correctAnswer: "yes" },
  { question: "Do you use WhatsApp?", correctAnswer: "yes" },
  { question: "Masala dosas >>> crepes?", correctAnswer: "yes" },
  { question: "Are you often compared to random cousins and relatives?", correctAnswer: "yes" },
  { question: "Are you allowed to drink/smoke inside your house?", correctAnswer: "no" },
  { question: "Does your bedroom door have a lock?", correctAnswer: "no" },
  { question: "Have you ever had a secret relationship?", correctAnswer: "yes" },
  { question: "Do you think Mexican food is just Indian food but in Mexico?", correctAnswer: "yes" },
  { question: "Have you ever had freshly fried snacks like pakode, samosa, etc in the rain?", correctAnswer: "yes" },
  { question: "Do your parents validate your achievements by consulting their friends?", correctAnswer: "yes" },
  { question: "Is there water mixed with the handwash in your bathroom?", correctAnswer: "yes" },
  { question: "Do you fw the song Bhaag Bhaag DK Bose?", correctAnswer: "yes" }
];

// Channel and role IDs
const GENERAL_CHANNEL_ID = '653292446779834398';
const CURRY_ROLE_ID = '960330646092415006';
const PASS_THRESHOLD = 18; // score must be greater than this to pass

module.exports = {
  data: new SlashCommandBuilder()
    .setName("currymunchertest")
    .setDescription("Are you a real curry muncher? Find out today!")
    .addSubcommand(sub =>
      sub.setName("start").setDescription("Start the quiz"))
    .addSubcommand(sub =>
      sub
        .setName("display")
        .setDescription("Display a user's quiz score")
        .addUserOption(opt => opt.setName("user").setDescription("The user whose score you want to see").setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') {
      await interaction.deferReply();
      try {
        const score = await runQuiz(interaction);
        await interaction.editReply(`Quiz finished! Your score is ${score}/${questions.length}.`);
      } catch (err) {
        console.error(`[ERROR] Quiz failed: ${err}`);
        await interaction.editReply('There was an error running the quiz.');
      }
    } else {
      await displayScore(interaction);
    }
  }
};

async function runQuiz(interaction) {
  const user = interaction.user;
  const guild = interaction.guild;
  const member = await guild.members.fetch(user.id);
  const dm = await user.createDM();
  let score = 0;

  for (let i = 0; i < questions.length; i++) {
    const { question, correctAnswer } = questions[i];
    const embed = new EmbedBuilder()
      .setTitle(`Question ${i + 1}`)
      .setDescription(question)
      .setColor('#040c9c');

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('answer')
        .setPlaceholder('Choose an answer')
        .addOptions([
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ])
    );

    const msg = await dm.send({ embeds: [embed], components: [row] });

    try {
      const select = await msg.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 30000,
        filter: i => i.user.id === user.id
      });
      await select.deferUpdate();
      if (select.values[0] === correctAnswer) score++;
    } catch {
      await dm.send("Time's up! Moving to the next question.");
    }
  }

  // Save or update score
  await QuizScore.findOneAndUpdate(
    { userId: user.id },
    { score },
    { upsert: true }
  );

  // Assign role and announce if eligible
  if (score > PASS_THRESHOLD) {
    try {
      await member.roles.add(CURRY_ROLE_ID);
    } catch (error) {
      console.error(`[ERROR] Role assignment failed: ${error}`);
    }

    // Send announcement in general chat
    try {
      const channel = guild.channels.cache.get(GENERAL_CHANNEL_ID) || await guild.channels.fetch(GENERAL_CHANNEL_ID);
      if (channel?.isTextBased()) {
        const rolePing = `<@&${CURRY_ROLE_ID}>`;
        const userPing = `<@${user.id}>`;
        await channel.send(`Congratulate ${userPing} on taking the curry muncher test and joining the ${rolePing} club!`);
      }
    } catch (err) {
      console.error(`[ERROR] Announcement failed: ${err}`);
    }
  }

  return score;
}

async function displayScore(interaction) {
  const user = interaction.options.getUser('user');
  try {
    const record = await QuizScore.findOne({ userId: user.id });
    if (record) {
      await interaction.reply(`${user.username}'s quiz score is ${record.score}.`);
    } else {
      await interaction.reply(`${user.username} has not taken the quiz yet.`);
    }
  } catch (error) {
    console.error(`[ERROR] displayScore: ${error}`);
    await interaction.reply('An error occurred while retrieving the score.');
  }
}
