const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hf8ball')
    .setDescription('Ask the magic 8ball any question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString('question').toLowerCase();

    // Specific responses for certain questions
    const winQuestions = [
      "will hf win the legends cup?",
      "will help force win the legends cup?",
      "will help force win the legends cup this year?",
      "is hf going to win the legends cup?",
      "is help force going to win the legends cup?",
      "is help force going to win the legends cup this year?",
      "will hf take the legends cup?",
      "will help force take the legends cup?",
      "will help force take the legends cup this year?",
      "is hf going to take the legends cup?",
      "is help force going to take the legends cup?",
      "is help force going to take the legends cup this year?",
      "is hf going to win the lc?",
      "is help force going to win the lc?",
      "is help force going to win the lc this year?",
      "will hf win the lc?",
      "will help force win the lc?",
      "will help force win the lc this year?",
      "will hf secure the legends cup?",
      "will help force secure the legends cup?",
      "will help force secure the legends cup this year?",
      "is hf going to secure the legends cup?",
      "is help force going to secure the legends cup?",
      "is help force going to secure the legends cup this year?",
      "will hf win lc?",
      "will help force win lc?",
      "will help force win lc this year?",
      "is hf winning the legends cup?",
      "is help force winning the legends cup?",
      "is help force winning the legends cup this year?",
      "will hf win the legends cup this season?",
      "will help force win the legends cup this season?",
      "will help force win the legends cup tournament?",
      "is hf going to win the legends cup tournament?",
      "is help force going to win the legends cup tournament?",
      "is help force going to win the legends cup tournament this year?",
      "is hf winning the legends cup this season?",
      "is help force winning the legends cup this season?",
      "is help force winning the legends cup tournament this year?",
      "will hf win the tournament?",
      "will help force win the tournament?",
      "will hf win the tournament this year?",
      "will help force win the tournament this year?"
    ];

    const loseQuestions = [
      "will hf lose the legends cup?",
      "will help force lose the legends cup?",
      "will help force lose the legends cup this year?",
      "is hf going to lose the legends cup?",
      "is help force going to lose the legends cup?",
      "is help force going to lose the legends cup this year?",
      "will hf lose the lc?",
      "will help force lose the lc?",
      "will help force lose the lc this year?",
      "is hf going to lose the lc?",
      "is help force going to lose the lc?",
      "is help force going to lose the lc this year?",
      "will hf lose lc?",
      "will help force lose lc?",
      "will help force lose lc this year?",
      "is hf losing the legends cup?",
      "is help force losing the legends cup?",
      "is help force losing the legends cup this year?",
      "will hf lose the legends cup this season?",
      "will help force lose the legends cup this season?",
      "will help force lose the legends cup tournament?",
      "is hf going to lose the legends cup tournament?",
      "is help force going to lose the legends cup tournament?",
      "is help force going to lose the legends cup tournament this year?",
      "is hf losing the legends cup this season?",
      "is help force losing the legends cup this season?",
      "is help force losing the legends cup tournament this year?",
      "will hf lose the tournament?",
      "will help force lose the tournament?",
      "will hf lose the tournament this year?",
      "will help force lose the tournament this year?"
    ];

    let response;
    if (winQuestions.includes(question)) {
      response = "OFCOURSE YES, HELP FORCE BEST FORCE";
    } else if (loseQuestions.includes(question)) {
      response = "NO WAY, HELP FORCE NEVER LOSES!";
    } else {
      // 8ball responses
      const responses = [
        'It is certain.',
        'It is decidedly so.',
        'Without a doubt.',
        'Yes – definitely.',
        'You may rely on it.',
        'As I see it, yes.',
        'Most likely.',
        'Outlook good.',
        'Yes.',
        'Signs point to yes.',
        'Reply hazy, try again.',
        'Ask again later.',
        'Better not tell you now.',
        'Cannot predict now.',
        'Concentrate and ask again.',
        'Don’t count on it.',
        'My reply is no.',
        'My sources say no.',
        'Outlook not so good.',
        'Very doubtful.'
      ];

      // Select a random response
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    // Reply with the response
    await interaction.reply(`🎱 **Question:** ${interaction.options.getString('question')}\n**Answer:** ${response}`);
  },
};
