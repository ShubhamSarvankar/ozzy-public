const { SlashCommandBuilder, AttachmentBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const { GlobalFonts } = Canvas;
const path = require('path');
const fs = require('fs').promises;
const StampModel = require('../models/stampSchema');
const { incStamps } = require('../utils/weeklyStats');

const generalChannelID = '653292446779834398'

GlobalFonts.registerFromPath(
  path.join(__dirname, '../fonts/Loyola.otf'),
  'Loyola'
);
GlobalFonts.registerFromPath(
  path.join(__dirname, '../fonts/Burbank.otf'),
  'Burbank'
);
GlobalFonts.registerFromPath(
  path.join(__dirname, '../fonts/Raleway-BoldItalic.ttf'),
  'Raleway-BoldItalic'
);

// Define your categories and the stamps in each category
const CATEGORIES = {
    "Category1": [
        'The More The Merrier', 
        'Welcome To The Mines', 
        'Settled In', 
        'Junior Yapper',
        'Yapper', 
        'Mom Im Famous', 
        'Masterpiece', 
        'Bose DK'
    ],
    "Category2": [
        'Battle Ready', 
        'The Next Leader', 
        'Say Cheese', 
        'Stink Bomb',
        'I Am Speed', 
        'HF Tactician', 
        'First Paycheck', 
        'Slow Down You Crazy Child'
    ],
    "Category3": [
        'Yap Segment', 
        'Bane Of Staff', 
        'Officially An Actor', 
        'Arcadium Amateur'
    ],
    "Category4": [
        'Are You Winning Bro', 
        'Born A Legend', 
        'Hunting Clovers', 
        'Hunting Guardians', 
        'Super Troop',
        'BINGO',
        'GoTW',
        'GoTW Specialist',
        'Gamer of the Century',
        'Clover Crushers',
        'Aliens Invader'
    ]
};

const STAMP_DESCRIPTIONS = {
    'Category1': [
        { name: 'The More The Merrier', value: 'Invite two people to join HF.' },
        { name: 'Welcome To The Mines', value: 'React with :elpisthegreatest: to your level-up message.' },
        { name: 'Settled In', value: 'Complete 1 month in HF.' },
        { name: 'Junior Yapper', value: 'Talk in General VC with more than 5 people.' },
        { name: 'Yapper', value: 'Reach Level 10 in HF server.' },
        { name: 'Mom Im Famous', value: 'Get featured in a HF Blog.' },
        { name: 'Masterpiece', value: 'Submit content for #art-memes.' },
        { name: 'Bose DK', value: 'Complete Ozzy\'s Curry Muncher test.' }
    ],
    'Category2': [
        { name: 'Battle Ready', value: 'Create an account on CPAB.' },
        { name: 'The Next Leader', value: 'Attend 3 Training Events or Battles.' },
        { name: 'Say Cheese', value: 'Submit 10 event-pictures in one event.' },
        { name: 'Stink Bomb', value: 'Fart (E+T in game) on a Commander before a battle begins.' },
        { name: 'I Am Speed', value: 'Log on for an event before Jo (if he attends).' },
        { name: 'HF Tactician', value: 'Submit a tactic that gets used in #tactic-suggestions.' },
        { name: 'First Paycheck', value: 'Earn 800 Sapphires.' },
        { name: 'Slow Down You Crazy Child', value: 'Get promoted more than twice in one week.' }
    ],
    'Category3': [
        { name: 'Yap Segment', value: 'Talk in a VC with more than 10 people.' },
        { name: 'Bane Of Staff', value: 'Defeat any Staff member in 3 different games.' },
        { name: 'Officially An Actor', value: 'Get featured in a HF Youtube Short.' },
        { name: 'Arcadium Amateur', value: 'Participate in 3 Arcadium events.' }
    ],
    'Category4': [
        { name: 'Are You Winning Bro', value: 'Run the !hypelegends command 7 days in a row.' },
        { name: 'Born A Legend', value: 'Attend all Legends Cup Battles.' },
        { name: 'Hunting Clovers', value: 'Attend the Legends Cup battle versus ACP.' },
        { name: 'Hunting Guardians', value: 'Attend the Legends Cup battle versus Elite Guardians.' },
        { name: 'Super Troop', value: 'Join the Recruiting Squadron and attend 3 segments.' },
        { name: 'BINGO', value: 'Complete the Weekly BINGO Card!'},
        { name: 'GoTW', value: 'Earn the Gamer of The Week award.' },
        { name: 'GoTW Specialist', value: 'Earn Gamer of The Week three times.' },
        { name: 'Gamer of the Century', value: 'Earn Gamer of The Week six times.' },
        { name: 'Clover Crushers', value: 'Attend the Legends Cup XV battle vs ACP.' },
        { name: 'Aliens Invader', value: 'Attend the Legends Cup XV battle vs Aliens.' }
    ]
};

const IMAGE_PATHS = {
    backgrounds: {
        Category1: path.join(__dirname, '../images/backgrounds/Community1.png'),
        Category2: path.join(__dirname, '../images/backgrounds/Army1.png'),
        Category3: path.join(__dirname, '../images/backgrounds/Activities1.png'),
        Category4: path.join(__dirname, '../images/backgrounds/Special1.png')
    },
    stamps: {
        'The More The Merrier': {
            CL: path.join(__dirname, '../images/stamps/TheMoreTheMerrierCL.png'),
            BW: path.join(__dirname, '../images/stamps/TheMoreTheMerrierBW.png')
        },
        'Welcome To The Mines': {
            CL: path.join(__dirname, '../images/stamps/WelcomeToTheMinesCL.png'),
            BW: path.join(__dirname, '../images/stamps/WelcomeToTheMinesBW.png')
        },
        'Settled In': {
            CL: path.join(__dirname, '../images/stamps/SettledInCL.png'),
            BW: path.join(__dirname, '../images/stamps/SettledInBW.png')
        },
        'Junior Yapper': {
            CL: path.join(__dirname, '../images/stamps/JuniorYapperCL.png'),
            BW: path.join(__dirname, '../images/stamps/JuniorYapperBW.png')
        },
        'Yapper': {
            CL: path.join(__dirname, '../images/stamps/YapperCL.png'),
            BW: path.join(__dirname, '../images/stamps/YapperBW.png')
        },
        'Mom Im Famous': {
            CL: path.join(__dirname, '../images/stamps/MomImFamousCL.png'),
            BW: path.join(__dirname, '../images/stamps/MomImFamousBW.png')
        },
        'Masterpiece': {
            CL: path.join(__dirname, '../images/stamps/MasterpieceCL.png'),
            BW: path.join(__dirname, '../images/stamps/MasterpieceBW.png')
        },
        'Bose DK': {
            CL: path.join(__dirname, '../images/stamps/BoseDKCL.png'),
            BW: path.join(__dirname, '../images/stamps/BoseDKBW.png')
        },
        'Battle Ready': {
            CL: path.join(__dirname, '../images/stamps/BattleReadyCL.png'),
            BW: path.join(__dirname, '../images/stamps/BattleReadyBW.png')
        },
        'The Next Leader': {
            CL: path.join(__dirname, '../images/stamps/TheNextLeaderCL.png'),
            BW: path.join(__dirname, '../images/stamps/TheNextLeaderBW.png')
        },
        'Say Cheese': {
            CL: path.join(__dirname, '../images/stamps/SayCheeseCL.png'),
            BW: path.join(__dirname, '../images/stamps/SayCheeseBW.png')
        },
        'Stink Bomb': {
            CL: path.join(__dirname, '../images/stamps/StinkBombCL.png'),
            BW: path.join(__dirname, '../images/stamps/StinkBombBW.png')
        },
        'I Am Speed': {
            CL: path.join(__dirname, '../images/stamps/IAmSpeedCL.png'),
            BW: path.join(__dirname, '../images/stamps/IAmSpeedBW.png')
        },
        'HF Tactician': {
            CL: path.join(__dirname, '../images/stamps/HFTacticianCL.png'),
            BW: path.join(__dirname, '../images/stamps/HFTacticianBW.png')
        },
        'First Paycheck': {
            CL: path.join(__dirname, '../images/stamps/FirstPaycheckCL.png'),
            BW: path.join(__dirname, '../images/stamps/FirstPaycheckBW.png')
        },
        'Slow Down You Crazy Child': {
            CL: path.join(__dirname, '../images/stamps/SlowDownYouCrazyChildCL.png'),
            BW: path.join(__dirname, '../images/stamps/SlowDownYouCrazyChildBW.png')
        },
        'Yap Segment': {
            CL: path.join(__dirname, '../images/stamps/YapSegmentCL.png'),
            BW: path.join(__dirname, '../images/stamps/YapSegmentBW.png')
        },
        'Bane Of Staff': {
            CL: path.join(__dirname, '../images/stamps/BaneOfStaffCL.png'),
            BW: path.join(__dirname, '../images/stamps/BaneOfStaffBW.png')
        },
        'Officially An Actor': {
            CL: path.join(__dirname, '../images/stamps/OfficiallyAnActorCL.png'),
            BW: path.join(__dirname, '../images/stamps/OfficiallyAnActorBW.png')
        },
        'Arcadium Amateur': {
            CL: path.join(__dirname, '../images/stamps/ArcadiumAmateurCL.png'),
            BW: path.join(__dirname, '../images/stamps/ArcadiumAmateurBW.png')
        },
        'Are You Winning Bro': {
            CL: path.join(__dirname, '../images/stamps/AreYouWinningBroCL.png'),
            BW: path.join(__dirname, '../images/stamps/AreYouWinningBroBW.png')
        },
        'Born A Legend': {
            CL: path.join(__dirname, '../images/stamps/BornALegendCL.png'),
            BW: path.join(__dirname, '../images/stamps/BornALegendBW.png')
        },
        'Hunting Clovers': {
            CL: path.join(__dirname, '../images/stamps/comingsoon.png'),
            BW: path.join(__dirname, '../images/stamps/comingsoon2.png')
        },
        'Hunting Guardians': {
            CL: path.join(__dirname, '../images/stamps/HuntingGuardiansCL.png'),
            BW: path.join(__dirname, '../images/stamps/HuntingGuardiansBW.png')
        },
        'Super Troop': {
            CL: path.join(__dirname, '../images/stamps/SuperTroopCL.png'),
            BW: path.join(__dirname, '../images/stamps/SuperTroopBW.png')
        },
        'BINGO': {
            CL: path.join(__dirname, '../images/stamps/BINGOCL.png'),
            BW: path.join(__dirname, '../images/stamps/BINGOBW.png')
        },
         'GoTW': {
             CL: path.join(__dirname, '../images/stamps/GoTWCL.png'),
             BW: path.join(__dirname, '../images/stamps/GoTWBW.png')
         },
         'GoTW Specialist': {
             CL: path.join(__dirname, '../images/stamps/GoTWSpecialistCL.png'),
             BW: path.join(__dirname, '../images/stamps/GoTWSpecialistBW.png')
         },
         'Gamer of the Century': {
             CL: path.join(__dirname, '../images/stamps/GamerOfTheCenturyCL.png'),
             BW: path.join(__dirname, '../images/stamps/GamerOfTheCenturyBW.png')
         },
         'Clover Crushers': {
             CL: path.join(__dirname, '../images/stamps/CloverCrushersCL.png'),
             BW: path.join(__dirname, '../images/stamps/CloverCrushersBW.png')
         },
         'Aliens Invader': {
             CL: path.join(__dirname, '../images/stamps/AliensInvaderCL.png'),
             BW: path.join(__dirname, '../images/stamps/AliensInvaderBW.png')
         }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stampbook')
        .setDescription('Manage the stampbook')
        .addSubcommand(subcommand =>
            subcommand
                .setName('display')
                .setDescription('Display the stampbook')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Which page do you want to see first?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a stamp to a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add the stamp to')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('stampname')
                        .setDescription('Name of the stamp to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a stamp from a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove the stamp from')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('stampname')
                        .setDescription('Name of the stamp to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('Get descriptions of all stamps')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'display') {
            const page = interaction.options.getInteger('page') || 1;
            const category = Object.keys(CATEGORIES)[page - 1];
            await interaction.reply(`<@${interaction.user.id}>, this is your stampbook!`);
            await displayStampbook(interaction, category);

        } else if (subcommand === 'add') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply('You do not have permission to use this command.');
            }
            const user = interaction.options.getUser('user');
            const stampName = interaction.options.getString('stampname');
            await addStamp(interaction, user, stampName);

        } else if (subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply('You do not have permission to use this command.');
            }
            const user = interaction.options.getUser('user');
            const stampName = interaction.options.getString('stampname');
            await removeStamp(interaction, user, stampName);

        } else if (subcommand === 'help') {
            await interaction.reply({ embeds: [createHelpEmbed()] });
        }
    },
};

// utility to auto-shrink text to fit
const applyText = (canvas, text, baseFontSize, font) => {
  const context = canvas.getContext('2d');
  let fontSize = baseFontSize;
  do {
    context.font = `italic ${fontSize -= 2}px ${font}`;
  } while (context.measureText(text).width > canvas.width - 338);
  return context.font;
};

async function generateCongratsImage(username, stampName, stampDescription, stampImagePath) {
  const canvas = Canvas.createCanvas(788, 263);
  const context = canvas.getContext('2d');

  // background
  const background = await loadImage(path.join(__dirname, '../images/congratsBackground.png'));
  context.drawImage(background, 0, 0, canvas.width, canvas.height);

  // stamp icon
  const stampImage = await loadImage(stampImagePath);
  context.drawImage(stampImage, 72, 22, 198, 198);

  // separator line
  context.beginPath();
  context.moveTo(332, 127);
  context.lineTo(701, 127);
  context.lineWidth = 5;
  context.strokeStyle = '#FFFFFF';
  context.stroke();

  // “CONGRATULATIONS!”
  context.font = applyText(canvas, 'CONGRATULATIONS!', 60, 'Loyola');
  context.fillStyle = '#FFFFFF';
  context.textAlign = 'center';
  context.shadowColor = 'rgba(0, 0, 0, 0.5)';
  context.shadowBlur = 4;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.fillText('CONGRATULATIONS!', 512, 65);

  // clear shadow
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // “<username> earned a stamp”
  context.font = applyText(canvas, `${username} earned a stamp`, 42, 'Burbank');
  context.fillText(`${username} earned a stamp`, 512, 110);

  // stamp name
  context.font = applyText(canvas, stampName, 48, 'Burbank');
  context.fillText(stampName, 512, 170);

  // description
  context.font = applyText(canvas, stampDescription, 20, 'Raleway-BoldItalic');
  context.fillText(stampDescription, 512, 200);

  // white outline
  context.lineWidth = 12;
  context.strokeStyle = '#FFFFFF';
  context.strokeRect(0, 0, canvas.width, canvas.height);

  return canvas.toBuffer('image/png');
}

function createHelpEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('Stampbook Help')
        .setDescription('Developed with ❤️️ by Ayan and Scorp\n\nDescriptions of all stamps')
        .setColor(0x00AE86);

    Object.keys(STAMP_DESCRIPTIONS).forEach(category => {
        let categoryName;
        switch (category) {
            case 'Category1':
                categoryName = '__**Community Stamps**__';
                break;
            case 'Category2':
                categoryName = '__**Army Stamps**__';
                break;
            case 'Category3':
                categoryName = '__**Activity Stamps**__';
                break;
            case 'Category4':
                categoryName = '__**Special Stamps**__';
                break;
        }

        const stamps = STAMP_DESCRIPTIONS[category].map(stamp => `**${stamp.name}**: ${stamp.value}`).join('\n');
        embed.addFields({ name: categoryName, value: stamps });
    });

    return embed;
}

async function displayStampbook(interaction, category) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();  // Defer the reply to avoid timing out
    }

    const userId = interaction.user.id;
    const userStampData = await StampModel.findOne({ userId });
    const stamps = userStampData ? userStampData.stamps : [];

    const canvas = Canvas.createCanvas(958, 584);
    const context = canvas.getContext('2d');

    // Load the background image based on the category
    const backgroundPath = IMAGE_PATHS.backgrounds[category];
    const background = await loadImage(backgroundPath);
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Original size of the stamps
    const stampSize = 100; // Assuming the original size is 100x100 pixels
    const startX = 90;
    const startY = 140;
    const spacing = 15;

    const stampNames = CATEGORIES[category];

    for (let i = 0; i < stampNames.length; i++) {
        const stampName = stampNames[i];
        const isEarned = stamps.includes(stampName);

        // Ensure the stampName exists in IMAGE_PATHS.stamps before trying to access it
        if (!IMAGE_PATHS.stamps[stampName]) {
            console.warn(`Stamp name "${stampName}" does not exist in IMAGE_PATHS.stamps.`);
            continue;
        }

        const stampImagePath = isEarned
            ? IMAGE_PATHS.stamps[stampName].CL
            : IMAGE_PATHS.stamps[stampName].BW;

        const stampImage = await loadImage(stampImagePath);

        // Calculate the position to place the stamp
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = startX + col * (stampSize + spacing);
        const y = startY + row * (stampSize + spacing);

        context.drawImage(stampImage, x, y, stampSize, stampSize);
    }

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'stampbook.png' });

    const categories = Object.keys(CATEGORIES);
    const currentIndex = categories.indexOf(category);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === categories.length - 1)
        );

    const message = await interaction.editReply({ files: [attachment], components: [buttons] });

    // Set up the button interaction collector
    const filter = i => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'previous' && currentIndex > 0) {
            await displayStampbookNewPage(interaction, categories[currentIndex - 1]);
        } else if (i.customId === 'next' && currentIndex < categories.length - 1) {
            await displayStampbookNewPage(interaction, categories[currentIndex + 1]);
        }
    });

    collector.on('end', async () => {
        await message.edit({ components: [] });
    });
}

async function displayStampbookNewPage(interaction, category) {
    const userId = interaction.user.id;
    const userStampData = await StampModel.findOne({ userId });
    const stamps = userStampData ? userStampData.stamps : [];

    const canvas = Canvas.createCanvas(958, 584);
    const context = canvas.getContext('2d');

    // Load the background image based on the category
    const backgroundPath = IMAGE_PATHS.backgrounds[category];
    const background = await loadImage(backgroundPath);
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Original size of the stamps
    const stampSize = 100; // Assuming the original size is 100x100 pixels
    const startX = 90;
    const startY = 140;
    const spacing = 15;

    const stampNames = CATEGORIES[category];

    for (let i = 0; i < stampNames.length; i++) {
        const stampName = stampNames[i];
        const isEarned = stamps.includes(stampName);

        // Ensure the stampName exists in IMAGE_PATHS.stamps before trying to access it
        if (!IMAGE_PATHS.stamps[stampName]) {
            console.warn(`Stamp name "${stampName}" does not exist in IMAGE_PATHS.stamps.`);
            continue;
        }

        const stampImagePath = isEarned
            ? IMAGE_PATHS.stamps[stampName].CL
            : IMAGE_PATHS.stamps[stampName].BW;

        const stampImage = await loadImage(stampImagePath);

        // Calculate the position to place the stamp
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = startX + col * (stampSize + spacing);
        const y = startY + row * (stampSize + spacing);

        context.drawImage(stampImage, x, y, stampSize, stampSize);
    }

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'stampbook.png' });

    const categories = Object.keys(CATEGORIES);
    const currentIndex = categories.indexOf(category);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === categories.length - 1)
        );

    await interaction.followUp({ files: [attachment], components: [buttons], ephemeral: true });

    // Set up the button interaction collector
    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'previous' && currentIndex > 0) {
            await displayStampbookNewPage(interaction, categories[currentIndex - 1]);
        } else if (i.customId === 'next' && currentIndex < categories.length - 1) {
            await displayStampbookNewPage(interaction, categories[currentIndex + 1]);
        }
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

async function addStamp(interaction, user, stampName) {
    const userId = user.id;
    let userStampData = await StampModel.findOne({ userId });

    if (!userStampData) {
        userStampData = new StampModel({ userId, stamps: [] });
    }

    if (userStampData.stamps.includes(stampName)) {
        return interaction.reply(`${user.username} already has the "${stampName}" stamp.`);
    }

    userStampData.stamps.push(stampName);
    await userStampData.save();

    try {
        await incStamps(userId, 1);
    } catch (err) {
        console.error('[weeklyStats] stamp increment failed:', err);
    }

    // Reply to the invoker
    await interaction.reply(`The "${stampName}" stamp has been added to ${user.username}.`);

    // === NEW: send graphic in general chat ===
    await sendCongratsMessage(user, stampName);
}

async function removeStamp(interaction, user, stampName) {
    const userId = user.id;
    let userStampData = await StampModel.findOne({ userId });

    if (!userStampData || !userStampData.stamps.includes(stampName)) {
        return interaction.reply(`${user.username} does not have the "${stampName}" stamp.`);
    }

    userStampData.stamps = userStampData.stamps.filter(stamp => stamp !== stampName);
    await userStampData.save();

    try {
        await incStamps(userId, -1); // clamped at zero internally
    } catch (err) {
        console.error('[weeklyStats] stamp decrement failed:', err);
    }

    await interaction.reply(`The "${stampName}" stamp has been removed from ${user.username}.`);
}

async function sendCongratsMessage(user, stampName) {
    const stampObj = Object.values(STAMP_DESCRIPTIONS)
        .flat()
        .find(s => s.name === stampName);
    if (!stampObj) return;

    const description = stampObj.value;
    const imagePath = IMAGE_PATHS.stamps[stampName]?.CL;
    if (!imagePath) return;

    const buffer = await generateCongratsImage(
        user.username,
        stampName,
        description,
        imagePath
    );

    const attachment = new AttachmentBuilder(buffer, { name: 'congrats.png' });
    const channel = await user.client.channels.fetch(generalChannelID);
    await channel.send({
        content: `<@${user.id}> Congratulations!`,
        files: [attachment],
    });
}

async function loadImage(filePath) {
    const data = await fs.readFile(filePath);
    return Canvas.loadImage(data);
}
