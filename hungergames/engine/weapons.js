/**
 * Solo-mode weapons. Every weapon has the same shape:
 *   singleDay(player, round), duelDay(attacker, target, round), discovery(player),
 *   night(player, round), feast(player, round), finalDuel(attacker, target, round)
 * Each mutates the Player it is given and returns the line to show. Kill
 * attribution is done by the resolver in solo.js, not here.
 */

const { random } = require('./rng');
const { CLASSIC_WEAPONS } = require('./weaponsClassic');

const CORE_WEAPONS = {
    coconut: {
        name: 'coconut',
        damage: function(round, rng) {
            const base = 7 * round;
            return rng ? base * 2 : base;
        },

        singleDay: function(player, round){
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);

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
            const rng = Math.floor(random() * 2);

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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);

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
            const rng = Math.floor(random() * 2);

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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
            const damage = this.damage(round, rng);
            const rng2 = Math.floor(random() * 2);
    
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
            const rng = Math.floor(random() * 2);
    
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

const WEAPONS = { ...CORE_WEAPONS, ...CLASSIC_WEAPONS };

module.exports = { WEAPONS };
