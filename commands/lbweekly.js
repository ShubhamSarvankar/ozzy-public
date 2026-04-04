const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { DB, createTable, resetWeeklySapphires, getTopWeeklyEarners, updateCreatedMessageId, getCreatedMessageId } = require('../database/weeklySapphires');
const profileModel = require("../models/profileSchema");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lbweekly')
        .setDescription('Manage weekly sapphire leaderboard')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create weekly leaderboard'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update weekly leaderboard'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('backup')
                .setDescription('Generate a backup of the weekly sapphires')),

    async execute(interaction) {
        if (!interaction.isCommand()) return;
        
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }
        
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            await DB.connect();

            switch (subcommand) {
                case 'create':
                    await createWeeklyLeaderboard(interaction);
                    break;
                case 'update':
                    await updateWeeklyLeaderboard(interaction);
                    break;
                case 'backup':
                    await backupWeeklyLeaderboard(interaction);
                    break;
                default:
                    await interaction.editReply('Invalid subcommand.');
                    break;
            }
        } catch (error) {
            console.error(error);
            await interaction.followUp('An error occurred while executing the command.');
        } finally {
            DB.destroy();
        }
    },
};

async function createWeeklyLeaderboard(interaction) {
    try {
        await createTable();
        await resetWeeklySapphires();

        const embed = new EmbedBuilder()
            .setTitle('📅 **Weekly Sapphire Leaderboard** 📅')
            .setColor(0x45d6fd)
            .setDescription('The leaderboard has been created and will track weekly sapphires from now.');

        const reply = await interaction.editReply({ embeds: [embed] });
        const createdMessageId = reply.id;

        // Save the createdMessageId in the database
        await updateCreatedMessageId(interaction.guild.id, createdMessageId);

        console.log('Weekly leaderboard has been created.');
    } catch (error) {
        console.error('Error creating weekly leaderboard:', error);
        await interaction.followUp('An error occurred while creating the weekly leaderboard.');
    }
}

async function updateWeeklyLeaderboard(interaction) {
    try {
        console.log('Starting weekly leaderboard update...');

        // Fetch the createdMessageId from the database
        const createdMessageId = await getCreatedMessageId(interaction.guild.id);

        if (!createdMessageId) {
            console.log('No created message ID found.');
            await interaction.editReply('Weekly leaderboard has not been created yet.');
            return;
        }

        const members = await getTopWeeklyEarners();
        console.log('Fetched top members:', members);

        if (members.length === 0) {
            console.log('No data available for the leaderboard.');
            const embed = new EmbedBuilder()
                .setTitle('📅 **Weekly Sapphire Leaderboard** 📅')
                .setColor(0x45d6fd)
                .setDescription('No data available for the leaderboard.');

            const channel = interaction.channel;
            const message = await channel.messages.fetch(createdMessageId);
            await message.edit({ embeds: [embed] });
            await interaction.editReply('Weekly leaderboard has been updated.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 **Weekly Sapphire Leaderboard** 📅')
            .setColor(0x45d6fd);

        const sapphireEmote = "<:Sapphires:792479793756110868>";
        const helpers = [];
        const sapphiresEarned = [];

        for (let i = 0; i < members.length; i++) {
            const user = await interaction.client.users.fetch(members[i]._id);
            if (user) {
                helpers.push(`**${i + 1}.** ${user.username}`);
                sapphiresEarned.push(`${sapphireEmote} ${members[i].weeklySapphires}`);
            }
        }

        embed.addFields(
            { name: 'Helpers', value: helpers.join('\n'), inline: true },
            { name: 'Weekly Sapphires Earned', value: sapphiresEarned.join('\n'), inline: true }
        );

        const channel = interaction.channel;
        const message = await channel.messages.fetch(createdMessageId);
        await message.edit({ embeds: [embed] });

        console.log('Weekly leaderboard has been updated.');
        await interaction.editReply('Weekly leaderboard has been updated.');
    } catch (error) {
        console.error('Error updating weekly leaderboard:', error);
        await interaction.followUp('An error occurred while updating the weekly leaderboard.');
    }
}

async function backupWeeklyLeaderboard(interaction) {
    try {
        const members = await getTopWeeklyEarners();

        if (members.length === 0) {
            return await interaction.editReply('No data found in the weekly leaderboard.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📅 **Weekly Sapphire Leaderboard Backup** 📅')
            .setColor(0x45d6fd)
            .setDescription('Final leaderboard at the time of backup');

        const sapphireEmote = "<:Sapphires:1253576129017811055>";
        const helpers = [];
        const sapphiresEarned = [];

        for (let i = 0; i < Math.min(20, members.length); i++) {
            const user = await interaction.client.users.fetch(members[i]._id);
            if (user) {
                helpers.push(`**${i + 1}.** ${user.username}`);
                sapphiresEarned.push(`${sapphireEmote} ${members[i].weeklySapphires}`);
            }
        }

        embed.addFields(
            { name: 'Helpers', value: helpers.join('\n'), inline: true },
            { name: 'Weekly Sapphires Earned', value: sapphiresEarned.join('\n'), inline: true }
        );

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error backing up weekly leaderboard:', error);
        await interaction.followUp('An error occurred while backing up the weekly leaderboard.');
    }
}
