/*import { SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } from 'discord.js';*/

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');

const CHARACTERS = {
    elp: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> tells Elp that he's not the greatest. Elp publicly executes them.`
            : `✨ <@${player.id}> exposed the underground staff food black market. Elp rewards <@${player.id}>!`; 

    },

    ayan: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> claims that Summer Bash is not a real trophy. Ayan impales them with his pencil.`
            : `✨ <@${player.id}> calls Ayan a curry muncher and receives Ayan Hats as a reward.`; 

    },

    scorp: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> publicly states that rock music is the worst genre. Scorp smashes a fucking grand piano on their head.`
            : `✨ <@${player.id}> listens to rock music for morale. Scorp notices and brews a coffee for them.`; 

    },

    wynn: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> wanders into Wynn's corn maze, gets lost and screams for help. Soon, the only sound left is zombies munching on bones.`
            : `✨ <@${player.id}> calls Wynn a curry muncher. Wynn is overjoyed and bakes them a cake.`; 

    },

    snowy: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> gets sued and hires Snowy as their lawyer. She causes legal damages and <@${player.id}> now owes **Elp** their soul.`
            : `✨ Snowy lets <@${player.id}> pet Petunia.`; 

    },

    maya: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> says they would make a better Twin Oreo than Snowy. Maya creates a sonic boom in the process of slapping them.`
            : `✨ Maya bought <@${player.id}> a gourmet lollipop!`; 

    },

    diwix: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> says that Diwix isn't a real curry muncher.`
            : `✨ <@${player.id}> spams Diwix's DMs with memes.`; 

    },

    nell: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> makes Nell's bruschetta recipe but adds curry to it. Nell uses a dental drill to slowly burrow into their brain.`
            : `✨ <@${player.id}> buys some teeth from Nell to snack on, giving them energy.`; 

    },

    joe: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> says that Joe is very American. Joe responds as a true patriot by invading their home and taking all their oil.`
            : `✨ <@${player.id}> helps Joe in getting some stuff done.`; 

    },

    geo: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> gets forced to pull Santa Geo's sleigh, which proves fatal.`
            : `✨ <@${player.id}> buys invests in GeoCoin. Geo sneaks into their home at night and leaves them some gifts.`; 

    },

    beasto: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> dies of cringe during a conversation with Beasto.`
            : `✨ <@${player.id}> calls Beasto a monkey.`; 

    },

    jo: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> gets accidentally eaten by Jo. Was it really an accident? We'll never know.`
            : `✨ <@${player.id}> does a headstand and says Tasty. Jo is happy that he finally found someone he can relate to.`; 

    },

    zenishira: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 <@${player.id}> trash talks all of Zenishira's favourite games... it does not end well.`
            : `✨ <@${player.id}> has an at-length conversation with Zenishira about games and personality types.`; 

    },

    ru: function(player, rng) {
        const damage = rng ? 100 : 0;
        player.takeDamage(damage);

        return rng 
            ? `🪦 Ru is feeling sleepy, she accidentally drops a fucking building on <@${player.id}> while yawning.`
            : `✨ <@${player.id}> and Ru sing along to cringe Indian DJ songs.`; 

    },



    












}

const WEAPONS = {
    coconut: {
        name: 'coconut',
        damage: function(round, rng) {
            const base = 7 * round;
            return rng ? base * 2 : base;
        },

        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);

            if (rng2) {
                player.takeDamage(damage);
                if(rng) {
                    return `<@${player.id}> tried to cut a coconut tree but it fell on them.`;
                } else {
                    return `<@${player.id}> tried picking coconuts but fell off the tree.`;
                }
            } else {
                return `<@${player.id}> spends the day drinking coconut water and hydrating themselves. We love a hydrated queen 💅`;
            }

        },

        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);

            return `<@${attacker.id}> throws a coconut at <@${target.id}> with incredible force!`;
        },

        discovery: (player) => `<@${player.id}> discovered Desireus' coconuts!`,

        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);

            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> was sleeping and coconuts fell on them!`;
            }
            
        },

        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> ate fortune coconuts. Health has increased.`;
            
        },

        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);

            return `<@${attacker.id}> throws a coconut at <@${target.id}> with incredible force!`;
        }
    },

    axe: {
        name: 'axe',
        damage: function(round, rng) {
            const base = 15 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> swings their axe wildly at a tree and accidentally hits their own leg.`;
                } else{
                    return `<@${player.id}> threw their axe up in the air and it fell right on them.`;
                }
                
            } else {
                return `<@${player.id}> spends the day chopping firewood, preparing for the cold night 🪵`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> buries their axe in <@${target.id}>'s chest!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a sharp, menacing axe stuck in a tree stump.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare and rolls over onto their axe.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their axe to expertly carve the roast beast, earning a small but satisfying portion.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> delivers a final, brutal swing with the axe to <@${target.id}>!`;
        }
    },

    mace: {
        name: 'mace',
        damage: function(round, rng) {
            const base = 15 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> attempts a powerful overhead smash on a log, but loses their grip and drops the heavy mace on their foot.`;
                } else{
                    return `<@${player.id}> tests the weight of their mace, but the swing is too wide and they hit their own knee.`;
                }
            } else {
                return `<@${player.id}> finds a large boulder and smashes it to rubble with their mace, impressed by their own strength ⚒️`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> brings their mace down hard on <@${target.id}>!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a heavy, spiked mace. Brutal.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> dreams they are in a battle and swings their mace in their sleep, hitting the ground and sending painful shockwaves up their arm.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their mace to tenderize the meat. Everyone is too scared to say it's overdone, and they get a stomach ache.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> crushes <@${target.id}>'s defenses with a devastating blow from the mace!`;
        }
    },


    pistol: {
        name: 'pistol',
        damage: function(round, rng) {
            const base = 20 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> is startled by a noise and fumbles their pistol, shooting themselves in the foot.`;
                } else{
                    return `<@${player.id}> tries to clean their pistol, but it accidentally discharges, grazing their leg.`;
                }
                
            } else {
                return `<@${player.id}> spends the day practicing their aim on CPO staff members 🔫`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> takes aim and fires their pistol at <@${target.id}>!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a rusty, old pistol. It might still work.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `A sudden noise in the dark startles <@${player.id}>, who drops their heavy pistol on their face.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 5 * round;
            player.heal(healPoints);
            return `<@${player.id}> tries to use their pistol to open a can of beans. It goes as planned.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> unloads a point-blank shot into <@${target.id}>!`;
        }
    },

    knife: {
        name: 'knife',
        damage: function(round, rng) {
            const base = 20 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> attempts to throw their knife at a tree but it ricochets off and hits their leg.`;
                } else{
                    return `<@${player.id}> is whittling a piece of wood when the knife slips, giving them a nasty cut.`;
                }
                
            } else {
                return `<@${player.id}> uses their knife to carve a sharp point on a stick, creating a makeshift spear 🔪`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> silently moves in and stabs <@${target.id}> with a knife.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a well-balanced combat knife.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> tosses and turns in their sleep and gets cut by their own knife.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their knife to skillfully carve the best cuts of meat from the feast, healing them significantly.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> finds an opening and viciously attacks <@${target.id}> with their knife!`;
        }
    },

    cookies: {
        name: 'cookies',
        damage: function(round, rng) {
            const base = 7 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> bites into a cookie and finds it's rock-hard, chipping a tooth.`;
                } else{
                    return `<@${player.id}> eats a cookie too fast and chokes, taking minor damage.`;
                }
                
            } else {
                return `<@${player.id}> finds a moment of peace and enjoys a delicious cookie 🍪`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> force-feeds <@${target.id}> a very dry cookie.`;
        },
    
        discovery: (player) => `<@${player.id}> discovers a box of suspiciously good cookies!`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> eats too many cookies before bed and gets a terrible stomach ache.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 20 * round;
            player.heal(healPoints);
            return `<@${player.id}> brought their own cookies to the feast! They are a huge hit and they eat their fill, greatly increasing their health.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}>, in a moment of pity, offers <@${target.id}> a cookie. It's a final meal.`;
        }
    },

    bow: {
        name: 'bow',
        damage: function(round, rng) {
            const base = 20 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `The bowstring snaps back and smacks <@${player.id}> right in the face.`;
                } else{
                    return `<@${player.id}> fumbles an arrow, which falls and stabs them in the foot.`;
                }
                
            } else {
                return `<@${player.id}> successfully hunts a small rabbit with their bow, securing a meal 🏹`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> lets an arrow fly towards <@${target.id}>!`;
        },
    
        discovery: (player) => `<@${player.id}> crafts a sturdy longbow and a quiver of arrows.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> trips over their bow in the dark, causing an arrow to spring from the quiver and poke them.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their archery skills to shoot an apple off another tribute's head, earning them extra food for their bravery.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> lands a perfect shot on <@${target.id}> from a distance!`;
        }
    },

    blueguitar: {
        name: 'blueguitar',
        damage: function(round, rng) {
            const base = 18 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> tries to play a complicated solo, gets frustrated, and smashes the guitar on their own head.`;
                } else{
                    return `<@${player.id}> breaks a string while playing, and it whips them in the eye.`;
                }
                
            } else {
                return `<@${player.id}> plays a sad, beautiful song on their blue guitar. Their spirits are lifted 🎸`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> smashes their blue guitar over <@${target.id}>'s head! Rock and roll!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a strangely alluring blue guitar.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> falls asleep while practicing and the guitar falls on their face.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> becomes the life of the party at the feast, playing songs on their blue guitar. They are rewarded with extra rations.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> performs a face-melting guitar solo before delivering a final, epic smash on <@${target.id}>!`;
        }
    },

    banhammer: {
        name: 'banhammer',
        damage: function(round, rng) {
            const base = 25 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> accidentally drops the banhammer on their toe. The universe itself recoils in pain.`;
                } else{
                    return `<@${player.id}> tries to test the banhammer's weight, but it's too heavy and they strain their back.`;
                }
                
            } else {
                return `<@${player.id}> polishes the banhammer. It whispers forbidden rules. 🔨`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> judges <@${target.id}> to be unworthy and drops the Banhammer!`;
        },
    
        discovery: (player) => `<@${player.id}> has been chosen by the mighty Banhammer!`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}>'s hand slips in their sleep and they gently tap their own head with the banhammer, instantly giving them a migraine.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> sits at the head of the table. No one dares to take food before them. They eat their fill.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> swings the Banhammer. <@${target.id}> is permanently removed from the game.`;
        }
    },

    javascript: {
        name: 'javascript',
        damage: function(round, rng) {
            const base = 30 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> tries to center a div, fails, and punches their monitor in frustration.`;
                } else{
                    return `<@${player.id}> gets a TypeError and their brain short-circuits, causing minor psychic damage.`;
                }
                
            } else {
                return `<@${player.id}> spends the day debugging. The bug was a typo. It's always a typo 💻`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> shows <@${target.id}> their code. The spaghetti logic is so horrifying it causes physical damage.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a laptop with NodeJS installed. The power of Javascript is at their fingertips.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> stays up all night trying to understand Promises. They take exhaustion damage.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> tries to calculate the nutritional value of the feast but gets 'NaN'. They eat a single berry.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> traps <@${target.id}> in an infinite loop. Their existence is nullified.`;
        }
    },

    slipper: {
        name: 'slipper',
        damage: function(round, rng) {
            const base = 18 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> gets flashbacks of their mom and takes emotional damage.`;
                } else{
                    return `<@${player.id}> accidentally steps on the slipper, which was facing upwards. Ouch.`;
                }
                
            } else {
                return `<@${player.id}> puts on the slipper and feels an overwhelming urge to tell someone to clean their room. 🩴`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> hits <@${target.id}> with the slipper! The disrespect is more painful than the blow.`;
        },
    
        discovery: (player) => `<@${player.id}> finds the ultimate weapon of discipline: a slipper.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare about getting a bad grade and instinctively hits themselves with the slipper.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> ensures everyone at the feast has good manners. They are rewarded with extra dessert for their diligence.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> unleashes a flurry of slipper strikes on <@${target.id}>! It's super effective!`;
        }
    },

    metronome: {
        name: 'metronome',
        damage: function(round, rng) {
            const base = 7 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `The constant ticking of the metronome drives <@${player.id}> mad, causing them to bang their head against a tree.`;
                } else{
                    return `<@${player.id}> tries to use the metronome as a weapon, but just bonks themself on the head.`;
                }
                
            } else {
                return `<@${player.id}> uses the steady rhythm of the metronome to meditate, feeling centered 🧘`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> bonks <@${target.id}> on the head with the metronome, over and over, in perfect time.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a small, wooden metronome. Tick. Tock.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `Tick. Tock. Tick. Tock. <@${player.id}> cannot sleep and takes exhaustion damage.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 10 * round;
            player.heal(healPoints);
            return `<@${player.id}> sets the metronome on the table to regulate the pace of eating. They are not invited to parties often, but they digest well.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> uses the metronome to time their attacks perfectly, leaving no openings for <@${target.id}>.`;
        }
    },

    pinklightsaber: {
        name: 'pinklightsaber',
        damage: function(round, rng) {
            const base = 13 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> tries a cool spinning trick with their lightsaber but loses their grip, and it singes their leg.`;
                } else{
                    return `<@${player.id}> deactivates their lightsaber too close to their face, singeing their eyebrows.`;
                }
                
            } else {
                return `<@${player.id}> spends the day practicing their lightsaber forms, looking incredibly stylish. ✨`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> lunges at <@${target.id}> with their dazzling pink lightsaber!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a sleek, elegant hilt. With a press of a button, a fabulous pink plasma blade ignites!`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> rolls over in their sleep onto the lightsaber's activation switch. A very rude awakening.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their lightsaber to instantly toast bread for the whole group. Their flair earns them extra portions.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> overwhelms <@${target.id}> with a flurry of swift, elegant strikes from the pink lightsaber!`;
        }
    },

    masterball: {
        name: 'masterball',
        damage: function(round, rng) {
            const base = 18 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> wonders if the Master Ball can catch humans, points it at their own head, and presses the button. They are now trapped inside.`;
                } else{
                    return `<@${player.id}> fumbles the Master Ball, which pops open and releases a jolt of capture energy, hurting them.`;
                }
                
            } else {
                return `<@${player.id}> spends the day polishing their Master Ball, confident in its power. 🟣`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> throws the Master Ball at <@${target.id}>! It's a guaranteed catch! <@${target.id}> has been captured.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a mysterious purple and white sphere with the letter 'M' on it. It's a Master Ball!`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> sleeps on the Master Ball. The button presses down, and they wake up feeling drained, as if part of their soul was captured.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> brings the Master Ball to the feast. No one knows what it is, and it's not useful for eating.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> doesn't even hesitate. They throw the Master Ball at <@${target.id}>, capturing them instantly.`;
        }
    },

    curry: {
        name: 'curry',
        damage: function(round, rng) {
            const base = 15 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> discovers the curry is way too spicy and spends the next hour crying in a bush.`;
                } else{
                    return `<@${player.id}> eats the curry too fast and gets severe heartburn.`;
                }
                
            } else {
                return `<@${player.id}> enjoys a bowl of delicious curry, feeling energized. 🍛`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> throws a pot of scalding hot curry at <@${target.id}>!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a pot of suspiciously spicy curry.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare about being chased by a giant naan bread and gets indigestion from the stress.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> shares their delicious curry with everyone. It's a massive hit and they are rewarded with the largest portion.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> forces <@${target.id}> to eat a ghost pepper curry. <@${target.id}> spontaneously combusts.`;
        }
    },

    deathnote: {
        name: 'deathnote',
        damage: function(round, rng) {
            const base = 25 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> writes their own name in the Death Note as a joke, not believing it's real. They suffer a heart attack.`;
                } else{
                    return `<@${player.id}> accidentally writes their own name in the Death Note but misspells it. They get a massive headache.`;
                }
                
            } else {
                return `<@${player.id}> spends the day trying to figure out the rules of the Death Note. It's complicated. 📓`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> learns <@${target.id}>'s name and writes it in the Death Note. <@${target.id}> suffers a heart attack.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a black notebook with "DEATH NOTE" written on the cover.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> dreams of a Shinigami and wakes up screaming, taking emotional damage.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> tries to write "a delicious meal" in the Death Note, but nothing happens.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> writes <@${target.id}>'s name in the Death Note. It's over.`;
        }
    },

    elderwand: {
        name: 'elderwand',
        damage: function(round, rng) {
            const base = 25 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> attempts a powerful spell, but it backfires, hitting them with full force.`;
                } else{
                    return `<@${player.id}> accidentally casts a stinging hex on themselves.`;
                }
                
            } else {
                return `<@${player.id}> practices some simple charms, making flowers bloom around them. 🪄`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> unleashes the power of the Elder Wand, casting an unstoppable curse 'Crucio' at <@${target.id}>.`;
            
        },
    
        discovery: (player) => `<@${player.id}> finds a mysterious, powerful-looking wand. Could it be the Elder Wand?`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare about Voldemort and the wand unleashes a burst of uncontrolled magic, zapping them.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses the Elder Wand to conjure a magnificent feast out of thin air, healing them greatly.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> points the Elder Wand at <@${target.id}> and shouts "Avada Kedavra"!`;
        }
    },

    sneakygolem: {
        name: 'sneakygolem',
        damage: function(round, rng) {
            const base = 13 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `The Sneaky Golem's rocky exterior crumbles unexpectedly, and a large piece falls on <@${player.id}>'s foot.`;
                } else{
                    return `<@${player.id}> is startled when their Sneaky Golem appears out of nowhere, causing them to trip and fall.`;
                }
                
            } else {
                return `<@${player.id}>'s Sneaky Golem follows them silently through the forest, a loyal, rocky companion. 🗿`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}>'s Sneaky Golem appears from the shadows and ambushes <@${target.id}> with a powerful punch!`;
        },
    
        discovery: (player) => `<@${player.id}> finds a strange, glowing rock. It assembles itself into a Sneaky Golem and pledges its loyalty!`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}>'s Sneaky Golem stumbles in the dark, accidentally kicking a large rock onto <@${player.id}>.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 20 * round;
            player.heal(healPoints);
            return `The Sneaky Golem stands guard while <@${player.id}> eats, ensuring no one steals their food. This peace of mind helps them recover.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `The Sneaky Golem reveals its true power, growing in size before delivering a massive, earth-shattering blow to <@${target.id}>.`;
        }
    },

    bigwordbubbles: {
        name: 'bigwordbubbles',
        damage: function(round, rng) {
            const base = 15 * round;
            return rng ? base * 2 : base;
        },

        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);

            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> tries to spam the chat but gets rate-limited by the arena, causing their brain to overload.`;
                } else{
                    return `The giant word bubbles <@${player.id}> creates are so big they block their own view, causing them to walk into a tree.`;
                }
                
            } else {
                return `<@${player.id}> practices typing "L" and "ratio" very quickly. 💬`;
            }
        },

        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);

            return `<@${attacker.id}> floods <@${target.id}>'s vision with so many big word bubbles that they can't see the real attack coming.`;
        },

        discovery: (player) => `<@${player.id}> finds a mysterious keyboard that lets them generate giant word bubbles.`,

        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);

            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> dreams they are in a heated online argument and wakes up with a throbbing headache from the stress.`;
            }
            
        },

        feast: function(player, round){
            const healPoints = 7 * round;
            player.heal(healPoints);
            return `<@${player.id}> spams the host with so many compliments that they get given extra food out of sheer annoyance.`;
            
        },

        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);

            return `<@${attacker.id}> unleashes an unending wall of text, burying <@${target.id}> under an avalanche of giant word bubbles.`;
        }
    },

    awp: {
        name: 'awp',
        damage: function(round, rng) {
            const base = 30 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> tries to quickscope a bird but misses, revealing their position to a pack of angry bears.`;
                } else{
                    return `<@${player.id}> is so slow while scoped in that a snake manages to bite their leg.`;
                }
                
            } else {
                return `<@${player.id}> spends the day holding an angle on a long corridor. Nothing happens. 🔫`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> deletes <@${target.id}> with a single AWP shot to the chest.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a pristine AWP Dragon Lore. It's beautiful.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare about getting rushed and accidentally fires the AWP. The loud bang gives them tinnitus.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses the AWP to intimidate other tributes, ensuring they get the first pick of the food.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> lands an impossible flick shot on <@${target.id}>, ending the round.`;
        }
    },

    amogus: {
        name: 'amogus',
        damage: function(round, rng) {
            const base = 7 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `<@${player.id}> sees their own reflection and calls an emergency meeting on themself. They are voted out.`;
                } else{
                    return `<@${player.id}> tries to do a task but fakes it so badly they electrocute themselves.`;
                }
                
            } else {
                return `<@${player.id}> spends the day venting around the arena, looking for shortcuts. 📮`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> convinces everyone that <@${target.id}> is the impostor. <@${target.id}> was not The Impostor.`;
        },
    
        discovery: (player) => `<@${player.id}> finds a red crewmate that looks a little... sus.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare about being chased by the impostor and runs into a wall.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 15 * round;
            player.heal(healPoints);
            return `<@${player.id}> finishes all their tasks and is rewarded with extra food for being a good crewmate.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> reveals they were the impostor all along and eliminates <@${target.id}>.`;
        }
    },

    fireball: {
        name: 'fireball',
        damage: function(round, rng) {
            const base = 13 * round;
            return rng ? base * 2 : base;
        },
    
        singleDay: function(player, round){
            const rng = Math.floor(Math.random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(Math.random() * 2);
    
            if (rng2) {
                player.takeDamage(damage);
                if(rng){
                    return `The fireball spell becomes unstable and explodes in <@${player.id}>'s hand.`;
                } else{
                    return `<@${player.id}> tries to conjure a fireball but only manages to badly singe their fingers.`;
                }
                
            } else {
                return `<@${player.id}> uses a small fireball to light a campfire, feeling like a true wizard. 🔥`;
            }
        },
    
        duelDay: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(damage);
    
            return `<@${attacker.id}> hurls a massive fireball at <@${target.id}>!`;
        },
    
        discovery: (player) => `<@${player.id}> finds an ancient tome and learns the secrets of casting a fireball.`,
    
        night: function(player, round){
            const rng = Math.floor(Math.random() * 2);
    
            if(!rng) {
                return `<@${player.id}> slept peacefully through the night...`;
            } else{
                player.takeDamage(this.damage(round, 0));
                return `<@${player.id}> has a nightmare and unconsciously casts a fireball, setting their sleeping bag on fire.`;
            }
            
        },
    
        feast: function(player, round){
            const healPoints = 13 * round;
            player.heal(healPoints);
            return `<@${player.id}> uses their fireball to perfectly roast a wild pig for the feast, earning the gratitude of all.`;
            
        },
    
        finalDuel: function(attacker, target, round) {
            const damage = this.damage(round, 0);
            target.takeDamage(20 * damage);
    
            return `<@${attacker.id}> channels all their energy into one final, gigantic fireball that completely engulfs <@${target.id}>.`;
        }
    },
    
};

class Player {
    constructor(id, avatarURL) {
        this.id = id;
        this.avatar = avatarURL;
        this.health = 100;
        this.alive = true;
        this.weapons = new Set();
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) this.alive = false;
    }

    heal(amount) {
        this.health = Math.min(100, this.health + amount );
    }

    equipWeapon(weapon) {
        this.weapons.add(weapon);
    }
};

class GameState {
    constructor(hoster) {
        this.hoster = hoster;
        this.players = new Map();
        this.phase = 'lobby';
        this.round = 0;
        this.collectors = [];
    }

    cleanupCollectors () {
        this.collectors.forEach(async (collector) => {
            if(!collector.ended){
                await collector.stop(); // triggers it's end ev.
            }
        });

        this.collectors = [];
    }

    updateLobbyMessage (message) {
        if(this.phase === 'lobby'){
                try {
                    const playerList = Array.from(this.players.values())
                        .map(p => `<@${p.id}>`)
                        .join('\n');

                    const embed = new EmbedBuilder()
                        .setTitle(`Lobby (${this.players.size}/15)`)
                        .setDescription(
                            `Host: <@${this.hoster}>\n\n` +
                            `**Players**:\n${playerList || "None"}\n\n` +
                            `${joinEmoji} Join | ${startEmoji} Begin`
                        )
                        .setColor(0x953d59);

                    message.edit({
                        embeds: [embed],
                    });
                } catch (error) {
                    console.error("Error updating lobby message:", error);
                }
            
        }
    }

    async transitionTo (phaseName, interaction) {
        this.cleanupCollectors();
        //this.phase = phaseName;

        try{
            await GAME_EVENTS[phaseName].execute(this, interaction);
        } catch(error) {
            console.error(`Error during transitionTo [${phaseName}] (Round ${this.round}):`, error);
            workingHG = false;
            this.cleanupCollectors();
            interaction.channel.send({embeds: [crashEmbed]});
        }

    }

    checkWinner(interaction) {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        if (alivePlayers.length === 1) {

            const winner = alivePlayers[0];

            const weaponList = Array.from(winner.weapons).map(weapon => weapon.name);
            const weaponListString = weaponList.length > 0 
                ? weaponList.map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(', ') 
                : 'Bare hands';

            const winnerEmbed = new EmbedBuilder()
                    .setTitle("**Hunger Games have ended!**")
                    .setDescription(`Congratulations to <@${winner.id}> for being the champion!\n\n**Final Arsenal:** ${weaponListString}`)
                    .setColor(0x953d59)
                    .setThumbnail(winner.avatar);

            interaction.channel.send({
                embeds:[winnerEmbed]
            });

            workingHG = false;
            this.cleanupCollectors();

            return true;

        } else if (alivePlayers.length === 0) {

            const allDeadEmbed = new EmbedBuilder()
                    .setTitle("**Hunger Games have ended!**")
                    .setDescription(`All players died. Ozzy won by default.`)
                    .setColor(0x953d59)
                    .setThumbnail(ozzyAvatarURL);

            interaction.channel.send({
                embeds:[allDeadEmbed]
            });

            workingHG = false;
            this.cleanupCollectors();

            return true;

        }
        return null; // More than one player alive, no winner yet
    }

    deathMessage(casualties) {

        const description = casualties.length > 0
        ? `${casualties.map(id => `${id}`).join('\n')}`
        : '✨ No tributes died today.'; // Fallback for empty array

        const deathEmbed = new EmbedBuilder()
            .setTitle("💥 **Cannons** 💥")
            .setDescription(description)
            .setColor(0xFF0000);

        return deathEmbed;
    }

    async statMessage() {
        const alivePlayers = Array.from(this.players.values())
            .filter(p => p.alive)
            .sort((a,b) => b.health - a.health);

        const playerStats = alivePlayers.map(p => 
            `• <@${p.id}> - ${p.health}% HP`
        ).join('\n');

        const statEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`**Results**`)
        .addFields(
        { name: 'Players Alive', value: playerStats || 'No survivors!', inline: true }
        )
        .setFooter({ text: `Total alive: ${alivePlayers.length}` });

        return statEmbed;
    }
};

const GAME_EVENTS = {

    cornucopia: {

        execute: async(game, interaction) => {
            try{
                const weaponAssignments = [];
                const casualties = [];
                const weaponKeys = Object.keys(WEAPONS);
                game.players.forEach(player => {
                    const selectedWeapon = WEAPONS[weaponKeys[Math.floor(Math.random() * weaponKeys.length)]];
                    weaponAssignments.push(`${selectedWeapon.discovery(player)}\n`);
                    player.equipWeapon(selectedWeapon);
                    if (!player.alive) casualties.push(`⚰️ <@${player.id}>`);
                });

                const cornucopiaEmbed = new EmbedBuilder()
                    .setTitle("**Cornucopia**")
                    .setDescription(weaponAssignments.join('\n'))
                    .setColor(0xFFA500);

                
                const message = await interaction.channel.send({
                    embeds: [cornucopiaEmbed],
                    components: [main],
                    fetchReply: true
                });

                const cornucopiaCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(cornucopiaCollector);

                cornucopiaCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[cornucopiaEmbed],
                            components:[done]
                        });

                        const deathEmbed = await game.deathMessage(casualties);

                        const deathMessage = await interaction.channel.send({
                            embeds: [deathEmbed],
                            components: [main],
                            fetchReply: true
                        });



                        const deathCollector = deathMessage.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(deathCollector);

                        deathCollector.on('end', async () => {

                            await deathMessage.edit({
                                embeds:[deathEmbed],
                                components:[done]
                            });
        
                            if(game.phase === 'deaths'){ // deaths timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });

                        deathCollector.on('collect', async i => {
                            if(i.customId === 'next'){

                                await i.deferUpdate();

                                game.phase = 'stats';
                                await deathMessage.edit({
                                    embeds: [deathEmbed],
                                    components: [done]
                                    
                                });

                                const statsEmbed = await game.statMessage();

                                const statsMessage = await interaction.channel.send({
                                    embeds: [statsEmbed],
                                    components: [main],
                                    fetchReply: true
                                });
        
        
        
                                const statsCollector = statsMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 300000
                                });
        
                                await game.collectors.push(statsCollector);

                                statsCollector.on('end', async () => {

                                    await statsMessage.edit({
                                        embeds:[statsEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'stats'){ // stats timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                statsCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();
                                        game.phase = 'day';

                                        try {
                                            await statsMessage.edit({
                                            embeds: [statsEmbed],
                                            components: [done]
                                            });

                                            if (!game.checkWinner(interaction)) {
                                                await game.transitionTo('day', interaction);
                                            }
                                        } catch(error){
                                            console.error(`Error during cornucopia stats transition (Round ${game.round}):`, error);
                                            workingHG = false;
                                            game.cleanupCollectors();
                                            interaction.channel.send({embeds: [crashEmbed]});
                                        }
                                    }
                                })


                            }
                        })
                    }
                });

                cornucopiaCollector.on('end', async () => {

                    await message.edit({
                        embeds:[cornucopiaEmbed],
                        components:[done]
                    });

                    if(game.phase === 'cornucopia'){ // cornucopia timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });

            } catch (error) {
                console.error(`Error during cornucopia phase (Round ${game.round}):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});
            }
        }

        
    },




    day: {

        execute: async(game, interaction) => {
            try{

                game.round++;
                const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);

                if(alivePlayers.length === 2){
                    // end game logic

                    let fightLog = [];
                    
                    const [player1, player2] = alivePlayers;
                    let currentAttacker = player1;
                    let currentDefender = player2;

                    // Battle loop until one dies
                    while (player1.alive && player2.alive) {
                        if (currentAttacker.weapons.size > 0) {
                            const weapons = Array.from(currentAttacker.weapons);
                            const weapon = weapons[Math.floor(Math.random() * weapons.length)];
                            fightLog.push(weapon.finalDuel(currentAttacker, currentDefender, game.round));
                            
                            if (!currentDefender.alive) {

                                const finalEmbed = new EmbedBuilder()
                                    .setTitle(`Final Showdown - Day ${game.round}`)
                                    .setDescription(fightLog.join('\n'))
                                    .setColor(0x953d59);

                                const finalMessage = await interaction.channel.send({
                                    embeds:[finalEmbed],
                                    components:[main]
                                });

                                const finalCollector = finalMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 300000
                                });
        
                                game.collectors.push(finalCollector);

                                finalCollector.on('end', () => {

                                    finalMessage.edit({
                                        embeds:[finalEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'day'){ // stats timeout logic
                                        game.cleanupCollectors();
                                        workingHG = false;
                                        interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                finalCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();

                                        game.phase = 'winner';
                                        finalMessage.edit({
                                            embeds: [finalEmbed],
                                            components: [done]
                                        });

                                        game.checkWinner(interaction);
                                    }
                                })
                            }
                            
                        }
                        [currentAttacker, currentDefender] = [currentDefender, currentAttacker];
                    }
                    
                } else if(alivePlayers.length > 2) {

                    if(Math.random() < 0.5){ // single player fights

                        const weaponAssignments = [];
                        const casualties = [];
                        const weaponKeys = Object.keys(WEAPONS);
                        alivePlayers.forEach((player) => {
                            const playerWeapons = Array.from(player.weapons);
                            const currentWeapon = playerWeapons[Math.floor(Math.random() * playerWeapons.length)];
                            const selectedWeapon = WEAPONS[weaponKeys[Math.floor(Math.random() * weaponKeys.length)]];
                            weaponAssignments.push(`${currentWeapon.singleDay(player, game.round)} ${selectedWeapon.discovery(player)}\n`);
                            player.equipWeapon(selectedWeapon);
                            if (!player.alive) casualties.push(`⚰️ <@${player.id}>`);
                        });

                        const cornucopiaEmbed = new EmbedBuilder()
                            .setTitle(`**Day ${game.round} Events**`)
                            .setDescription(weaponAssignments.join('\n'))
                            .setColor(0xFFFF00);

                        
                        const message = await interaction.channel.send({
                            embeds: [cornucopiaEmbed],
                            components: [main],
                            fetchReply: true
                        });

                        const cornucopiaCollector = message.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(cornucopiaCollector);

                        cornucopiaCollector.on('collect', async i => {
                            if(i.customId === 'next'){
                                await i.deferUpdate();
                                game.phase = 'deaths';
                                await message.edit({
                                    embeds:[cornucopiaEmbed],
                                    components:[done]
                                });

                                const deathEmbed = await game.deathMessage(casualties);

                                const deathMessage = await interaction.channel.send({
                                    embeds: [deathEmbed],
                                    components: [main],
                                    fetchReply: true
                                });



                                const deathCollector = deathMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 3000000
                                });

                                await game.collectors.push(deathCollector);

                                deathCollector.on('end', async () => {

                                    await deathMessage.edit({
                                        embeds:[deathEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'deaths'){ // deaths timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                deathCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();

                                        game.phase = 'stats';
                                        await deathMessage.edit({
                                            embeds: [deathEmbed],
                                            components: [done]
                                            
                                        });


                                        const statsEmbed = await game.statMessage();

                                        const statsMessage = await interaction.channel.send({
                                            embeds: [statsEmbed],
                                            components: [main],
                                            fetchReply: true
                                        });
                
                
                
                                        const statsCollector = statsMessage.createMessageComponentCollector({
                                            filter: i => i.user.id === game.hoster,
                                            time: 300000
                                        });
                
                                        await game.collectors.push(statsCollector);

                                        statsCollector.on('end', async () => {

                                            await statsMessage.edit({
                                                embeds:[statsEmbed],
                                                components:[done]
                                            });
                        
                                            if(game.phase === 'stats'){ // stats timeout logic
                                                await game.cleanupCollectors();
                                                workingHG = false;
                                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                                            }
                                        });

                                        statsCollector.on('collect', async i => {
                                            if(i.customId === 'next'){

                                                await i.deferUpdate();
                                                game.phase = 'night';

                                                game.cleanupCollectors();

                                                try{

                                                    
                                                    await statsMessage.edit({
                                                        embeds: [statsEmbed],
                                                        components: [done]
                                                    });

                                                    if(!game.checkWinner(interaction)){
                                                        await game.transitionTo('night', interaction);
                                                    }

                                               } catch(error){
                                                console.error(`Error during day-end stats transition (Round ${game.round}):`, error);
                                                workingHG = false;
                                                game.cleanupCollectors();
                                                interaction.channel.send({embeds: [crashEmbed]});
                                               }
                                            }
                                        })


                                    }
                                })
                            }
                        });

                        cornucopiaCollector.on('end', async () => {

                            await message.edit({
                                embeds:[cornucopiaEmbed],
                                components:[done]
                            });

                            if(game.phase === 'day'){ // cornucopia timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });



                    }
                    else {

                        const weaponAssignments = [];
                        const casualties = [];
                        const weaponKeys = Object.keys(WEAPONS);
                        
                        alivePlayers.forEach((player) => {
                            const possibleOpponents = alivePlayers.filter(p => p.id !== player.id);
                            const player2 = possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)];

                            const wasAlive = player2.alive;
                            
                            const playerWeapons = Array.from(player.weapons);
                            const currentWeapon = playerWeapons[Math.floor(Math.random() * playerWeapons.length)];
                            const selectedWeapon = WEAPONS[weaponKeys[Math.floor(Math.random() * weaponKeys.length)]];
                            weaponAssignments.push(`${currentWeapon.duelDay(player, player2, game.round)} ${selectedWeapon.discovery(player)}\n`);

                            player.equipWeapon(selectedWeapon);
                            if (wasAlive && !player2.alive) {
                                casualties.push(`⚰️ <@${player2.id}>`);
                            }
                        });

                        const cornucopiaEmbed = new EmbedBuilder()
                            .setTitle(`**Day ${game.round} Events**`)
                            .setDescription(weaponAssignments.join('\n'))
                            .setColor(0xFFFF00);


                        
                        const message = await interaction.channel.send({
                            embeds: [cornucopiaEmbed],
                            components: [main],
                            fetchReply: true
                        });

                        const cornucopiaCollector = message.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(cornucopiaCollector);

                        cornucopiaCollector.on('collect', async i => {
                            if(i.customId === 'next'){
                                await i.deferUpdate();
                                game.phase = 'deaths';
                                await message.edit({
                                    embeds:[cornucopiaEmbed],
                                    components:[done]
                                });

                                const deathEmbed = await game.deathMessage(casualties);

                                const deathMessage = await interaction.channel.send({
                                    embeds: [deathEmbed],
                                    components: [main],
                                    fetchReply: true
                                });



                                const deathCollector = deathMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 3000000
                                });

                                await game.collectors.push(deathCollector);

                                deathCollector.on('end', async () => {

                                    await deathMessage.edit({
                                        embeds:[deathEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'deaths'){ // deaths timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                deathCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();

                                        game.phase = 'stats';
                                        await deathMessage.edit({
                                            embeds: [deathEmbed],
                                            components: [done]
                                            
                                        });

                                        const statsEmbed = await game.statMessage();

                                        const statsMessage = await interaction.channel.send({
                                            embeds: [statsEmbed],
                                            components: [main],
                                            fetchReply: true
                                        });
                
                
                
                                        const statsCollector = statsMessage.createMessageComponentCollector({
                                            filter: i => i.user.id === game.hoster,
                                            time: 300000
                                        });
                
                                        await game.collectors.push(statsCollector);

                                        statsCollector.on('end', async () => {

                                            await statsMessage.edit({
                                                embeds:[statsEmbed],
                                                components:[done]
                                            });
                        
                                            if(game.phase === 'stats'){ // stats timeout logic
                                                await game.cleanupCollectors();
                                                workingHG = false;
                                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                                            }
                                        });

                                        statsCollector.on('collect', async i => {
                                            if(i.customId === 'next'){

                                                try{

                                                await i.deferUpdate();
                                                game.phase = 'night';
                                                game.cleanupCollectors();

                                                await statsMessage.edit({
                                                    embeds: [statsEmbed],
                                                    components: [done]
                                                });

                                                if(!game.checkWinner(interaction)){
                                                    await game.transitionTo('night', interaction);
                                                }
                                                
                                               } catch(error){
                                                console.error(`Error during day-end stats transition B (Round ${game.round}):`, error);
                                                workingHG = false;
                                                game.cleanupCollectors();
                                                interaction.channel.send({embeds: [crashEmbed]});
                                               }    
                                            }
                                        })


                                    }
                                })
                            }
                        });

                        cornucopiaCollector.on('end', async () => {

                            await message.edit({
                                embeds:[cornucopiaEmbed],
                                components:[done]
                            });

                            if(game.phase === 'day'){ // cornucopia timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });

                        



                    }

                }  




            } catch (error) {
                console.error(`Error during day phase (Round ${game.round}, ${Array.from(game.players.values()).filter(p => p.alive).length} alive):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});
                throw error;
            }
        }

    },

    night: {

        execute: async(game, interaction) => {
            try{

                const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);

                const weaponAssignments = [];
                const casualties = [];
                const weaponKeys = Object.keys(WEAPONS);
                alivePlayers.forEach(player => {
                    const playerWeapons = Array.from(player.weapons);
                    const currentWeapon = playerWeapons[Math.floor(Math.random() * playerWeapons.length)];
                    //const selectedWeapon = WEAPONS[weaponKeys[Math.floor(Math.random() * weaponKeys.length)]];
                    weaponAssignments.push(`${currentWeapon.night(player, game.round)}\n`);
                    
                    //weaponAssignments.push(selectedWeapon.discovery(player));
                    //player.equipWeapon(selectedWeapon);
                    if (!player.alive) casualties.push(`⚰️ <@${player.id}>`);
                });

                const cornucopiaEmbed = new EmbedBuilder()
                    .setTitle(`**Night ${game.round} Events**`)
                    .setDescription(weaponAssignments.join('\n'))
                    .setColor(0x000000);


                
                const message = await interaction.channel.send({
                    embeds: [cornucopiaEmbed],
                    components: [main],
                    fetchReply: true
                });

                const cornucopiaCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(cornucopiaCollector);

                cornucopiaCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[cornucopiaEmbed],
                            components:[done]
                        });

                        const deathEmbed = await game.deathMessage(casualties);

                        const deathMessage = await interaction.channel.send({
                            embeds: [deathEmbed],
                            components: [main],
                            fetchReply: true
                        });



                        const deathCollector = deathMessage.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(deathCollector);

                        deathCollector.on('end', async () => {

                            await deathMessage.edit({
                                embeds:[deathEmbed],
                                components:[done]
                            });
        
                            if(game.phase === 'deaths'){ // deaths timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });

                        deathCollector.on('collect', async i => {
                            if(i.customId === 'next'){

                                await i.deferUpdate();

                                game.phase = 'stats';
                                await deathMessage.edit({
                                    embeds: [deathEmbed],
                                    components: [done]
                                    
                                });


                                const statsEmbed = await game.statMessage();

                                const statsMessage = await interaction.channel.send({
                                    embeds: [statsEmbed],
                                    components: [main],
                                    fetchReply: true
                                });
        
        
        
                                const statsCollector = statsMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 300000
                                });
        
                                await game.collectors.push(statsCollector);

                                statsCollector.on('end', async () => {

                                    await statsMessage.edit({
                                        embeds:[statsEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'stats'){ // stats timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                statsCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();
                                        game.phase = 'undecided';

                                        try {
                                            await statsMessage.edit({
                                            embeds: [statsEmbed],
                                            components: [done]
                                            });

                                            if (game.checkWinner(interaction)) return;

                                            if(game.round % 2 === 0){
                                                const randomNimbooz = Math.floor(Math.random() * 2);

                                                if(randomNimbooz){
                                                    game.phase = 'feast';
                                                    await game.transitionTo('feast', interaction);
                                                } else {
                                                    game.phase = 'bloodbath';
                                                    await game.transitionTo('bloodbath', interaction);
                                                }
                                            } else {
                                                game.phase = 'day';
                                                await game.transitionTo('day', interaction);
                                            }

                                        } catch(error){
                                            console.error(`Error during night stats transition (Round ${game.round}):`, error);
                                            workingHG = false;
                                            game.cleanupCollectors();
                                            interaction.channel.send({embeds: [crashEmbed]});
                                        }    
                                    }
                                })


                            }
                        })
                    }
                });

                cornucopiaCollector.on('end', async () => {

                    await message.edit({
                        embeds:[cornucopiaEmbed],
                        components:[done]
                    });

                    if(game.phase === 'night'){ // night timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });

            } catch (error) {
                console.error(`Error during night phase (Round ${game.round}, ${Array.from(game.players.values()).filter(p => p.alive).length} alive):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});
            }
        }


    },

    feast: {

        execute: async(game, interaction) => {
            try{

                const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);

                const weaponAssignments = [];
                const casualties = [];
                const weaponKeys = Object.keys(WEAPONS);
                alivePlayers.forEach(player => {
                    const playerWeapons = Array.from(player.weapons);
                    const currentWeapon = playerWeapons[Math.floor(Math.random() * playerWeapons.length)];
                    weaponAssignments.push(`${currentWeapon.feast(player, game.round)}\n`);
                    if (!player.alive) casualties.push(`⚰️ <@${player.id}>`);
                });

                const cornucopiaEmbed = new EmbedBuilder()
                    .setTitle(`**THE GREAT FEAST**`)
                    .setDescription(weaponAssignments.join('\n'))
                    .setColor(0xFFC0CB);

                
                const message = await interaction.channel.send({
                    embeds: [cornucopiaEmbed],
                    components: [main],
                    fetchReply: true
                });

                const cornucopiaCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(cornucopiaCollector);

                cornucopiaCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[cornucopiaEmbed],
                            components:[done]
                        });

                        const deathEmbed = await game.deathMessage(casualties);

                        const deathMessage = await interaction.channel.send({
                            embeds: [deathEmbed],
                            components: [main],
                            fetchReply: true
                        });



                        const deathCollector = deathMessage.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(deathCollector);

                        deathCollector.on('end', async () => {

                            await deathMessage.edit({
                                embeds:[deathEmbed],
                                components:[done]
                            });
        
                            if(game.phase === 'deaths'){ // deaths timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });

                        deathCollector.on('collect', async i => {
                            if(i.customId === 'next'){

                                await i.deferUpdate();

                                game.phase = 'stats';
                                await deathMessage.edit({
                                    embeds: [deathEmbed],
                                    components: [done]
                                    
                                });

                                const statsEmbed = await game.statMessage();

                                const statsMessage = await interaction.channel.send({
                                    embeds: [statsEmbed],
                                    components: [main],
                                    fetchReply: true
                                });
        
        
        
                                const statsCollector = statsMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 300000
                                });
        
                                await game.collectors.push(statsCollector);

                                statsCollector.on('end', async () => {

                                    await statsMessage.edit({
                                        embeds:[statsEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'stats'){ // stats timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                statsCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();
                                        game.phase = 'day';

                                        try {
                                            await statsMessage.edit({
                                            embeds: [statsEmbed],
                                            components: [done]
                                            });

                                            if (!game.checkWinner(interaction)) {
                                                await game.transitionTo('day', interaction);
                                            }
                                        } catch(error){
                                            console.error(`Error during feast stats transition (Round ${game.round}):`, error);
                                            workingHG = false;
                                            game.cleanupCollectors();
                                            interaction.channel.send({embeds: [crashEmbed]});
                                        }
                                    }
                                })


                            }
                        })
                    }
                });

                cornucopiaCollector.on('end', async () => {

                    await message.edit({
                        embeds:[cornucopiaEmbed],
                        components:[done]
                    });

                    if(game.phase === 'feast'){ // feast timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });

            } catch (error) {
                console.error(`Error during feast phase (Round ${game.round}, ${Array.from(game.players.values()).filter(p => p.alive).length} alive):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});
            }
        }


    },

    bloodbath: {

        execute: async(game, interaction) => {
            try{

                const alivePlayers = Array.from(game.players.values()).filter(p => p.alive);

                const weaponAssignments = [];
                const casualties = [];
                const characterKeys = Object.keys(CHARACTERS);
                alivePlayers.forEach(player => {
                    const rng = Math.random() < 0.25 ? 1 : 0;
                    const selectedCharacter = CHARACTERS[characterKeys[Math.floor(Math.random() * characterKeys.length)]];
                    weaponAssignments.push(`${selectedCharacter(player, rng)}\n`);
                    if (!player.alive) casualties.push(`⚰️ <@${player.id}>`);
                });

                const cornucopiaEmbed = new EmbedBuilder()
                    .setTitle(`**THE BLOODBATH**`)
                    .setDescription(weaponAssignments.join('\n'))
                    .setColor(0xFF0000);

                
                const message = await interaction.channel.send({
                    embeds: [cornucopiaEmbed],
                    components: [main],
                    fetchReply: true
                });

                const cornucopiaCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(cornucopiaCollector);

                cornucopiaCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[cornucopiaEmbed],
                            components:[done]
                        });

                        const deathEmbed = await game.deathMessage(casualties);

                        const deathMessage = await interaction.channel.send({
                            embeds: [deathEmbed],
                            components: [main],
                            fetchReply: true
                        });



                        const deathCollector = deathMessage.createMessageComponentCollector({
                            filter: i => i.user.id === game.hoster,
                            time: 300000
                        });

                        await game.collectors.push(deathCollector);

                        deathCollector.on('end', async () => {

                            await deathMessage.edit({
                                embeds:[deathEmbed],
                                components:[done]
                            });
        
                            if(game.phase === 'deaths'){ // deaths timeout logic
                                await game.cleanupCollectors();
                                workingHG = false;
                                await interaction.channel.send({ embeds: [timeoutEmbed]});
                            }
                        });

                        deathCollector.on('collect', async i => {
                            if(i.customId === 'next'){

                                await i.deferUpdate();

                                game.phase = 'stats';
                                await deathMessage.edit({
                                    embeds: [deathEmbed],
                                    components: [done]
                                    
                                });

                                const statsEmbed = await game.statMessage();

                                const statsMessage = await interaction.channel.send({
                                    embeds: [statsEmbed],
                                    components: [main],
                                    fetchReply: true
                                });
        
        
        
                                const statsCollector = statsMessage.createMessageComponentCollector({
                                    filter: i => i.user.id === game.hoster,
                                    time: 300000
                                });
        
                                await game.collectors.push(statsCollector);

                                statsCollector.on('end', async () => {

                                    await statsMessage.edit({
                                        embeds:[statsEmbed],
                                        components:[done]
                                    });
                
                                    if(game.phase === 'stats'){ // stats timeout logic
                                        await game.cleanupCollectors();
                                        workingHG = false;
                                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                                    }
                                });

                                statsCollector.on('collect', async i => {
                                    if(i.customId === 'next'){

                                        await i.deferUpdate();
                                        game.phase = 'day';

                                        try {
                                            await statsMessage.edit({
                                            embeds: [statsEmbed],
                                            components: [done]
                                            });

                                            if (!game.checkWinner(interaction)) {
                                                await game.transitionTo('day', interaction);
                                            }
                                        } catch(error){
                                            console.error(`Error during bloodbath stats transition (Round ${game.round}):`, error);
                                            workingHG = false;
                                            game.cleanupCollectors();
                                            interaction.channel.send({embeds: [crashEmbed]});
                                        }
                                    }
                                })


                            }
                        })
                    }
                });

                cornucopiaCollector.on('end', async () => {

                    await message.edit({
                        embeds:[cornucopiaEmbed],
                        components:[done]
                    });

                    if(game.phase === 'bloodbath'){ // bloodbath timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });

            } catch (error) {
                console.error(`Error during bloodbath phase (Round ${game.round}, ${Array.from(game.players.values()).filter(p => p.alive).length} alive):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});
            }
        }

        
    },

    


}



const joinEmoji = '🏹';
const startEmoji = '⚔️';
const addOzzyEmoji = '🗡';
const allowedRoles = ['1263547927591387148', '727488490991910933', '676473956236263424', '1388586562245230752', '916706599433809982'];
let workingHG = false;
const OZZY_ID = '1253478821974245506';
let hoster = "";
const ozzyAvatarURL = "https://cdn.discordapp.com/attachments/1255311474872553554/1260572435938541668/ozzy.png?ex=668fcf11&is=668e7d91&hm=749ca7e11cb9c8007b4a44f3eb375aed6deb2ce59093eb4fabe5d5c2f828fbf9&";

const createButtons = () => ({
    next: new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary),
    nextDisabled: new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
});

const main = new ActionRowBuilder()
    .addComponents(createButtons().next);
const done = new ActionRowBuilder()
    .addComponents(createButtons().nextDisabled); 

const timeoutEmbed = new EmbedBuilder()
        .setTitle("** ⚠️ Timeout**")
        .setDescription("Hunger Games timed out due to inactivity!")
        .setColor(0xFF5733);

const crashEmbed = new EmbedBuilder()
        .setTitle("**Hunger Games Crashed**")
        .setDescription("Please report it to <@532991839238750243> or <@699314950270877758>.")
        .setColor(0xFF5733);      



// main exec block
module.exports =  {

    data: new SlashCommandBuilder()
    .setName('hgsolo')
    .setDescription('Hunger Games Solo Mode'),

    async execute(interaction, client){
        await interaction.deferReply();

        const member = interaction.member;
        if (allowedRoles.some(roleId => member.roles.cache.has(roleId))){
            hoster = interaction.user.id;
            if(!workingHG){
                try{

                    const game = new GameState(hoster);

                    let startEmbed = new EmbedBuilder()
                        .setTitle("Hunger Games")
                        .setDescription(`
                            **The Reaping**
                            Hosted by: <@${game.hoster}>

                            React with ${joinEmoji} to **Participate**

                            React with ${addOzzyEmoji} to **Add Ozzy**

                            React with ${startEmoji} to **Begin**
                            `
                            
                        )
                        .setColor(0x953d59);

                    const message = await interaction.followUp({
                        embeds: [startEmbed],
                        fetchReply: true,
                    });
                    
                    workingHG = true;

                    message
                        .react(joinEmoji)
                        .then(() => message.react(addOzzyEmoji))
                        .then(() => message.react(startEmoji));

                    const joinFilter = (reaction, user) => {
                        return reaction.emoji.name === "🏹" && !user.bot; 
                    }
                    
                    const addOzzyFilter = (reaction, user) => {
                        return reaction.emoji.name === "🗡" && !user.bot;
                    }

                    const startFilter = (reaction, user) => {
                        return reaction.emoji.name === "⚔️" && !user.bot;
                    }

                    const joinCollector = message.createReactionCollector({
                        filter: joinFilter,
                        time: 300000
                    });

                    const ozzyCollector = message.createReactionCollector({
                        filter: addOzzyFilter,
                        time: 300000
                    });

                    const startCollector = message.createReactionCollector({
                        filter: startFilter,
                        time: 300000
                    });

                    game.collectors.push(...[joinCollector, ozzyCollector, startCollector]);

                    joinCollector.on('collect', (reaction, user) => {

                        if (game.players.size === 15) {
                            game.phase = 'cornucopia';
                            try {
                                game.transitionTo('cornucopia', interaction);
                            } catch (error) {
                                console.error("Failed to transition automatically", error);
                                workingHG = false;
                                game.cleanupCollectors();
                                interaction.channel.send({ embeds: [crashEmbed] });
                            }
                        }

                        
                        if(!game.players.has(user.id)){
                            game.players.set(user.id, new Player (user.id, user.displayAvatarURL()));
                            game.updateLobbyMessage(message);
                        }

                    });

                    ozzyCollector.on('collect', (reaction, user) => {
                        if(!game.players.has(OZZY_ID) && user.id === game.hoster){
                            game.players.set(OZZY_ID, new Player (OZZY_ID, ozzyAvatarURL));
                            game.updateLobbyMessage(message);
                        }
                    });

                    startCollector.on('collect', (reaction, user) => {
                        if(game.players.size >= 2){
                            if(user.id === game.hoster){
                                game.phase = 'cornucopia';
                                try{
                                    game.transitionTo('cornucopia', interaction);
                                } catch(error) {
                                    console.error("Failed to transition", error);
                                    workingHG = false;
                                    this.cleanupCollectors();
                                    interaction.channel.send({embeds: [crashEmbed]});

                                }
                            }
                        }        
                    });

                    startCollector.on("end", (collected, reason) =>{
                        if(game.phase === 'lobby'){
                            game.cleanupCollectors();
                            workingHG = false;
                            interaction.channel.send({ embeds: [timeoutEmbed]});
                        }
                    });

                    ozzyCollector.on("end", (collect, reason) => {
                    });

                    startCollector.on("end", (collect, reason) => {
                    });

                } catch (error) {
                    console.error("Error completing before reactions", error);
                    workingHG = false;
                }


            } else {
                interaction.followUp('Another game was going on!');
            }

        } else {
            interaction.followUp('no');
        }
    }

};