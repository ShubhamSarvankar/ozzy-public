const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const csv = require('csv-parser');
const profileModel = require('../models/profileSchema');
const { DB } = require('../database/weeklySapphires'); 
const sph = '<:Sapphires:792479793756110868>';

const promotions = {
  '791927926312534016': { roleName: 'Amateur Helper', balanceRequired: 500 },
  '791927926177792060': { roleName: 'Professional Helper', balanceRequired: 1000 },
  '791927926097444874': { roleName: 'Elite Helper', balanceRequired: 1500 },
  '791927923874725929': { roleName: 'Supreme Helper', balanceRequired: 2000 },
  '791927923212288001': { roleName: 'Specialist', balanceRequired: 2500 },
  '791924690578964501': { roleName: 'Novice Corporal', balanceRequired: 3200 },
  '791925065666134026': { roleName: 'Corporal', balanceRequired: 3900 },
  '791925753993494538': { roleName: 'Sergeant', balanceRequired: 4600 },
  '791926819511205919': { roleName: 'Sergeant Major', balanceRequired: 5300 },
  '791925067025219595': { roleName: 'Commando Brigade', balanceRequired: 6000 },
  '791926790712852480': { roleName: 'Blue Berets', balanceRequired: 6900 },
  '791927394361016320': { roleName: 'Second Lieutenant', balanceRequired: 7800 },
  '791926493503553580': { roleName: 'First Lieutenant', balanceRequired: 8700 },
  '791926225332862977': { roleName: 'Captain', balanceRequired: 9600 },
  '869542277134057472': { roleName: 'Major', balanceRequired: 10200 },
  '791925012751450112': { roleName: 'Lieutenant Colonel', balanceRequired: 11100 },
  '791924831184355328': { roleName: 'Colonel', balanceRequired: 12000 },
  '810220832043434044': { roleName: 'Commodore', balanceRequired: 13000 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repopulate')
    .setDescription('Post ragnarok revival of sapphire balances.')
    .setDefaultPermission(false),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'IM GOING OFF THE RAILS ON A CRAZY TRAINNN ', ephemeral: false });
    }
    await interaction.reply({ content: '⏳ Starting repopulation…', ephemeral: false });

    await DB.connect();

    const reportChannel = await interaction.client.channels.fetch('653291552076202036'); // promotions for actual implementation
    // const reportChannel = await interaction.client.channels.fetch('1335621379298689184'); // diwix curry house for testing
    if (!reportChannel || reportChannel.type !== ChannelType.GuildText) {
      return interaction.followUp('You fool, you gave me the wrong channel IDs.');
    }

    // stream the CSV so we never load >1 row into memory at a time
    const stream = fs.createReadStream('./data/SapphireData.csv').pipe(csv());
    for await (const row of stream) {
      try {
        const userId = row.userId.trim();
        const amount = parseInt(row.sapphires, 10);
        if (isNaN(amount) || amount <= 0) continue;

        // fetch or create profile
        let profile = await profileModel.findOne({ userId });
        if (!profile) {
          profile = new profileModel({ userId, serverId: interaction.guild.id, sapphires: 0 });
        }

        profile.sapphires += amount;
        await profile.save();

        // send the “added” embed
        const addedEmbed = new EmbedBuilder()
          .setTitle('Sapphires Added')
          .setColor('#00FF00')
          .setDescription(`Added ${sph} ${amount} to <@${userId}>'s balance (total: ${profile.sapphires})`);
        await reportChannel.send({ embeds: [addedEmbed] });

        // now check *all* new promotions they qualify for
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) continue;

                // find the highest role they *already* had
        const hadRanks = Object.keys(promotions)
        .map((roleId, idx) =>
            member.roles.cache.has(roleId) ? idx : -1
        )
        .filter(idx => idx >= 0);
        const maxHad = hadRanks.length ? Math.max(...hadRanks) : -1;

        // build a list of every tier they now qualify for above that
            const newlyEarned = Object.entries(promotions)
            .map(([roleId, { roleName, balanceRequired }], idx) => ({
                roleId,
                roleName,
                balanceRequired,
                idx
            }))
            .filter(({ balanceRequired, idx }) =>
                profile.sapphires >= balanceRequired && idx > maxHad
            );

            if (newlyEarned.length) {
            // pick the single highest tier
            const topTier = newlyEarned.reduce((best, current) =>
                current.idx > best.idx ? current : best
            );
            await reportChannel.send(
                `<@${userId}>, you are eligible for a promotion to **${topTier.roleName}**! 🎉`
            );
            }
      } catch (err) {
        console.error('Error repopulating row:', row, err);
        // optionally: log failures to reportChannel
      }
    }

    await interaction.followUp('✅ Repopulation complete!');
  },
};