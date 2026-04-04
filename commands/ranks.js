const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMemberColor } = require('../utils/getMemberColor');
const { promotions } = require('../utils/promotionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hfranks')
    .setDescription('Displays a list of hierarchical ranks and their required balance.'),

  async execute(interaction) {
    // embed color from invoking user
    const embedColor = getMemberColor(interaction.member);

    // Define the ranks (renamed Base Rank → Trainee)
    const ranks = {
      'Trainee': '653261082684817418',
      'Troop Ranks': [
        '791927928044519445',
        '791927926312534016',
        '791927926177792060',
        '791927926097444874',
        '791927923874725929',
        '791927923212288001'
      ],
      'Rookies': [
        '791924690578964501',
        '791925065666134026',
        '791925753993494538',
        '791926819511205919',
        '791925067025219595'
      ],
      "Commander's Watch": [
        '791926790712852480',
        '791927394361016320',
        '791926493503553580',
        '791926225332862977',
        '869542277134057472',
        '791925012751450112',
        '791924831184355328',
        '810220832043434044'
      ]
    };

    const embed = new EmbedBuilder()
      .setTitle('Hierarchical Ranks & Required Balance')
      .setColor(embedColor)
      .setDescription('You can also access the Help Force ranks here: https://cphelpforce.com/ranks/');

    for (const [rankName, roleIds] of Object.entries(ranks)) {
      let value;

      if (rankName === 'Trainee') {
        // no balance needed
        value = 'Equip the HF Uniform';
      } else {
        // ensure array
        const ids = Array.isArray(roleIds) ? roleIds : [roleIds];
        // build each line with balance if available
        const lines = ids.map(id => {
          const promo = promotions[id];
          if (promo) {
            return `• <@&${id}> — **${promo.balanceRequired} Sapphires**`;
          } else {
            // fall back if no promotion data
            return `• <@&${id}>`;
          }
        });
        value = lines.join('\n');
      }

      embed.addFields({ name: rankName, value, inline: false });
    }

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { roles: [] }
    });
  },
};
