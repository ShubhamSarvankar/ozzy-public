const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { randomInt } = require('mathjs');

const file = new AttachmentBuilder("../images/ozzy.png");

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

const hcom = `838429835712921630`;
const trustee = `916706599433809982`;
const host = `1263547927591387148`

const joinEmoji = `🏹`;
const startEmoji = `⚔️`;
const addOzzyEmoji = `🗡`;
let workingHG = false;

let hoster = "";

let arenaMsg = "";

let arr = {};
let n = 0;
let day = 1;

let deadPeopleList = "";

let pfpArr = {};
let pfp = {};

let finish = false;
let botWon = false;
let arenaEvent = -1;
let winnerHealthNo = -1;

let aliveCounter = 0;

let winner = 0;

let pastDeadList = {};
let pastDeadNumber = 0;

//weapons

let coconut = {};
let axe = {};
let pistol = {};
let knife = {};
let cookies = {};
let excookiebur = {};
let bow = {};
let mace = {};
let ratofdoom = {};
let blueguitar = {};
let banhammer = {};
let javascript = {};
let slipper = {};
let metronome = {};
let pinklightsaber = {};
let bananapeellauncher = {};
let masterball = {};
let curry = {};
let deathnote = {};
let roulettegun = {};
let pokemonattack = {};
let pokemonheal = {};
let kcookie = {};
let barehands = {};
let excalibur = {};

let dayy = {};
let arenaa = {};
let fight = "";
let nightFight = "";
let deathh = {};
let nightt = {};
let ozzyJoined = false;
let hasStart = false;

let one = false;
let two = false;

let p = 0;
let joined = {};
let extra = {};
let players = {};
let playersNo = 0;
let counter = 0;
let doneNo = 0;
let done = {};
let found = false;

const next = new ButtonBuilder()
  .setCustomId(`next`)
  .setLabel("Next")
  .setStyle(ButtonStyle.Primary);

const nextT = new ButtonBuilder()
  .setCustomId(`next`)
  .setLabel("Next")
  .setStyle(ButtonStyle.Success)
  .setDisabled(true);

const main = new ActionRowBuilder().addComponents(next);
const donee = new ActionRowBuilder().addComponents(nextT);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hg')
    .setDescription('hunger games!'),
  
  async execute(interaction, client) {
    await interaction.deferReply();
    const m = interaction.member;
    if (
      m.roles.cache.has(hcom) ||
      m.roles.cache.has(trustee) ||
      m.roles.cache.has(host)
    ) {
      hoster = interaction.user.id;
      let startEmbed = new EmbedBuilder()
        .setTitle("🏹 Hunger Games 🏹")
        .setDescription(
          "The Reaping \n Hosted by: <@" +
            hoster +
            ">\n\n " +
            " React with " +
            joinEmoji +
            "To **Participate** in HG!\n\n " +
            " React with " +
            addOzzyEmoji +
            "To **Add Ozzy** in the Game!\n\n " +
            " React with " +
            startEmoji +
            "To **Start** The game!!"
        )
        .setColor(0x953d59);
        
        if(workingHG == false){
          const message = await interaction.followUp({
            embeds: [startEmbed],
            fetchReply: true,
          });
          workingHG= true

      message
        .react(joinEmoji)
        .then(() => message.react(addOzzyEmoji))
        .then(() => message.react(startEmoji));

      const cfilter = (reaction, user) => {
        return reaction.emoji.name === "🏹" && !user.bot;
      };
      const startfilter = (reaction, user) => {
        return reaction.emoji.name === "⚔️" && !user.bot;
      };

      const ozzyfilter = (reaction, user) => {
        return reaction.emoji.name === "🗡" && !user.bot;
      };

      const startCollector = message.createReactionCollector({
        filter: startfilter,
        time: 300000 
      });
      const collector = message.createReactionCollector({
        filter: cfilter,
        time: 300000 
      });

      const ozzyCollector = message.createReactionCollector({
        filter: ozzyfilter,
        time: 300000 
      });

      startCollector.on("collect", async (reaction, user) => {
        if (user.id == interaction.user.id && hasStart == false && p > 0) {
          hasStart = true;
          for (let a = 0; a < p; a++) {
            for (let b = 0; b < doneNo; b++) {
              if (joined[a] != done[b]) {
                found = false;
              } else {
                found = true;
                break;
              }
            }
            if (found == false) {
              players[playersNo] = joined[a];
              playersNo++;
              done[doneNo] = joined[a];
              doneNo++;
            }
          }

          let alive = {};
          let dead = {};
          let aliveCounter = 0;
          let cannonCount = 0;
          let deadMSG = "";
          let health = {};
          let round = 1;
          let gotChance = {};
          
          for (let g = 0; g < playersNo; g++) {
            health[g] = 100;
            gotChance[g] = false;
            alive[g] = true;
          }
          let variables = [coconut, axe, pistol, knife, cookies, excookiebur, bow, mace, ratofdoom, blueguitar, banhammer, javascript, slipper, metronome, pinklightsaber, bananapeellauncher, masterball, curry, deathnote, roulettegun, pokemonattack, pokemonheal, kcookie, barehands, excalibur];
          for (let g = 0; g < playersNo; g++) {
            for (let variable of variables) {
              variable[g] = false;
            }
          }

          aliveCounter = 0;

          while (finish == false) { //game loop
            for (let g = 0; g < playersNo; g++) {
              gotChance[g] = false;
            }
            deadMSG = "";
            const dcollectorFilter = (i) => i.user.id === interaction.user.id;
            
            let diedThisRound = "";

            for (let a = 0; a <= playersNo; a++) { // day events creating loop
              aliveCounter = 0;
              
              for ( let itr = 0; itr <= playersNo; itr++) { //setting alive counter
                if (health[itr]>0){
                  aliveCounter++;
                }
              }

              if (alive[a] == true && health[a] > 0) { //starting event allocation for next alive player                
                let choice = getRandomInt(5);
                if (round == 1 && aliveCounter>1) { //round 1 weapons allocation
                  let weaponChoice = getRandomInt(34);

                  if (weaponChoice == 0) {
                    coconut[a] = true;
                    fight += `<@${players[a]}> discovered Desireus' coconuts!`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 1) {
                    axe[a] = true;
                    fight += `<@${players[a]}> came upon an axe, but are not sure how to use it.`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 2) {
                    pistol[a] = true;
                    fight += `So creative! <@${players[a]}> 3D-printed a pistol!`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 3) {
                    knife[a] = true;
                    fight += `<@${players[a]}> found a small kitchen knife. The blade is smaller than their finger.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 4) {
                    cookies[a] = true;
                    fight += `<@${players[a]}> broke into Elp's office to steal cookies. Instead, he found some classified documents.`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 5) {
                    bow[a] = true;
                    fight += `<@${players[a]}> finds a bow and some arrows.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 6) {
                    excookiebur[a] = true;
                    fight += `After an intense adventure, <@${players[a]}> rediscovers the legendary sword Excookiebur!`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 7) {
                    mace[a] = true;
                    fight += `<@${players[a]}> chances upon a sturdy mace.`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 8) {
                    ratofdoom[a] = true;
                    fight += `<@${players[a]}> unearths an old, worm-out rubber rat.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 9) {
                    blueguitar[a] = true;
                    fight += `Showing immense loyalty to HF, <@${players[a]}> choose to weild a blue guitar as their weapon.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 10) {
                    banhammer[a] = true;
                    fight += `After distracting Wynn from her office with a cake, <@${players[a]}> steals the ban hammer!`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 11) {
                    javascript[a] = true;
                    fight += `<@${players[a]}> encounters Javascript in the wild. This could go either ways...`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 12) {
                    slipper[a] = true;
                    fight += `<@${players[a]}> finds mom's slippers.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 13) {
                    metronome[a] = true;
                    fight += `After counting a 17/16 time signature correctly, <@${players[a]}> gets blessed with a metronome.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 14) {
                    pinklightsaber[a] = true;
                    fight += `<@${players[a]}> ignores everything else to grab a hot pink lightsaber even though its faulty.`;
                    fight += `\n\n`;
                    health[a] -= 7 * round;
                  }
                  if (weaponChoice == 15) {
                    bananapeellauncher[a] = true;
                    fight += `<@${players[a]}> purchases a banana peel launcher from Amazon. TONY STARK COULD'VE MADE THAT IN A CAVE.`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 16) {
                    masterball[a] = true;
                    fight += `Walking in the long grass, <@${players[a]}> finds a masterball.`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 17) {
                    curry[a] = true;
                    fight += `<@${players[a]}> sings Bhaag Bhaag DK Bose perfectly and is blessed with a bowl of curry!`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 18) {
                    deathnote[a] = true;
                    fight += `While trying to find a secure place to poop, <@${players[a]}> discovers the Death Note! But is it safe?`;
                    fight += `\n\n`;
                    health[a] -= 7 * round;
                  }
                  if (weaponChoice == 19) {
                    roulettegun[a] = true;
                    fight += `<@${players[a]}> starts praying for luck, after finding a Roulette Gun.`;
                    fight += `\n\n`;
                    health[a] -= 8 * round;
                  }
                  if (weaponChoice == 20) {
                    pokemonattack[a] = true;
                    let pokemonChoice = getRandomInt(3);
                    if (pokemonChoice == 0) {
                      fight += `<@${players[a]}> captures a wild Charizard!`;
                      fight += `\n\n`;
                      health[a] -= 4 * round;
                    }
                    if (pokemonChoice == 1) {
                      fight += `<@${players[a]}> captures a wild Gengar!`;
                      fight += `\n\n`;
                      health[a] -= 4 * round;
                    }
                    if (pokemonChoice == 2) {
                      fight += `<@${players[a]}> captures a wild Mewtwo!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                  }
                  if (weaponChoice == 21) {
                    pokemonheal[a] = true;
                    let pokemonChoice = getRandomInt(3);
                    if (pokemonChoice == 0) {
                      fight += `<@${players[a]}> captures a wild Snorlax!`;
                      fight += `\n\n`;
                      health[a] -= 4 * round;
                    }
                    if (pokemonChoice == 1) {
                      fight += `<@${players[a]}> captures a wild Torchic!`;
                      fight += `\n\n`;
                      health[a] -= 4 * round;
                    }
                    if (pokemonChoice == 2) {
                      fight += `<@${players[a]}> captures a wild Mew!`;
                      fight += `\n\n`;
                      health[a] -= 4 * round;
                    }
                  }
                  if (weaponChoice == 22) {
                    kcookie[a] = true;
                    fight += `After a huge fight with Snowy, <@${players[a]}> obtains ketchup cookies!`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 23) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> tries to grab a weapon but ends up taking damage instead.`;
                    fight += `\n\n`;
                    health[a] -= 7 * round;
                  }
                  if (weaponChoice == 24) {
                    banhammer[a] = true;
                    fight += `<@${players[a]}> sneaks into Elp's lounge during the Overtime?? Day chaos and steals the ban hammer!`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 25) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> cooks a meal using stolen food from the staff kitchen, taking a huge risk...`;
                    fight += `\n\n`;
                    health[a] -= 10 * round;
                  }
                  if (weaponChoice == 26) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> tries climbing a tree to set up camp but falls and gets hurt.`;
                    fight += `\n\n`;
                    health[a] -= 10 * round;
                  }
                  if (weaponChoice == 27) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> harvests broccoli.`;
                    fight += `\n\n`;
                    health[a] += 5 * round;
                  }
                  if (weaponChoice == 28) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> accidentally collected poisoned water to drink.`;
                    fight += `\n\n`;
                    health[a] -= 10 * round;
                  }
                  if (weaponChoice == 29) {
                    curry[a] = true;
                    fight += `<@${players[a]}> beats up a recruiter and steals their curry!`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 30) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> burns themselves while trying to start a fire.`;
                    fight += `\n\n`;
                    health[a] -= 8 * round;
                  }
                  if (weaponChoice == 31) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> harvests some corn.`;
                    fight += `\n\n`;
                    health[a] += 5 * round;
                  }
                  if (weaponChoice == 32) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> finds a backpack but its booby trapped.`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 33) {
                    excalibur[a] = true;
                    fight += `<@${players[a]}> finds Excalibur but no one really cares cuz it's not Excookiebur.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  gotChance = true;
                }
                else if (round!= 1 && aliveCounter == 2) { //two person game mechanism
                  let p2 = 0;
                  for (let g = 0; g < playersNo; g++) {
                    if (health[g] > 0) {
                      aliveCounter++;
                      if (a != g) {
                        p2 = g;
                      }
                    }                  
                  }    
                  
                  if (alive[a] == true && aliveCounter >=2) {
                    if (coconut[a] == true) {
                      fight += `<@${players[a]}> climbs a tree and starts throwing coconuts at <@${players[p2]}>.`;
                      fight += `\n\n`;
                      health[p2] -= 180;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } 
                    else if (axe[a] == true) {
                      let axeChance = getRandomInt(2);
                      fight += `<@${players[a]}> figures out how to use an axe by practicing on <@${players[p2]}>.`;
                      fight += `\n\n`;
                      health[p2] -= 180;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;                    
                    } 
                    else if (pistol[a] == true) {
                      fight += `<@${players[a]}> tries to shoot <@${players[p2]}> with their pistol.`;
                      let pistolChance = getRandomInt(10);
                      health[p2] -= 150;
                      if (pistolChance <5) { fight += ` It is not that effective, but still hits.`;}
                      if (pistolChance >=5) { fight += `The bullet dealt critical damage.`;}
                      fight += `\n\n`;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } 
                    else if (cookies[a] == true) {
                      let cookieChance = getRandomInt(3);
                      if (cookieChance <= 1) {
                        fight += `<@${players[a]}> gives <@${players[p2]}> cookies laced with posion.`;
                        fight += `\n\n`;
                        health[p2] -= 100;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      } else if (cookieChance == 2) {
                        fight += `<@${players[a]}> uses cookies to distract <@${players[p2]}> and runs away. Fucking coward.\n\n`;
                        fight += `\n\n`;
                      } else {
                        fight += `<@${players[a]}> tries to distract <@${players[p2]}> with cookies, fails miserably, and loses the cookies.`;
                        fight += `\n\n`;
                        health[a] -= 80;
                        if (health[a]<=0){
                          diedThisRound += `✝️ <@${players[a]}>`;
                          diedThisRound += `\n`;        
                        }
                      }
                    } else if (excookiebur[a] == true) {
                      fight += `<@${players[a]}> attacks <@${players[p2]}> with the legendary sword Excookiebur. <@${players[p2]}> fucking dies.`;
                      fight += `\n\n`;
                      health[p2] -= 500;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (bow[a] == true) {
                      fight += `<@${players[a]}> fires some blunt arrows on <@${players[p2]}>.`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (mace[a] == true) {
                      fight += `<@${players[a]}> swings their mace at <@${players[p2]}> hitting their butt. Ouch.`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (ratofdoom[a] == true) {
                      fight += `<@${players[a]}> squeezes the rubber rat, emitting a ridiculous squeak. <@${players[p2]}> laughs, but the Rat of Doom suddenly appears...`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (blueguitar[a] == true) {
                      fight += `<@${players[a]}> ABSOLUTELY SMASHES their blueguitar on <@${players[p2]}> head, Kurt Cobain style.`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (banhammer[a] == true) {
                      fight += `<@${players[a]}> attempts an attack on <@${players[p2]}> with their banhammer.`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (javascript[a] == true) {
                      let jchance = getRandomInt(2);
                      if (jchance <= 1) {
                        fight += `<@${players[a]}> throws javascript code at <@${players[p2]}> instantly killing them with brain decomposition.`;
                        fight += `\n\n`;
                        health[p2] -= 200;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      } else {
                        fight += `<@${players[a]}> unfortunately doesn't survive the javascript exposure.`;
                        fight += `\n\n`;
                        health[a] -= 200;
                        diedThisRound += `✝️ <@${players[a]}>`;
                        diedThisRound += `\n`;      
                      }
                    } else if (slipper[a] == true) {
                      fight += `<@${players[a]}> equips, aims, and fires slipper at <@${players[p2]}>. La Chancla wins.`;
                      fight += `\n\n`;
                      health[p2] -= 300;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (metronome[a] == true) {
                      fight += `<@${players[a]}> throws a metronome at <@${players[p2]}>.`;
                      fight += `\n\n`;
                      health[p2] -= 180;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (pinklightsaber[a] == true) {
                      fight += `<@${players[a]}> flips their hair, and swings a pink lightsaber at <@${players[p2]}> while twerking. _Slayyyyy_.`;
                      fight += `\n\n`;
                      health[p2] -= 150;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (bananapeellauncher[a] == true) {
                      fight += `<@${players[a]}> shoots bananas at <@${players[p2]}>, who slips and falls on their head.`;
                      fight += `\n\n`;
                      health[p2] -= 300;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (masterball[a] == true) {
                      fight += `<@${players[a]}> throws a masterball at <@${players[p2]}>. Player was caught!`;
                      fight += `\n\n`;
                      health[p2] -= 180;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (curry[a] == true) {
                      fight += `<@${players[a]}> gains Herculean strength after eating curry and squeezes <@${players[p2]}>'s skull like a ripe tomato.`;
                      fight += `\n\n`;
                      health[p2] -= 200;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (deathnote[a] == true) {
                      fight += `<@${players[a]}> write's <@${players[p2]}> name in the Death Note.`;
                      fight += `\n\n`;
                      health[p2] -= 500;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (roulettegun[a] == true) {
                      fight += `<@${players[a]}> ties <@${players[p2]}> to a chair, but promises to let them go if the first round is a blank. The first round goes off with a resounding bang, leaving blood everywhere.`;
                      health[p2] -= 150;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                      fight += `\n\n`;
                    } else if (pokemonattack[a] == true) {
                      if (pokemonChoice == 0) {
                        fight += `<@${players[a]}> Charizard attacks <@${players[p2]}> with Flamethrower.`;
                        fight += `\n\n`;
                        health[p2] -= 150;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      } else if (pokemonChoice == 1) {
                        fight += `<@${players[a]}> Gengar attacks <@${players[p2]}> with Shadow Ball.`;
                        fight += `\n\n`;
                        health[p2] -= 150;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      } else if (pokemonChoice == 2) {
                        fight += `Mewtwo acknowledges <@${players[a]}>'s command and attacks <@${players[p2]}> with Psystrike.`;
                        fight += `\n\n`;
                        health[p2] -= 150;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      } else {
                        fight += `<@${players[a]}> Mew attacks <@${players[p2]}> with kindness. Oh No!`;
                        fight += `\n\n`;
                        health[p2] -= 300;
                        diedThisRound += `✝️ <@${players[p2]}>`;
                        diedThisRound += `\n`;      
                      }
                    } else if (pokemonheal[a] == true) {
                      fight += `<@${players[a]}>'s pokemon gives them a stat boost. They tickle <@${players[p2]}> to death.`;
                      fight += `\n\n`;
                      health[p2] -= 300;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (barehands[a] == true) {
                      fight += `<@${players[a]}> gets into a fistfight with <@${players[p2]}>.`;
                      fight += `\n\n`;
                      health[p2] -= 200;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (kcookie[a] == true) {
                      fight += `<@${players[a]}> gives ketchup cookies to <@${players[p2]}>. They die.`;
                      fight += `\n\n`;
                      health[p2] -= 200;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    } else if (excalibur[a] == true) {
                      fight += `<@${players[a]}> attacks <@${players[p2]}> with the Excalibur. But it's not the Excookiebur, so it hurts the player instead.`;
                      fight += `\n\n`;
                      health[a] -= 200;
                      diedThisRound += `✝️ <@${players[a]}>`;
                      diedThisRound += `\n`;    
                    } else {
                      fight += `<@${players[a]}> sucker punches <@${players[p2]}>`;
                      fight += `\n\n`;
                      health[p2] -= 190;
                      diedThisRound += `✝️ <@${players[p2]}>`;
                      diedThisRound += `\n`;    
                    }
                    gotChance = true;
                  }         
                }
                else if (round!= 1 && choice < 2) { //single player fights day 
                  one = true;
                  two = false;

                  let weaponChoice = getRandomInt(39);

                  if (weaponChoice == 0) {
                    coconut[a] = true;
                    fight += `<@${players[a]}> discovered Desireus' coconuts!`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 1) {
                    axe[a] = true;
                    fight += `<@${players[a]}> came upon an axe, but are not sure how to use it.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 2) {
                    pistol[a] = true;
                    fight += `<@${players[a]}> found a pistol!`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 3) {
                    knife[a] = true;
                    fight += `<@${players[a]}> found a small kitchen knife.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 4) {
                    cookies[a] = true;
                    fight += `<@${players[a]}> took a risk and broke into Elp's office and stole a few cookies.`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 5) {
                    bow[a] = true;
                    fight += `<@${players[a]}> finds a bow and some arrows.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 6) {
                    excookiebur[a] = true;
                    fight += `After an intense adventure, <@${players[a]}> rediscovers the legendary sword Excookiebur!`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 7) {
                    mace[a] = true;
                    fight += `<@${players[a]}> chances upon a sturdy mace.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 8) {
                    ratofdoom[a] = true;
                    fight += `<@${players[a]}> does a very pathetic looking dance. An old, worn-out rubber rat falls on the ground afterwards.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 9) {
                    blueguitar[a] = true;
                    fight += `Showing immense loyalty to HF, <@${players[a]}> choose to weild a blue guitar as their weapon.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 10) {
                    banhammer[a] = true;
                    fight += `After distracting Wynn from her office with a cake, <@${players[a]}> steals the ban hammer!`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 11) {
                    javascript[a] = true;
                    fight += `<@${players[a]}> encounters Javascript in the wild. This could go either ways...`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 12) {
                    slipper[a] = true;
                    fight += `<@${players[a]}> finds mom's slippers.`;
                    fight += `\n\n`;
                    health[a] -= 2 * round;
                  }
                  if (weaponChoice == 13) {
                    metronome[a] = true;
                    fight += `After counting a 17/16 time signature correctly, <@${players[a]}> gets blessed with a metronome.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 14) {
                    pinklightsaber[a] = true;
                    fight += `<@${players[a]}> ignores everything else to grab a hot pink lightsaber even though its faulty.`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 15) {
                    bananapeellauncher[a] = true;
                    fight += `<@${players[a]}> slips into an alternate dimension. When they return, they have a pink mohawk and a banana peel launcher.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 16) {
                    masterball[a] = true;
                    fight += `Walking in the long grass, <@${players[a]}> finds a masterball.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 17) {
                    curry[a] = true;
                    fight += `<@${players[a]}> sings Bhaag Bhaag DK Bose perfectly and is blessed with a bowl of curry!`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 18) {
                    deathnote[a] = true;
                    fight += `While trying to find a secure place to poop, <@${players[a]}> discovers the Death Note! But is it safe?`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 19) {
                    roulettegun[a] = true;
                    fight += `<@${players[a]}> starts praying for luck, after finding a Roulette Gun.`;
                    fight += `\n\n`;
                    health[a] -= 4 * round;
                  }
                  if (weaponChoice == 20) {
                    pokemonattack[a] = true;
                    let pokemonChoice = getRandomInt(3);
                    if (pokemonChoice == 0) {
                      fight += `<@${players[a]}> captures a wild Charizard!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                    if (pokemonChoice == 1) {
                      fight += `<@${players[a]}> captures a wild Gengar!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                    if (pokemonChoice == 2) {
                      fight += `<@${players[a]}> captures a wild Mewtwo!`;
                      fight += `\n\n`;
                      health[a] -= 2 * round;
                    }
                  }
                  if (weaponChoice == 21) {
                    pokemonheal[a] = true;
                    let pokemonChoice = getRandomInt(3);
                    if (pokemonChoice == 0) {
                      fight += `<@${players[a]}> captures a wild Snorlax!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                    if (pokemonChoice == 1) {
                      fight += `<@${players[a]}> captures a wild Torchic!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                    if (pokemonChoice == 2) {
                      fight += `<@${players[a]}> captures a wild Mew!`;
                      fight += `\n\n`;
                      health[a] -= 3 * round;
                    }
                  }
                  if (weaponChoice == 22) {
                    kcookie[a] = true;
                    fight += `After a huge fight with Snowy, <@${players[a]}> obtains ketchup cookies!`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 23) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> tries to secure a weapon but ends up taking damage instead.`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 24) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> gets some rest.`;
                    fight += `\n\n`;
                  }
                  if (weaponChoice == 25) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> cooks a meal using stolen food from the staff kitchen.`;
                    fight += `\n\n`;
                  }
                  if (weaponChoice == 26) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> tries climbing a tree to set up camp but falls and gets hurt.`;
                    fight += `\n\n`;
                    health[a] -= 5 * round;
                  }
                  if (weaponChoice == 27) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> harvests broccoli.`;
                    fight += `\n\n`;
                  }
                  if (weaponChoice == 28) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> accidentally collected poisoned water to drink.`;
                    fight += `\n\n`;
                    health[a] -= 10 * round;
                  }
                  if (weaponChoice == 29) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> cries while thinking about home.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 30) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> burns themselves while trying to start a fire.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 31) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> harvests some corn.`;
                    fight += `\n\n`;
                  }
                  if (weaponChoice == 32) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> dosen't give a shit about their surroundings and sleeps`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 33) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> carefully selects a good sleeping spot to rest.`;
                    fight += `\n\n`;
                  }
                  if (weaponChoice == 34) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> finds a backpack full of medicines and first-aid.`;
                    fight += `\n\n`;
                    health[a] += 3 * round;
                  }
                  if (weaponChoice == 35) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> finds a backpack but its booby trapped.`;
                    fight += `\n\n`;
                    health[a] -= 6 * round;
                  }
                  if (weaponChoice == 36) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> dosen't give a shit about their surroundings and sleeps.`;
                    fight += `\n\n`;
                    health[a] -= 3 * round;
                  }
                  if (weaponChoice == 37) {
                    excalibur[a] = true;
                    fight += `<@${players[a]}> finds Excalibur but no one really cares cuz it's not Excookiebur.`;
                    fight += `\n\n`;
                    health[a] -= 1 * round;
                  }
                  if (weaponChoice == 38) {
                    barehands[a] = true;
                    fight += `<@${players[a]}> explores the surroundings.`;
                    fight += `\n\n`;
                  }
                  gotChance = true;
                } 
                else
                { //two player fights day
                  two = true;
                  one = false;

                  let b = getRandomInt(playersNo);
                  if (b != a && alive[b] == true) {
                    if (coconut[a] == true) {
                      fight += `<@${players[a]}> climbs a tree and starts throwing coconuts at <@${players[b]}>.`;
                      fight += `\n\n`;
                      health[b] -= 8 * round;
                    } else if (axe[a] == true) {
                      let axeChance = getRandomInt(2);
                      if (axeChance <= 1){
                        fight += `<@${players[a]}> figures out how to use an axe by practicing on <@${players[b]}>.`;
                        fight += `\n\n`;
                        health[b] -= 8 * round;
                      } else {
                        fight += `<@${players[a]}> tries using an axe on <@${players[b]}> but doesn't quite get it right.`;
                        fight += `\n\n`;
                        health[b] -= 4 * round;
                        health[a] -= 4 * round;
                      }
                    } else if (pistol[a] == true) {
                      fight += `<@${players[a]}> tries to shoot <@${players[b]}> with their pistol.\n\n`;
                      fight += `\n\n`;
                      let pistolChance = getRandomInt(10);
                      health[b] -= pistolChance * round;
                    } else if (cookies[a] == true) {
                      let cookieChance = getRandomInt(3);
                      if (cookieChance <= 1) {
                        fight += `<@${players[a]}> gives <@${players[b]}> cookies laced with posion.`;
                        fight += `\n\n`;
                        health[b] -= 10 * round;
                      } else if (cookieChance == 2) {
                        fight += `<@${players[a]}> uses cookies to distract <@${players[b]}> and runs away. Fucking coward.\n\n`;
                        fight += `\n\n`;
                      } else {
                        fight += `<@${players[a]}> tries to distract <@${players[b]}> with cookies, fails miserably, and loses the cookies.`;
                        fight += `\n\n`;
                        health[a] -= 2 * round;
                      }
                    } else if (excookiebur[a] == true) {
                      fight += `<@${players[a]}> attacks <@${players[b]}> with the legendary sword Excookiebur. <@${players[b]}> fucking dies.`;
                      fight += `\n\n`;
                      health[b] -= 100;
                    } else if (bow[a] == true) {
                      fight += `<@${players[a]}> fires some blunt arrows on <@${players[b]}>.`;
                      fight += `\n\n`;
                      health[b] -= 5 * round;
                    } else if (mace[a] == true) {
                      fight += `<@${players[a]}> swings their mace at <@${players[b]}> hitting their butt. Ouch.`;
                      fight += `\n\n`;
                      health[b] -= 5 * round;
                    } else if (ratofdoom[a] == true) {
                      fight += `<@${players[a]}> swings the rubber rat at <@${players[b]}>, emitting a menacing squeaking sound.`;
                      fight += `\n\n`;
                      health[b] -= 1 * round;
                    } else if (blueguitar[a] == true) {
                      fight += `<@${players[a]}> ABSOLUTELY SMASHES their blueguitar on <@${players[b]}> head, Kurt Cobain style.`;
                      fight += `\n\n`;
                      health[b] -= 5 * round;
                    } else if (banhammer[a] == true) {
                      fight += `<@${players[a]}> attempts an attack on <@${players[b]}> with their banhammer.`;
                      fight += `\n\n`;
                      health[b] -= 3 * round;
                    } else if (javascript[a] == true) {
                      let jchance = getRandomInt(2);
                      if (jchance <= 1) {
                        fight += `<@${players[a]}> throws javascript code at <@${players[b]}> instantly killing them with brain decomposition.`;
                        fight += `\n\n`;
                        health[b] -= 100;
                      } else {
                        fight += `<@${players[a]}> unfortunately doesn't survive the javascript exposure.`;
                        fight += `\n\n`;
                        health[a] -= 100;
                      }
                    } else if (slipper[a] == true) {
                      fight += `<@${players[a]}> equips, aims, and fires slipper at <@${players[b]}>. La Chancla wins.`;
                      fight += `\n\n`;
                      health[b] -= 3 * round;
                    } else if (metronome[a] == true) {
                      fight += `<@${players[a]}> throws a metronome at <@${players[b]}>.`;
                      fight += `\n\n`;
                      health[b] -= 2 * round;
                    } else if (pinklightsaber[a] == true) {
                      fight += `<@${players[a]}> flips their hair, and swings a pink lightsaber at <@${players[b]}> while twerking. It is not very effective, but the twerking gets them some pity.`;
                      fight += `\n\n`;
                      health[b] -= 1 * round;
                    } else if (bananapeellauncher[a] == true) {
                      fight += `<@${players[a]}> shoots banana peels at <@${players[b]}>, causing them to slip.`;
                      fight += `\n\n`;
                      health[b] -= 7 * round;
                    } else if (masterball[a] == true) {
                      fight += `<@${players[a]}> throws a masterball at <@${players[b]}>. Player was caught!`;
                      fight += `\n\n`;
                      health[b] -= 100;
                    } else if (curry[a] == true) {
                      fight += `<@${players[a]}> scares off <@${players[b]}> by munching curry and getting an instant strength boost.`;
                      fight += `\n\n`;
                      health[a] += 2 * round;
                    } else if (deathnote[a] == true) {
                      fight += `<@${players[a]}> write's <@${players[b]}> name in the Death Note.`;
                      fight += `\n\n`;
                      health[b] -= 100;
                    } else if (roulettegun[a] == true) {
                      let gunChance = getRandomInt(6);
                      fight += `<@${players[a]}> ties <@${players[b]}> to a chair, but promises to let them go if the first round is a blank.`;
                      fight += `\n\n`;
                      if (gunChance == 1) {
                        health[b] -= 100;
                      }
                    } else if (pokemonattack[a] == true) {
                      if (pokemonChoice == 0) {
                        fight += `<@${players[a]}> Charizard attacks <@${players[b]}> with Flamethrower.`;
                        fight += `\n\n`;
                        health[b] -= 5 * round;
                      } else if (pokemonChoice == 1) {
                        fight += `<@${players[a]}> Gengar attacks <@${players[b]}> with Shadow Ball.`;
                        fight += `\n\n`;
                        health[b] -= 5 * round;
                      } else if (pokemonChoice == 2) {
                        fight += `<@${players[a]}> Mewtwo attacks everyone in the area with Psystrike.`;
                        fight += `\n\n`;
                        health[a] -= 100;
                        health[a] += 1;
                        health[b] -= 100;
                      } else {
                        fight += `<@${players[a]}> Mew attacks <@${players[b]}> but it's not very effective.`;
                        fight += `\n\n`;
                        health[b] -= 3 * round;
                      }
                    } else if (pokemonheal[a] == true) {
                      fight += `<@${players[a]}> pokemon helps them heal and protects them from damage.`;
                      fight += `\n\n`;
                      health[a] += 3 * round;
                    } else if (barehands[a] == true) {
                      fight += `<@${players[a]}> gets into a fistfight with <@${players[b]}>.`;
                      fight += `\n\n`;
                      health[b] -= 1 * round;
                    } else if (kcookie[a] == true) {
                      fight += `<@${players[a]}> gives ketchup cookies to <@${players[b]}>.`;
                      fight += `\n\n`;
                      health[a] -= 2 * round;
                    } else if (excalibur[a] == true) {
                      fight += `<@${players[a]}> attacks <@${players[b]}> with the Excalibur. But it's not the Excookiebur, so it hurts the player instead.`;
                      fight += `\n\n`;
                      health[a] -= 2 * round;
                    } else {
                      fight += `<@${players[a]}> sucker punches <@${players[b]}>`;
                      fight += `\n\n`;
                      health[b] -= 7 * round;
                    }
                    gotChance = true;
                  } else {
                    fight += `<@${players[a]}> scouts for people to fight, but gets distracted by an unsupervised cookie.`;
                    fight += `\n\n`;
                  }                  
                }
                one = false;
                two = false;
                
                if (health[a] <=0)
                {
                  diedThisRound += `✝️ <@${players[a]}>`;
                  diedThisRound += `\n`;
                }
              }
            }
            let dayEmbed = "";
            if (fight != "" && round != 1) {
              dayEmbed = new EmbedBuilder()
                .setTitle("🏹 Hunger Games 🏹 \nDay " + round)
                .setDescription(fight)
                .setColor(0x953d59);
            } 
            else if (fight != "" && round == 1) {
              dayEmbed = new EmbedBuilder()
              .setTitle("🏹 Hunger Games 🏹 \nThe Cornucopia")
              .setDescription(fight)
              .setColor(0x953d59);
            }
            else {
              fight = "**Ozzy** sings Crazy Train";
              dayEmbed = new EmbedBuilder()
                .setTitle("🏹 Hunger Games 🏹 \nDay " + round)
                .setDescription(fight)
                .setColor(0x953d59);
            }

            dayy = await interaction.followUp({
              embeds: [dayEmbed],
              components: [main],
            });

            const dayConfirmation = await dayy.awaitMessageComponent({
              filter: dcollectorFilter,
              time: 300000  // 5 minutes
            }).catch((error) => {
              console.error("Game timed out.", error);
              interaction.followUp({ content: "You silly goose, you made the game timeout. Ping scorp to fix.", components: [] });
              workingHG = false; // Reset the game state
            });
            
            if (dayConfirmation.customId === "next") {
              fight = "";
              for (let k = 0; k < playersNo; k++) {
                gotChance[k] = false;
              }

              await dayConfirmation.update({ components: [donee] });

              aliveCounter = 0;
              cannonCount = 0;
              for (let g = 0; g < playersNo; g++) {
                if (health[g] > 0) {
                  aliveCounter++;
                } else {
                  cannonCount++;
                }
              }
              
              let eventRandom = (round % 2 === 0);

              if (eventRandom == true && aliveCounter > 2) {
                let arenaDeaths = 0;
                for (let q = 0; q < playersNo; q++) {
                  if (alive[q] == true && health[q] > 0 && aliveCounter > 2) {
                    arenaEvent = getRandomInt(10);
                    if (arenaEvent == 0) { //Elp
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        aliveCounter--;
                        arenaDeaths++;
                        health[q] = -100;
                        arenaMsg += `\n\n 🪦<@${players[q]}> tells Elp that he's not the greatest. Elp publicly executes <@${players[q]}>`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> exposed the underground staff food black market. Elp rewards <@${players[q]}>.`;
                      }
                    } else if (arenaEvent == 1) { //Ayan
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> claims that Summer Bash is not a real trophy. Ayan impales them with his pencil.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> calls Ayan a curry muncher and receives Ayan Hats as a reward.`;
                      }
                    } else if (arenaEvent == 2) { //Scorp
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> publicly states that rock music is the worst genre. Scorp smashes a fucking grand piano on their head.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> listens to rock music for morale. Scorp notices and brews a coffee for them.`;
                      }
                    } else if (arenaEvent == 3) { //Wynn
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> wanders into Wynn's corn maze, gets lost and screams for help. Soon, the only sound left is zombies munching on bones.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> calls Wynn a curry muncher. Wynn is overjoyed and bakes them a cake.`;
                      }
                    } else if (arenaEvent == 4) { //Snowy
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> gets sued and hires Snowy as their lawyer. She causes legal damages and <@${players[q]}> now owes **Elp** their soul.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ Snowy lets <@${players[q]}> pet Petunia.`;
                      }
                    } else if (arenaEvent == 5) { //Maya
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> says they would make a better Twin Oreo than Snowy. Maya creates a sonic boom in the process of slapping them.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ Maya bought <@${players[q]}> a gourmet lollipop!`;
                      }
                    } else if (arenaEvent == 6) { //Diwix
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> says that Diwix isn't a real curry muncher.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> spams Diwix's DMs with memes.`;
                      }
                    } else if (arenaEvent == 7) { //Nell
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> makes Nell's bruschetta recipe but adds curry to it. Nell uses a dental drill to slowly burrow into their brain.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;        
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> buys some teeth from Nell to snack on, giving them energy.`;
                      }
                    } else if (arenaEvent == 8) { //Joe
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> says that Joe is very American. Joe responds as a true patriot by invading their home and taking all their oil.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> helps Joe in getting some stuff done.`;
                      }
                    }  else if (arenaEvent == 9) { //Geo
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> gets forced to pull Santa Geo's sleigh, which proves fatal.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> buys invests in GeoCoin. Geo sneaks into their home at night and leaves them some gifts.`;
                      }
                    } else if (arenaEvent == 10) { //Beasto
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> dies of cringe during a conversation with Beasto.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> calls Beasto a monkey.`;
                      }
                    } else if (arenaEvent == 11) { //Jo
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> gets accidentally eaten by Jo. Was it really an accident? We'll never know.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> does a headstand and says Tasty. Jo is happy that he finally found someone he can relate to.`;
                      }
                    } else if (arenaEvent == 12) { //Zenishira
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> trash talks all of Zenishira's favourite games... it does not end well.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ <@${players[q]}> has an at-length conversation with Zenishira about games and personality types.`;
                      }
                    } else if (arenaEvent == 13) { //Diwix
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦<@${players[q]}> tries stealing Diwix's curry stocks but gets caught.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ Diwix rewards <@${players[q]}> for agreeing that Bose DK is the best army.`;
                      }
                    } else if (arenaEvent == 14) { //Ru
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦 Ru is feeling sleepy, she accidentally drops a fucking building on <@${players[q]}> while yawning.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ Ru and <@${players[q]}> sing along to cringe Indian DJ songs.`;
                      }
                    } else if (arenaEvent == 15) { //Ru
                      let surviveOrDeath = getRandomInt(5);
                      if (surviveOrDeath <= 3 && arenaDeaths < 2) {
                        health[q] = -100;
                        aliveCounter--;
                        arenaDeaths++;
                        arenaMsg += `\n\n 🪦 Ru is feeling sleepy, she accidentally drops a fucking building on <@${players[q]}> while yawning.`;
                        diedThisRound += `✝️ <@${players[q]}>`;
                        diedThisRound += `\n`;
                      } else {
                        gotChance[q] = true;
                        arenaMsg += `\n\n ✨ Ru and <@${players[q]}> sing along to Bollywood songs.`;
                      }
                    } 
                  }
                  aliveCounter = 0;
                  eventRandom = 0;
                  deadMSG = "";
                  deadPeopleList = "";
                  for (let q = 0; q < playersNo; q++) {
                    if (health[q] <= 0) {
                      deadPeopleList += `\n\n ✝️ <@${players[q]}>`;
                      cannonCount++;
                    }
                    if (health[q] > 0) {
                      deadMSG += `\n\n <@${players[q]}>`;
                      aliveCounter++;
                    }
                  }
                }
                cannonCount = 0;
                for (let g = 0; g < playersNo; g++) {
                  if (health[g] <= 0) {
                    alive[g] == false;
                    cannonCount++;
                  }
                  else {
                    aliveCounter++;
                  }
                }

                const arenaEmbed = new EmbedBuilder()
                  .setTitle("🏹 Hunger Games 🏹 \nThe Arena")
                  .setDescription("**Events of The Arena: **" + arenaMsg)
                  .setColor(0x953d59);

                arenaa = await interaction.followUp({
                  embeds: [arenaEmbed],
                  components: [main],
                });
                const arenaConfirmation = await arenaa.awaitMessageComponent({
                  filter: dcollectorFilter,
                  time: 300000  // 5 minutes
                }).catch((error) => {
                  console.error("Game timed out.", error);
                  interaction.followUp({ content: "You silly goose, you made the game timeout. Ping scorp to fix.", components: [] });
                  workingHG = false; // Reset the game state
                });

                if (arenaConfirmation.customId === "next") {
                  arenaConfirmation.update({ components: [donee] });
                  if (cannonCount == 1) {
                    const deadEmbed = new EmbedBuilder()
                      .setTitle("🏹 Hunger Games 🏹 \n Cannons\n\n")
                      .setDescription(`${cannonCount} Cannon can be heard in the distance.  \n${diedThisRound}`)
                      .setColor(0x953d59);

                    deathh = await interaction.followUp({
                      embeds: [deadEmbed],
                      components: [main],
                    });
                    cannonCount = 0;
                  } else if (cannonCount > 1) {
                    const deadEmbed = new EmbedBuilder()
                      .setTitle("🏹 Hunger Games 🏹 \n Cannons\n\n")
                      .setDescription(`${cannonCount} Cannons can be heard in the distance.  \n${diedThisRound}`)
                      .setColor(0x953d59);

                    deathh = await interaction.followUp({
                      embeds: [deadEmbed],
                      components: [main],
                    });
                    cannonCount = 0;
                  } else {
                    const deadEmbed = new EmbedBuilder()
                      .setTitle("🏹 Hunger Games 🏹 \n Cannons\n\n")
                      .setDescription("No Cannons can be heard.")
                      .setColor(0x953d59);

                    deathh = await interaction.followUp({
                      embeds: [deadEmbed],
                      components: [main],
                    });
                  }
                }
                for (let g = 0; g < playersNo; g++) {
                  if (health[g] <= 0) {
                    alive[g] == false;
                  }
                }
              } else {
                aliveCounter = 0;
                deadPeopleList = "";
                deadMSG = "";
                for (let q = 0; q < playersNo; q++) {
                  if (health[q] <= 0) {
                    deadPeopleList += `\n\n ✝️ <@${players[q]}>`;
                    cannonCount++;
                  }
                  if (health[q] > 0) {
                    deadMSG += `\n\n <@${players[q]}>`;
                    aliveCounter++;
                  }
                }
                if (aliveCounter == 0) {
                  const noDeadEmbed = new EmbedBuilder()
                    .setTitle("Resurrection Event")
                    .setDescription("<@1255303549353726032> is back online, happy that he is winning the game.")
                    .setColor(0x953d59);

                  deathh = await interaction.followUp({
                    embeds: [noDeadEmbed],
                    components: [main],
                  });
                } else if (aliveCounter == 1) {
                  const deadEmbed = new EmbedBuilder()
                    .setTitle("🏹 Hunger Games 🏹 \n Cannons\n\n")
                    .setDescription("People who are dead: \n" + diedThisRound)
                    .setColor(0x953d59);

                  deathh = await interaction.followUp({
                    embeds: [deadEmbed],
                    components: [main],
                  });
                } else {
                  const deadEmbed = new EmbedBuilder()
                    .setTitle("🏹 Hunger Games 🏹 \n Cannons\n\n")
                    .setDescription("People who are dead: \n" + diedThisRound)
                    .setColor(0x953d59);

                  deathh = await interaction.followUp({
                    embeds: [deadEmbed],
                    components: [main],
                  });
                }
              }
            }

            for (let g = 0; g < playersNo; g++) {
              if (health[g] <= 0) {
                alive[g] == false;
              }
            }

            const deathConfirmation = await deathh.awaitMessageComponent({
              filter: dcollectorFilter,
              time: 300000  // 5 minutes
            }).catch((error) => {
              console.error("Game timed out.", error);
              interaction.followUp({ content: "You silly goose, you made the game timeout. Ping scorp to fix.", components: [] });
              workingHG = false; // Reset the game state
            });

            for (let q = 0; q < playersNo; q++) {
              gotChance[q] = false;
            }

            if (deathConfirmation.customId === "next") {
              aliveCounter = 0;
          
              for (let g = 0; g < playersNo; g++) { //night event assigning loop begins
                  if (health[g] > 0) {
                      aliveCounter++;
                  }
              }
              if (aliveCounter >= 1) {
                  for (let q = 0; q < playersNo; q++) {
                      gotChance[q] = false;
                  }
                  for (let a = 0; a < playersNo; a++) 
                    {          
                      if (health[a] > 0) {
                          let nightChoice = getRandomInt(27);
          
                          if (nightChoice == 0) {
                              nightFight += `<@${players[a]}> received medicines from an unknown Sponsor`;
                              nightFight += `\n\n`;
                              health[a] += 25;
                          } else if (nightChoice == 1) {
                              nightFight += `<@${players[a]}> sings in the quietness of night, fills the surrounding with temporary peace`;
                              nightFight += `\n\n`;
                              health[a] += 20;
                              gotChance[a] = true;
                          } else if (nightChoice == 2) {
                              let b2 = getRandomInt(playersNo);
                              if ( b2 == a && a == playersNo-1 ) { b2--; }
                              if ( b2 == a && a <= playersNo-1 ) { b2++;}
                              nightFight += `<@${players[a]}> pulls out a phone that they hid in their butt, to watch a video of <@${players[b2]}> that they recorded secretly.`;
                              nightFight += `\n\n`;
                              health[a] += 5;
                              gotChance[a] = true;
                          } else if (nightChoice == 3) {
                              nightFight += `<@${players[a]}> dreams of winning the Legends Cup.`;
                              nightFight += `\n\n`;
                              health[a] += 10;
                              gotChance[a] = true;
                          } else if (nightChoice == 4) {
                              nightFight += `<@${players[a]}> tries to find a way to sneak into Elp's bedroom... 😳`;
                              nightFight += `\n\n`;
                              health[a] += 1 * round;
                              gotChance[a] = true;
                          } 
                          else if (nightChoice == 5) 
                            {
                              let b3 = 0; 
                              do{
                                b3 = getRandomInt(playersNo);
                              } while (health[b3] <= 0 || b3 == a)     
                              if (health[b3] > 0) {
                                  nightFight += `<@${players[a]}> is sleeping in turns with <@${players[b3]}>`;
                                  nightFight += `\n\n`;
                                  health[a] += 10;
                                  health[b3] += 10;
                                  gotChance[a] = true;
                              } else {
                                  nightFight += `<@${players[a]}> struggles with their trauma all alone`;
                                  nightFight += `\n\n`;
                                  health[a] -= 5;
                                  gotChance[a] = true;
                              }
                          } else if (nightChoice == 6) {
                              nightFight += `<@${players[a]}> comes back from the mines alive`;
                              nightFight += `\n\n`;
                              health[a] += 10;
                              gotChance[a] = true;
                          } else if (nightChoice == 7) {
                              nightFight += `<@${players[a]}> receives a message from <@532991839238750243>, and goes to sleep looking confident.`;
                              nightFight += `\n\n`;
                              health[a] += 10;
                              gotChance[a] = true;
                          }
                          else if (nightChoice == 8) {
                            nightFight += `<@${players[a]}> considers the chances of escaping the game if they complain hard enough.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 9) {
                            nightFight += `<@${players[a]}> considers the chances of escaping the game if they complain hard enough.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 10) {
                            nightFight += `<@${players[a]}> remembers the times when they would steal Snowy's office doors and blame some staff member for it.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 11) {
                            nightFight += `<@${players[a]}> contemplates the state of equality among Helpers, and how Elp is slightly more equal than the others.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 12) {
                            let b3 = 0; 
                            do{
                              b3 = getRandomInt(playersNo);
                            } while (health[b3] <= 0 || b3 == a)                 
                            if (health[b3] > 0) {
                                nightFight += `<@${players[a]}> cuddles with <@${players[b3]}> near a campfire.`;
                                nightFight += `\n\n`;
                                health[a] += 10;
                                health[b3] += 10;
                                gotChance[a] = true;
                            } else {
                                nightFight += `<@${players[a]}> cannot find anyone to cuddle with and sleeps alone.`;
                                nightFight += `\n\n`;
                                health[a] -= 5;
                                gotChance[a] = true;
                            }
                          }
                          else if (nightChoice == 13) {
                            nightFight += `<@${players[a]}> writes an event post for the HF website, because even when your life is in danger, staff work must be done.`;
                            nightFight += `\n\n`;
                            health[a] += 15;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 14) {
                            nightFight += `The new-age HF Exodus is happening, with <@${players[a]}> at the center of it! They almost get the Legend medal, but then they woke up.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 15) {
                            nightFight += `<@${players[a]}> hides from the mini mods.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 16) {
                            let b3 = 0; 
                            do{
                              b3 = getRandomInt(playersNo);
                            }while (health[b3] <= 0 || b3 == a)                      
                            if (health[b3] > 0) {
                                nightFight += `<@${players[b3]}> promises to sleep with <@${players[a]}> for mutual protection, but then ghosts them.`;
                                nightFight += `\n\n`;
                                health[a] += 10;
                                health[b3] += 10;
                                gotChance[a] = true;
                            } else {
                                nightFight += `<@${players[a]}> contemplates life.`;
                                nightFight += `\n\n`;
                                health[a] -= 5;
                                gotChance[a] = true;
                            }
                          } 
                          else if (nightChoice == 17) {
                            let b3 = 0; 
                            do {
                              b3 = getRandomInt(playersNo);
                            }while (health[b3] <= 0 || b3 == a)
                            if (health[b3] > 0) {
                                nightFight += `<@${players[a]}> abandons <@${players[b3]}> after they fell in a ditch.`;
                                nightFight += `\n\n`;
                                health[a] += 10;
                                health[b3] += 10;
                                gotChance[a] = true;
                            } else {
                                nightFight += `<@${players[a]}> eats puffle pizza.`;
                                nightFight += `\n\n`;
                                health[a] -= 5;
                                gotChance[a] = true;
                            }
                          }
                          else if (nightChoice == 18) {
                            let b3 = 0; 
                            do {
                              b3 = getRandomInt(playersNo);
                            }while (health[b3] <= 0 || b3 == a)
                            if (health[b3] > 0) {
                                nightFight += `<@${players[a]}> takes turns sleeping with <@${players[b3]}>, but <@${players[b3]}>'s constant sleep-farting makes them run away.`;
                                nightFight += `\n\n`;
                                health[a] += 10;
                                health[b3] += 10;
                                gotChance[a] = true;
                            } else {
                                nightFight += `<@${players[a]}> tries some beans that burn their tongue.`;
                                nightFight += `\n\n`;
                                health[a] -= 5;
                                gotChance[a] = true;
                            }
                          }
                          else if (nightChoice == 19) {
                              nightFight += `<@${players[a]}> stalks the Commanders, noting their every move for future reference.`;
                              nightFight += `\n\n`;
                              health[a] += 5;
                              gotChance[a] = true;
                            }
                          else if (nightChoice == 20) {
                            nightFight += `<@${players[a]}> finds an abandoned cow.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 21) {
                            nightFight += `<@${players[a]}> pets some cats.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 22) {
                            nightFight += `<@${players[a]}> pets some dogs.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 23) {
                            nightFight += `<@${players[a]}> chills with Jo.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 24) {
                            nightFight += `<@${players[a]}> chills with Beasto.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 25) {
                            nightFight += `<@${players[a]}> chills with Diwix.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                          else if (nightChoice == 26) {
                            nightFight += `<@${players[a]}> chills with Scorp.`;
                            nightFight += `\n\n`;
                            health[a] += 5;
                            gotChance[a] = true;
                          }
                      }
                  }
              }
              let nightEmbed = new EmbedBuilder()
                  .setTitle("🏹 Hunger Games 🏹 \nNight " + round)
                  .setDescription(`\n` + nightFight)
                  .setColor(0x953d59);
          
              await deathConfirmation.update({ components: [donee] });
              nightt = await interaction.followUp({
                  embeds: [nightEmbed],
                  components: [main],
              });
              for (let g = 0; g < playersNo; g++) {
                  if (health[g] <= 0) {
                      alive[g] == false;
                  }
              }
              aliveCounter = 0;
              dead = {};
          }
          
          const nighttConfirmation = await nightt.awaitMessageComponent({
              filter: dcollectorFilter,
              time: 300000  // 5 minutes
            }).catch((error) => {
              console.error("Game timed out.", error);
              interaction.followUp({ content: "You silly goose, you made the game timeout. Ping scorp to fix.", components: [] });
              workingHG = false; // Reset the game state
          });
          if (nighttConfirmation.customId === "next") {
              nighttConfirmation.update({ components: [donee] });
              nightFight = "";          
              round++;
              for (let q = 0; q < playersNo; q++) {
                  gotChance[q] = false;
              }
          }
          
            aliveCounter = 0;
            winner = 0;
            arenaMsg = "";
            deadPeopleList = "";
              
            for (let z = 0; z < playersNo; z++) {
              if (alive[z] == true && health[z] > 0) {
                aliveCounter++;
                winner = players[z];
                pfp = pfpArr[z];
                winnerHealthNo = z;
              }
            }

            if (aliveCounter == 1) {
              finish = true;
            } else if (aliveCounter == 0) {
              finish = true;
              botWon = true;
            } else {
              finish = false;
            }
          }

          let winnerEmbed = {};
          if (finish == true && botWon == false) {
            if (winner == "1255303549353726032") {
              winnerEmbed = new EmbedBuilder()
                .setTitle("🥳 Winner 🥳")
                .setDescription(`**<@${winner}>**\n\n Health: ${health[winnerHealthNo]}\n\n Congratulations!`)
                .setImage(message.author.displayAvatarURL())
                .setColor(0x953d59)
                .setFooter({ text: `Scorp: "I swear I haven't rigged the game to let Ozzy win, the players were just too nooby."` });
            } else {
              winnerEmbed = new EmbedBuilder()
                .setTitle("🥳 Winner 🥳")
                .setDescription(`**<@${winner}>**\n\n Health: ${health[winnerHealthNo]}\n\n Congratulations!`)
                .setImage(pfp)
                .setColor(0x953d59)
                .setFooter({ text: `Game Developed with ♥️, sweat, blood and tears by Scorp and Ayan.`});
            }

            await interaction.followUp({ embeds: [winnerEmbed] });

            finish = false;
            pfpArr = {};
            pfp = {};
            aliveCounter = 0;
            winner = 0;
            done = {};
            doneNo = 0;
            players = {};
            playersNo = 0;
            joined = {};
            ozzyJoined = false;
            workingHG = false;
            p = 0;
            arenaMsg = "";
            hasStart = false;
          }
        } else {
          if(user.id == interaction.user.id){
            await interaction.followUp(`<@${interaction.user.id}>, there are not enough players to start the game.`);
          } else {
            //await interaction.followUp({content:"<@" + user.id + "> no permz", ephemeral: true})
          }
        }
      });

      collector.on("collect", async (reaction, user) => {
        joined[p] = user.id;
        pfpArr[p] = user.displayAvatarURL();
        p++;
      });
      const ozzyAvatarURL = "https://cdn.discordapp.com/attachments/1255311474872553554/1260572435938541668/ozzy.png?ex=668fcf11&is=668e7d91&hm=749ca7e11cb9c8007b4a44f3eb375aed6deb2ce59093eb4fabe5d5c2f828fbf9&";

      ozzyCollector.on("collect", async (reaction, user) => {
        if (ozzyJoined == false && user.id == interaction.user.id) {
          joined[p] = "1255303549353726032";
          pfpArr[p] = ozzyAvatarURL;
          p++;
          ozzyJoined = true;
        }
      });

      collector.on("end", async (i) => {
      });
    } else {
      await interaction.followUp("<@" + interaction.user.id + "> a game is already giong on");
    }}
    else { await interaction.followUp("no.");}
},};