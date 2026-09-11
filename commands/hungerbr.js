/*import { SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } from 'discord.js';*/
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

class Player {
    constructor(id, avatarURL) {
        this.id = id;
        this.avatar = avatarURL;
        this.health = 100;
        this.alive = true;
        this.weapons = [];
        this.currentZone = null;
        this.lastDiscoveryMessage = '';
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

const SPECIALS = {
    golden_gun: {
        name: 'Golden Gun',
        discovery: (player) => `a Golden Gun`,
        attack: (player, defender, round) => {
            defender.takeDamage(100); // Insta-kill
            return `<@${player.id}> lands a one-shot elimination on <@${defender.id}> with the Golden Gun!`;
        }
    },
    ring_controller: {
        name: 'Ring Controller',
        discovery: (player) => `a Ring Controller`,
        attack: (player, defender, round) => {
            const damage = 15 * round;
            defender.takeDamage(damage);
            // Also damages the attacker slightly, as it's unstable
            player.takeDamage(5 * round);
            return `<@${player.id}> uses the Ring Controller to call down a localized storm on <@${defender.id}>!`;
        }
    },
    jetpack: {
        name: 'Jetpack',
        discovery: (player) => `a Jetpack`,
        attack: (player, defender, round) => {
            const damage = 12 * round;
            defender.takeDamage(damage);
            return `<@${player.id}> uses the Jetpack to perform a death-from-above slam on <@${defender.id}>!`;
        }
    },
    elp_banhammer: {
        name: 'Elps Banhammer',
        discovery: (player) => `Elps Banhammer`,
        attack: (player, defender, round) => {
            defender.takeDamage(50); // Insta-kill
            return `<@${player.id}> uses Elps banhammer to obliterate <@${defender.id}>. 50HP is reduced!`;
        }
    },
    tistle_tuba: {
        name: 'Tistle Tuba',
        discovery: (player) => `Tistles Tuba`,
        attack: (player, defender, round) => {
            defender.takeDamage(11 * round); // Insta-kill
            return `<@${player.id}> starts playing Tistles Tuba in front of <@${defender.id}> and hypnotizes them.`;
        }
    },
    beasto: {
        name: 'Beasto',
        discovery: (player) => `a wild Beasto`,
        attack: (player, defender, round) => {
            defender.takeDamage(100); // Insta-kill
            return `<@${player.id}> tells Beasto to creepily simp on <@${defender.id}>. They insantly die of cringe. RIP`;
        }
    },

};

const HEALS = {

    berry: {
        discovery: function(player){
            player.heal(30);
            return `<@${player.id}> found a wild berry and healed themselves!`;
        }
    },

    curry: {
        discovery: function(player){
            player.heal(40);
            return `<@${player.id}> found a bowl of spicy yet soothing curry. It insantly makes them feel better.`;
        }
    },

    krabby: {
        discovery: function(player){
            player.heal(35);
            return `<@${player.id}> steals Krabby when Herbert isn't looking. They cook it and enjoy the meal peacefully.`;
        }
    },

    promotion: {
        discovery: function(player){
            player.heal(30);
            return `<@${player.id}> gets promoted in Help Force. The ego boost heals a part of them.`;
        }
    },
};

const ZONES = {

    iceberg: {
        name: 'Iceberg',

        loot: {

            snowball: {
                name: 'Snowball',
                discovery: function(player){
                    return `<@${player.id}> found a snowball.`;

                },

                attack: function(player, defender, round){
                    const damage = 5 * round;
                    defender.takeDamage(damage);

                    return `<@${player.id}> hit <@${defender.id}> with a snowball!`;

                }
            },

            fishing_rod: {
                name: 'Fishing Rod',
                discovery: (player) => `<@${player.id}> snatched a fishing rod from Herbert's stash! 🎣`,
                attack: (player, defender, round) => {
                    const damage = 7 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> hooks <@${defender.id}> for ${damage} damage!`;
                }
            }    


        }
    },

    cove: {
        name: 'Cove',
        loot: {
            // COMMON: "Soggy Cannonball" (From Shipwrecks)
            cannonball: {
                name: 'Cannon Ball',
                discovery: (player) => `<@${player.id}> dug up a waterlogged cannonball! 💦`,
                attack: (player, defender, round) => {
                    const damage = 6 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> launches a cannonball at <@${defender.id}>! Sploosh!`;
                }
            },
            // RARE: "Captain's Cutlass" (From Cap'n Smol)
            cutlass: {
                name: 'Cutlass',
                discovery: (player) => `<@${player.id}> stole Cap'n Smol's prized cutlass! ⚔️`,
                attack: (player, defender, round) => {
                    const damage = 7 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> slashes <@${defender.id}> with the cutlass! ("Yarr!")`;
                }
            }
        }
    },

    mines: {
        name: 'Mines',

        loot: {
            // COMMON: "Pickaxe" (Mining tool)

            pickaxe: {
                name: 'Pickaxe',
                discovery: (player) => `<@${player.id}> found a rusty pickaxe! ⛏️`,
                attack: (player, defender, round) => {
                    const damage = 5 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> cracks <@${defender.id}> with a pickaxe!`;
                }
            },
            // RARE: "Golden Nugget" (Ultra-rare rock)
            golden_nugget: {
                name: 'Golden Nugget',
                discovery: (player) => `<@${player.id}> struck gold! 💛`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> bonks <@${defender.id}> with a golden nugget! *Cha-ching!*`;
                }
            }
        }
    },

    forest: {
        name: 'Forest',
        loot: {
            // COMMON: "Puffle Berry" (From bushes)
            puffle_berry: {
                name: 'Puffle Berry',
                discovery: (player) => `<@${player.id}> found a toxic puffle berry! 🍇`,
                attack: (player, defender, round) => {
                    const damage = 6 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> flings a berry at <@${defender.id}>. They look queasy!`;
                }
            },
            // RARE: "Puffle Whistle" (Summon wild puffles)
            puffle_whistle: {
                name: 'Puffle Whistle',
                discovery: (player) => `<@${player.id}> found the legendary Puffle Whistle! 📯`,
                attack: (player, defender, round) => {
                    const damage = 6 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> blows the whistle—a wild puffle attacks <@${defender.id}>!`;
                }
            }
        }
    },

    stadium: {
        name: 'Stadium',
        loot: {
            // COMMON: "Hockey Stick" (From hockey minigame)
            hockey_stick: {
                name: 'Hockey Stick',
                discovery: (player) => `<@${player.id}> grabbed a hockey stick! 🏒`,
                attack: (player, defender, round) => {
                    const damage = 7 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> slaps <@${defender.id}> with the stick! *Clack!*`;
                }
            },
            // RARE: "Soccer Ball Bomb" (From PSA missions)
            soccer_bomb: {
                name: 'Soccer Bomb',
                discovery: (player) => `<@${player.id}> found a suspicious soccer ball... 💣`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> kicks the ball at <@${defender.id}>—it explodes! 💥`;
                }
            }
        }
    },

    plaza: {
        name: 'Plaza',
        loot: {
            // COMMON: "Pizza Box" (From Pizza Parlor)
            pizza_box: {
                name: 'Pizza Box',
                discovery: (player) => `<@${player.id}> found a stale pizza box! 🍕`,
                attack: (player, defender, round) => {
                    const damage = 3 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> smacks <@${defender.id}> with the box. *"Ew, anchovies!"*`;
                }
            },
            // RARE: "Dance Floor Bomb" (From Dance Contest)
            dance_bomb: {
                name: 'Dance Bomb',
                discovery: (player) => `<@${player.id}> found a disco ball bomb! 💃`,
                attack: (player, defender, round) => {
                    const damage = 9 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> throws the bomb—<@${defender.id}> gets blasted by glitter! ✨`;
                }
            }
        }
    },

    town: {
        name: 'Town',
        loot: {
            // COMMON: "Newspaper Roll" (From the CP Times)
            newspaper: {
                name: 'Newspaper',
                discovery: (player) => `<@${player.id}> grabbed a rolled-up newspaper! 📰`,
                attack: (player, defender, round) => {
                    const damage = 4 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> whacks <@${defender.id}> with the newspaper! *"Extra! Extra!"*`;
                }
            },
            // RARE: "Gavel of Justice" (From the PSA HQ)
            gavel: {
                name: 'Gavel',
                discovery: (player) => `<@${player.id}> found the PSA's golden gavel! ⚖️`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> slams the gavel—<@${defender.id}> is sentenced to damage!`;
                }
            }
        }
    },

    docks: {
        name: 'Docks',
        loot: {
            // COMMON: "Rusty Anchor" (From the shipwreck)
            anchor: {
                name: 'Anchor',
                discovery: (player) => `<@${player.id}> dragged up a tiny anchor! ⚓`,
                attack: (player, defender, round) => {
                    const damage = 5 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> crushes <@${defender.id}> with the anchor! *"Heavy!"*`;
                }
            },
            // RARE: "Treasure Map Trap" (From Herbert's stash)
            treasure_map: {
                name: 'Treasure Map',
                discovery: (player) => `<@${player.id}> unrolled a map... it's a trap! 🗺️💥`,
                attack: (player, defender, round) => {
                    const damage = 7 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> lures <@${defender.id}> into a trap—BOOM!`;
                }
            }
        }
    },

    beach: {
        name: 'Beach',
        loot: {
            // COMMON: "Sandy Shovel" (From building sandcastles)
            shovel: {
                name: 'Shovel',
                discovery: (player) => `<@${player.id}> picked up a sandy shovel! 🏝️`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> bonks <@${defender.id}> with the shovel. Sand flies everywhere!`;
                }
            },
            // RARE: "Crab Cannon" (From the Jet Pack Adventure)
            crab_cannon: {
                name: 'Crab Cannon',
                discovery: (player) => `<@${player.id}> found a crab-powered cannon! 🦀🔫`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> fires a crab at <@${defender.id}>! *Pinch!*`;
                }
            }
        }
    },

    snowforts: {
        name: 'Snowforts',
        loot: {
            // COMMON: "Ice Block" (From fort walls)
            ice_block: {
                name: 'Ice Block',
                discovery: (player) => `<@${player.id}> pried loose a frozen ice block! 🧊`,
                attack: (player, defender, round) => {
                    const damage = 3 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> drops the block on <@${defender.id}>! *CRUNCH*`;
                }
            },
            // RARE: "Snow Cannon" (From the Snowball Battle minigame)
            snow_cannon: {
                name: 'Snow Cannon',
                discovery: (player) => `<@${player.id}> commandeered a snow cannon! ❄️💣`,
                attack: (player, defender, round) => {
                    const damage = 10 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> blasts <@${defender.id}> with a mega snowball!`;
                }
            }
        }
    },

    skihill: {
        name: 'Skihill',
        loot: {
            // COMMON: "Ski Pole" (From the slopes)
            ski_pole: {
                name: 'Ski Pole',
                discovery: (player) => `<@${player.id}> snapped a ski pole in half! 🎿`,
                attack: (player, defender, round) => {
                    const damage = 3 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> jabs <@${defender.id}> with the pole! *"No skiing for you!"*`;
                }
            },
            // RARE: "Yeti Sled" (From the Mountain Expedition)
            yeti_sled: {
                name: 'Yeti Sled',
                discovery: (player) => `<@${player.id}> found the Yeti's stolen sled! 🛷`,
                attack: (player, defender, round) => {
                    const damage = 10 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> runs over <@${defender.id}> with the sled! *"WHEEE—CRASH!"*`;
                }
            }
        }
    },

    dojo: {
        name: 'Dojo',
        loot: {
            // COMMON: "Bamboo Staff" (From training dummies)
            bamboo_staff: {
                name: 'Bamboo Staff',
                discovery: (player) => `<@${player.id}> grabbed a bamboo staff! 🎋`,
                attack: (player, defender, round) => {
                    const damage = 5 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> strikes <@${defender.id}> with the staff! *"Hi-yah!"*`;
                }
            },
            // RARE: "Dragon Scroll" (From Sensei’s secret stash)
            dragon_scroll: {
                name: 'Dragon Scroll',
                discovery: (player) => `<@${player.id}> unrolled the forbidden Dragon Scroll! 🐉📜`,
                attack: (player, defender, round) => {
                    const damage = 12 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> unleashes the scroll's power—<@${defender.id}> is engulfed in flames! 🔥`;
                }
            }
        }
    },

    coffeeshop: {
        name: 'Coffee Shop',
        loot: {
            // COMMON: "Coffee Mug"
            coffee_mug: {
                name: 'Coffee Mug',
                discovery: (player) => `<@${player.id}> grabbed a hot coffee mug! ☕`,
                attack: (player, defender, round) => {
                    const damage = 6 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> throws hot coffee at <@${defender.id}>! It's super effective!`;
                }
            },
            // RARE: "Espresso Tamper"
            espresso_tamper: {
                name: 'Espresso Tamper',
                discovery: (player) => `<@${player.id}> found a heavy espresso tamper behind the counter!`,
                attack: (player, defender, round) => {
                    const damage = 7 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> smashes <@${defender.id}> with the espresso tamper! That's gotta hurt.`;
                }
            }
        }
    },
    
    pizzaparlor: {
        name: 'Pizza Parlor',
        loot: {
            // COMMON: "Pizza Cutter"
            pizza_cutter: {
                name: 'Pizza Cutter',
                discovery: (player) => `<@${player.id}> found a surprisingly sharp pizza cutter! 🍕`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> rolls the pizza cutter over <@${defender.id}>! "One slice or two?"`;
                }
            },
            // RARE: "Exploding Calzone"
            exploding_calzone: {
                name: 'Exploding Calzone',
                discovery: (player) => `<@${player.id}> found a suspiciously ticking calzone... 💣`,
                attack: (player, defender, round) => {
                    const damage = 9 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> tosses the calzone at <@${defender.id}>—it explodes in a cheesy mess! 💥`;
                }
            }
        }
    },
    
    boxdimension: {
        name: 'Box Dimension',
        loot: {
            // COMMON: "Cardboard Tube"
            cardboard_tube: {
                name: 'Cardboard Tube',
                discovery: (player) => `<@${player.id}> found a sturdy cardboard tube! 📦`,
                attack: (player, defender, round) => {
                    const damage = 5 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> bonks <@${defender.id}> with the cardboard tube! *thwack*`;
                }
            },
            // RARE: "Reality Glitch"
            reality_glitch: {
                name: 'Reality Glitch',
                discovery: (player) => `<@${player.id}> touched a weird-looking box and found a reality glitch! 🌀`,
                attack: (player, defender, round) => {
                    const damage = 10 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> uses the glitch on <@${defender.id}>, causing them to briefly phase out of existence!`;
                }
            }
        }
    },
    
    lighthouse: {
        name: 'Lighthouse',
        loot: {
            // COMMON: "Signal Lantern"
            signal_lantern: {
                name: 'Signal Lantern',
                discovery: (player) => `<@${player.id}> grabbed a heavy signal lantern! 💡`,
                attack: (player, defender, round) => {
                    const damage = 6 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> swings the lantern at <@${defender.id}>! *Clang!*`;
                }
            },
            // RARE: "Lighthouse Beam"
            lighthouse_beam: {
                name: 'Lighthouse Beam',
                discovery: (player) => `<@${player.id}> figured out how to control the lighthouse beam! 🔆`,
                attack: (player, defender, round) => {
                    const damage = 8 * round;
                    defender.takeDamage(damage);
                    return `<@${player.id}> focuses the intense lighthouse beam on <@${defender.id}>, searing them!`;
                }
            }
        }
    }




}

class BattleRoyale {
    constructor(hoster){
        this.squads = new Map();
        this.safeZones = ['plaza', 'forest', 'stadium', 'cove', 'town', 'snowforts', 'skihill', 'dojo', 'coffeeshop', 'pizzaparlor', 'lighthouse', 'boxdimension']; //'town', 'snowforts', 'skihill', 'dojo', 'beach', 'docks', 'mines', 'iceberg
        this.dangerZones = [];
        this.collectors = [];
        this.ring = 0;
        this.players = new Map();
        this.phase = 'lobby';
        this.hoster = hoster;
        this.finalShowdown = null;
    }

    advanceRing() {
        // Ensure we don't try to infect more zones than exist
        const zonesToInfect = Math.min(
            Math.random() < 0.2 ? 2 : 3,
            this.safeZones.length
        );
        
        // No zones left to infect (end game)
        if (zonesToInfect === 0) {
            console.log("No safe zones left to infect - final zone reached!");
            return;
        }
    
        const shuffledSafeZones = shuffleArray([...this.safeZones]);
        const infected = shuffledSafeZones.splice(0, zonesToInfect);
    
        this.safeZones = this.safeZones.filter(zone => !infected.includes(zone));
        this.dangerZones.push(...infected);
    
        console.log(`Ring advanced! ${infected.join(', ')} became danger zones.`);
        console.log(`Remaining safe zones: ${this.safeZones.join(', ')}`);
    }

    allocateSquads() {
        // Final showdown case - all squads to one danger zone
        if (this.safeZones.length <= 1) {  // Changed to <= 1 for single safe zone
            // Only set finalShowdown if it hasn't been set yet
            if (!this.finalShowdown) {
                this.finalShowdown = this.safeZones.length === 1 
                    ? this.safeZones[0]  // Use last safe zone
                    : this.dangerZones[Math.floor(Math.random() * this.dangerZones.length)];
                
                console.log(`🚨 FINAL SHOWDOWN ZONE SET: ${this.finalShowdown.toUpperCase()}!`);
            }
    
            // Move all squads to the final showdown zone
            this.squads.forEach((squad, squadId) => {
                squad.inDanger = true; 
                squad.players.forEach(player => {
                    player.currentZone = this.finalShowdown;
                });
                console.log(`Squad ${squadId} moved to final showdown at ${this.finalShowdown}`);
            });
            return;
        }
    
        // Normal allocation (80/20 split)
        this.squads.forEach((squad, squadId) => {
            const isDangerSquad = Math.random() < 0.15; // 20% chance
            
            const targetZone = isDangerSquad && this.dangerZones.length > 0
                ? this.dangerZones[Math.floor(Math.random() * this.dangerZones.length)]
                : this.safeZones[Math.floor(Math.random() * this.safeZones.length)];

                squad.inDanger = isDangerSquad && this.dangerZones.length > 0;
    
            squad.players.forEach(player => {
                player.currentZone = targetZone;
            });
            
            console.log(`Squad ${squadId} sent to ${targetZone}`, 
                isDangerSquad ? "(risky)" : "(safe)");
        });
    }

    async updateLobbyMessage(message) {
        // Create squad fields
        const squadFields = [...this.squads.values()].map((squad, index) => {
            const squadMembers = squad.players.map(player =>
                `• <@${player.id}> ${player.id === this.hoster ? '(Host)' : ''}`
            ).join('\n');
    
            return {
                name: `Squad ${index + 1} (${squad.players.length} member${squad.players.length !== 1 ? 's' : ''})`,
                value: squadMembers || 'No members yet',
                inline: true
            };
        });
    
        // Create the embed
        const lobbyEmbed = new EmbedBuilder()
            .setTitle('**HG Battle Royale Lobby** 🔮')
            .setColor('#00FF00')
            // --- MODIFIED ---
            // Added the instructions to the main description
            .setDescription(
                `Hosted by: <@${this.hoster}>\n\n` +
                `React with ${joinEmoji} to **Participate**\n` +
                `React with ${addOzzyEmoji} to **Add Ozzy**\n` +
                `React with ${startEmoji} to **Begin**`
            )
            .addFields(squadFields)
            // --- NEW ---
            // Moved the player count to the footer for a cleaner look
            .setFooter({ text: `Players: ${this.players.size}/16` });
    
        // Edit the original message
        try {
            await message.edit({
                embeds: [lobbyEmbed],
            });
        } catch (error) {
            console.error('Failed to update lobby message:', error);
        }
    }

    cleanupCollectors () {
        this.collectors.forEach(async (collector) => {
            if(!collector.ended){
                await collector.stop(); // triggers it's end ev.
            }
        });

        this.collectors = [];
    }

    async transitionTo (phaseName, interaction) {
        this.cleanupCollectors();
        //this.phase = phaseName;

        try{
            await GAME_EVENTS[phaseName].execute(this, interaction);
        } catch(error) {
            console.error(`Error during transitionTo [${phaseName}] (Ring ${this.ring}):`, error);
            workingHG = false;
            this.cleanupCollectors();
            interaction.channel.send({embeds: [crashEmbed]});
        }

    }

    discoveryPhase() {
        const alivePlayers = Array.from(this.players.values()).filter(player => player.alive);
    
        alivePlayers.forEach(player => {
            player.lastDiscoveryMessage = '';
            const isInDangerZone = this.dangerZones.includes(player.currentZone);
    
            // --- DANGER ZONE LOGIC ---
            if (isInDangerZone && this.safeZones.length > 1) {
                player.takeDamage(30);
                let discoveryMessage = `The ring closes in on <@${player.id}>, dealing 30 damage!`;
    
                // 50% chance to find a special weapon
                if (Math.random() < 0.5) {
                    const specialKeys = Object.keys(SPECIALS);
                    const randomSpecialKey = specialKeys[Math.floor(Math.random() * specialKeys.length)];
                    const specialWeapon = SPECIALS[randomSpecialKey];
    
                    player.weapons.push({
                        ...specialWeapon,
                        id: randomSpecialKey
                    });
    
                    // Append the discovery to the message
                    discoveryMessage += ` But in the chaos, they found ${specialWeapon.discovery(player)}!`;
                } else {
                    // Append the failure message
                    discoveryMessage += ` They searched but found nothing of value.`;
                }
                
                player.lastDiscoveryMessage = discoveryMessage;
    
            } 
            // --- SAFE ZONE LOGIC ---
            else {
                // 25% chance to find a heal
                if (Math.random() < 0.2) {
                    const healKeys = Object.keys(HEALS);
                    const randomHealKey = healKeys[Math.floor(Math.random() * healKeys.length)];
                    const heal = HEALS[randomHealKey];
                    player.lastDiscoveryMessage = heal.discovery(player);
                } 
                // 75% chance to find a normal weapon
                else {
                    const zone = ZONES[player.currentZone];
                    if (zone && zone.loot) {
                        const lootKeys = Object.keys(zone.loot);
                        if (lootKeys.length > 0) {
                            const randomWeaponKey = lootKeys[Math.floor(Math.random() * lootKeys.length)];
                            const weapon = zone.loot[randomWeaponKey];
    
                            player.weapons.push({
                                ...weapon,
                                id: randomWeaponKey
                            });
                            player.lastDiscoveryMessage = weapon.discovery(player);
                        } else {
                            player.lastDiscoveryMessage = `<@${player.id}> found nothing!`;
                        }
                    } else {
                        player.lastDiscoveryMessage = `<@${player.id}> found nothing!`;
                    }
                }
            }
        });
    }

    deathMessage(casualties) {

        const description = casualties.length > 0
        ? `${casualties.map(id => `${id}`).join('\n')}`
        : '✨ No tributes died today.'; // Fallback for empty array

        const deathEmbed = new EmbedBuilder()
            .setTitle("💥 **Cannons** 💥")
            .setDescription(description)
            .setColor(0xFFA500);

        return deathEmbed;
    }

    statMessage() {
        // Create squad fields
        const squadFields = [...this.squads.values()].map(squad => {
          const alivePlayers = squad.players.filter(player => player.alive);
          
          return {
            name: `${squad.name} (${alivePlayers.length} alive)`,
            value: alivePlayers.map(player => 
              `• <@${player.id}>: ${player.health} HP ${player.weapons.length > 0 ? '| ' + player.weapons.map(w => w.name).join(', ') : ''}`
            ).join('\n') || 'No living members',
            inline: false
          };
        });
      
        // Create the embed
        const statsEmbed = new EmbedBuilder()
          .setTitle('**HG Battle Royale Stats** ⏳')
          .setColor('#ff0000') // Red color for stats
          .addFields(squadFields)
          .setFooter({
            text: `Safe Zones: ${this.safeZones.map(zoneKey => ZONES[zoneKey].name).join(', ')}`,
        })
      
        return statsEmbed;
      }
      
      // Helper function to count alive players
      getAliveCount() {
        return [...this.players.values()].filter(player => player.alive).length;
    }

    async battlePhase() {
        console.log('[BATTLE PHASE STARTED] Round:', this.ring);
        const casualties = [];
        const descriptionLines = [];
        const hidingSquadsLog = [];
    
        // 1. Group squads by zone
        const squadsByZone = new Map();
        this.squads.forEach(squad => {
            const alivePlayers = squad.players.filter(p => p.alive);
            console.log(`- Squad ${squad.id} has ${alivePlayers.length} alive players`);

            if (alivePlayers.length > 0) {
                const zone = alivePlayers[0].currentZone;
                console.log(`  - Located in zone: ${zone}`);

                if (!squadsByZone.has(zone)) {
                    squadsByZone.set(zone, []);
                }
                squadsByZone.get(zone).push({
                    id: squad.id,
                    name: squad.name,
                    players: alivePlayers
                });
            }
        });
    
        // 2. Check for battles
        let battlesOccurred = false;
        
        squadsByZone.forEach((squads, zone) => {
            if (squads.length >= 2) {
                battlesOccurred = true;
                console.log(`! BATTLE DETECTED in ${zone} (${squads.length} squads)`);
                
                const zoneLog = [];
                //zoneBattles[zone] = zoneLog;
                //zoneLog.push(`**${zone.toUpperCase()} BATTLE**`);
    
                // Handle odd number of squads
                const shuffledSquads = [...squads].sort(() => Math.random() - 0.5);

                // 2. Handle odd squad count (now random)
                if (shuffledSquads.length % 2 !== 0) {
                    const hidingSquad = shuffledSquads.pop(); // Removes a RANDOM squad (due to shuffle)
                    hidingSquadsLog.push(`• ${hidingSquad.name} hid and avoided combat!`);
                    console.log(`  - ${hidingSquad.name} randomly hid (odd squad count)`);
                }
    
                // Pair up squads
                while (shuffledSquads.length > 0) {
                    const squad1 = shuffledSquads.shift();
                    const squad2 = shuffledSquads.shift();
                    
                    const shuffledFighters1 = [...squad1.players].sort(() => 0.5 - Math.random());
                    const shuffledFighters2 = [...squad2.players].sort(() => 0.5 - Math.random());
    
                    const numBattles = Math.min(shuffledFighters1.length, shuffledFighters2.length);
                    
                    for (let i = 0; i < numBattles; i++) {
                        const player1 = shuffledFighters1[i];
                        const player2 = shuffledFighters2[i];
    
                        // --- START OF NEW COMBAT LOGIC ---
    
                        // Store alive status BEFORE combat to prevent duplicate casualty entries
                        const player1WasAlive = player1.alive;
                        const player2WasAlive = player2.alive;
    
                        const player1HasWeapon = player1.weapons.length > 0;
                        const player2HasWeapon = player2.weapons.length > 0;
    
                        // Scenario 1: Both players have weapons and fight simultaneously
                        if (player1HasWeapon && player2HasWeapon) {
                            const weapon1 = player1.weapons[Math.floor(Math.random() * player1.weapons.length)];
                            // Bug Fix: Use player2's weapon length, not player1's
                            const weapon2 = player2.weapons[Math.floor(Math.random() * player2.weapons.length)];
    
                            const attackResult1 = weapon1.attack(player1, player2, this.ring);
                            const attackResult2 = weapon2.attack(player2, player1, this.ring);
                            
                            zoneLog.push(`⚔️ ${attackResult1}`);
                            zoneLog.push(`⚔️ ${attackResult2}`);
                        } 
                        // Scenario 2: Only Player 1 has a weapon
                        else if (player1HasWeapon && !player2HasWeapon) {
                            const weapon1 = player1.weapons[Math.floor(Math.random() * player1.weapons.length)];
                            const attackResult1 = weapon1.attack(player1, player2, this.ring);
                            zoneLog.push(`⚔️ ${attackResult1}`);
                            zoneLog.push(`Unarmed <@${player2.id}> couldn't fight back!`);
                        }
                        // Scenario 3: Only Player 2 has a weapon
                        else if (!player1HasWeapon && player2HasWeapon) {
                            const weapon2 = player2.weapons[Math.floor(Math.random() * player2.weapons.length)];
                            const attackResult2 = weapon2.attack(player2, player1, this.ring);
                            zoneLog.push(`⚔️ ${attackResult2}`);
                            zoneLog.push(`Unarmed <@${player1.id}> couldn't fight back!`);
                        }
                        // Scenario 4: Neither player has a weapon
                        else {
                            zoneLog.push(`🥊 <@${player1.id}> and <@${player2.id}> stared at each other menacingly, but had no weapons!`);
                        }
    
                        // Check for casualties AFTER all combat is resolved
                        if (player1WasAlive && !player1.alive) {
                            casualties.push(`☠️ <@${player1.id}>`);
                        }
                        if (player2WasAlive && !player2.alive) {
                            casualties.push(`☠️ <@${player2.id}>`);
                        }
                        // --- END OF NEW COMBAT LOGIC ---
                    }
                }

                // If any battles happened in this zone, add the formatted block to the main description
                if (zoneLog.length > 0) {
                    descriptionLines.push(`\n__**${ZONES[zone]?.name.toUpperCase() || zone.toUpperCase()}**__\n`);
                    descriptionLines.push(...zoneLog);
                }
            }
        });
    
        if (!battlesOccurred) {
            console.log('No battles occurred this round');
            return {
                battleLog: ["No battles occurred - squads avoided each other"],
                battleEmbed: new EmbedBuilder()
                    .setTitle("**🌿 Peaceful Round**")
                    .setDescription(squadsByZone.size > 1 
                        ? "Squads stayed in separate zones..." 
                        : "All squads avoided conflict...")
                    .setFooter({
                        text: `Safe Zones: ${this.safeZones.map(zoneKey => ZONES[zoneKey].name).join(', ')}`,
                        }),
                casualties: []
            };
        }

        const finalDescription = (hidingSquadsLog.length > 0 ? hidingSquadsLog.join('\n') + '\n' : '') + descriptionLines.join('\n');

    
        /*// 3. Create battle embed
        console.log('\nCreating battle embed...');
        const battleEmbed = new EmbedBuilder()
        .setTitle(`**Ring ${this.ring} Battle Results**`)
        .setColor('#FF0000');

    // Add validated fields
    Object.entries(zoneBattles).forEach(([zone, log]) => {
        const content = log.join('\n');
        if (content && content.trim().length > 0) {  // Ensure non-empty content
            battleEmbed.addFields({
                name: zone.toUpperCase(),
                value: content,
                inline: false
            });
        }
    });*/

    const battleEmbed = new EmbedBuilder()
        .setTitle(`**Ring ${this.ring} Battle Results**`)
        .setColor('#FF0000')
        .setDescription(finalDescription);

    // Ensure at least one field exists
    if (battleEmbed.data.fields?.length === 0) {
        battleEmbed.setDescription("No combat occurred between squads");
    }

    
    
        // 4. Clean up dead players
        this.squads.forEach(squad => {
            const before = squad.players.length;
            squad.players = squad.players.filter(p => p.alive);
            console.log(`- Squad ${squad.id}: ${before} → ${squad.players.length} players`);
        });

        return {
            battleEmbed,  // Now guaranteed valid
            casualties
        };
    }

    checkWinner(interaction) {
        const formatWeaponList = (player) => {
            if (player.weapons.length > 0) {
                return player.weapons.map(w => w.name.charAt(0).toUpperCase() + w.name.slice(1)).join(', ');
            }
            return 'Bare hands';
        };
    
        const aliveSquads = [...this.squads.values()].filter(squad =>
            squad.players.some(p => p.alive)
        );
    
        // --- SQUAD VICTORY ---
        if (aliveSquads.length === 1) {
            const winningSquad = aliveSquads[0];
            const survivors = winningSquad.players.filter(p => p.alive);
            const winnerEmbed = new EmbedBuilder()
                .setTitle("🏆 **Battle Royale Champion!**")
                .setColor(0xFFD700); // Gold color for victory
    
            // --- Case 1: Two survivors ---
            if (survivors.length === 2) {
                const player1 = survivors[0];
                const player2 = survivors[1];
                const description = `**${winningSquad.name}** wins the Hunger Games with 2 survivors! 🥳\n\n` +
                                    `• <@${player1.id}> - ${formatWeaponList(player1)}\n` +
                                    `• <@${player2.id}> - ${formatWeaponList(player2)}`;
    
                winnerEmbed
                    .setDescription(description)
                    .setThumbnail(player1.avatar); // Discord Limitation: Can only show one thumbnail.
    
            } 
            // --- Case 2: One survivor ---
            else if (survivors.length === 1) {
                const soloSurvivor = survivors[0];
                const description = `**${winningSquad.name}** wins the Hunger Games!\n\n` +
                                    `**<@${soloSurvivor.id}>** is the sole survivor with their trusty **${formatWeaponList(soloSurvivor)}**!`;
    
                winnerEmbed
                    .setTitle("HG Battle Royale Champion!")
                    .setDescription(description)
                    .setThumbnail(soloSurvivor.avatar);
            }
    
            interaction.channel.send({ embeds: [winnerEmbed] });
            console.log("Hunger Games BR ended - Squad victory");
            workingHG = false;
            this.cleanupCollectors();
            return winningSquad;
        }
        // --- TOTAL ELIMINATION ---
        else if (aliveSquads.length === 0) {
            const ozzyEmbed = new EmbedBuilder()
                .setTitle("💀 **Battle Royale Ended**")
                .setDescription("All squads have been eliminated! **Ozzy** wins by default.")
                .setColor(0x953d59)
                .setThumbnail(ozzyAvatarURL);
    
            interaction.channel.send({ embeds: [ozzyEmbed] });
            console.log("Hunger Games BR ended - Ozzy victory");
            workingHG = false;
            this.cleanupCollectors();
            return "ozzy";
        }
    
        return null; // No winner yet
    }

    
}

const GAME_EVENTS = {

    ring: {
        name: 'ring',
        execute: async(game, interaction) => {
            try {

                await game.advanceRing();
                await game.allocateSquads();

                game.ring++;

                await game.discoveryPhase();
                const casualties = [];


                const ringEmbed = new EmbedBuilder()
                    .setTitle(`**Ring ${game.ring}: Discovery Phase** 🛤`)
                    .setColor('#0099ff') // Optional: Set a color
                    .setFields(
                        // Create a field for each squad
                        ...[...game.squads.values()].map(squad => ({
                        name: `${squad.name} (${ZONES[squad.players[0]?.currentZone]?.name || 'Unknown Zone'}) ${squad.inDanger ? '🔴' : ''} `, // All squad members are in same zone
                        value: squad.players
                            .filter(player => player.alive)
                            .map(player => {
                            //const lastWeapon = player.weapons[player.weapons.length - 1]; // Get most recently found weapon
                            return player.lastDiscoveryMessage || `<@${player.id}> found nothing!`;
                            })
                            .join('\n'),
                        inline: false // Set to true if you want side-by-side squad displays
                        }))
                    )
                    .setFooter({
                        text: `Safe Zones: ${game.safeZones.map(zoneKey => ZONES[zoneKey].name).join(', ')}`,
                    })

                
                const message = await interaction.channel.send({
                    embeds: [ringEmbed],
                    components: [main],
                    fetchReply: true
                });

                const ringCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(ringCollector);

                ringCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[ringEmbed],
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
                                game.phase = 'battle';

                                try {
                                    await deathMessage.edit({
                                    embeds: [deathEmbed],
                                    components: [done]
                                    });

                                    await game.transitionTo('battle', interaction);
                                } catch(error){
                                    console.error(`Error during ring stats transition (Ring ${game.ring}):`, error);
                                    workingHG = false;
                                    game.cleanupCollectors();
                                    interaction.channel.send({embeds: [crashEmbed]});
                                }    
                            }
                        })
                    }
                });

                ringCollector.on('end', async () => {

                    await message.edit({
                        embeds:[ringEmbed],
                        components:[done]
                    });

                    if(game.phase === 'ring'){ // ring timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });


                
            } catch (error) {

                console.error(`Error during ring phase (Ring ${game.ring}):`, error);
                workingHG = false;
                game.cleanupCollectors();
                interaction.channel.send({embeds: [crashEmbed]});

            }
        }
    },

    battle: {
        name: 'battle',
        execute: async(game, interaction) => {
            try {

                if(game.finalShowdown) game.ring++;


                // Destructure the results:
                const { battleEmbed, casualties } = await game.battlePhase();;

                // In your main function where you call battlePhase():

                
                    const message = await interaction.channel.send({
                        embeds: [battleEmbed],
                        components: [main],
                        fetchReply: true
                    });

                


                
                

                const ringCollector = message.createMessageComponentCollector({
                    filter: i => i.user.id === game.hoster,
                    time: 300000
                });

                await game.collectors.push(ringCollector);

                ringCollector.on('collect', async i => {
                    if(i.customId === 'next'){
                        await i.deferUpdate();
                        game.phase = 'deaths';
                        await message.edit({
                            embeds:[battleEmbed],
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
                                        game.phase = 'ring';

                                        try {
                                            await statsMessage.edit({
                                            embeds: [statsEmbed],
                                            components: [done]
                                            });

                                            if(!game.checkWinner(interaction)){
                                                if(!game.finalShowdown){
                                                    await game.transitionTo('ring', interaction);
                                                } else{
                                                    await game.transitionTo('battle', interaction);
                                                }
                                            }
                                        } catch(error){
                                            console.error(`Error during battle stats transition (Ring ${game.ring}):`, error);
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

                ringCollector.on('end', async () => {

                    await message.edit({
                        embeds:[battleEmbed],
                        components:[done]
                    });

                    if(game.phase === 'battle'){ // ring timeout logic
                        await game.cleanupCollectors();
                        workingHG = false;
                        await interaction.channel.send({ embeds: [timeoutEmbed]});
                    }
                });


                
            } catch (error) {

                console.error(`Error during battle phase (Ring ${game.ring}, ${Array.from(game.players.values()).filter(p => p.alive).length} alive):`, error);
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



module.exports =  {

    data: new SlashCommandBuilder()
    .setName('hgsquad')
    .setDescription('Hunger Games Squad Mode'),

    async execute(interaction, client){
        await interaction.deferReply();

        const member = interaction.member;
        if (allowedRoles.some(roleId => member.roles.cache.has(roleId))) {
            hoster = interaction.user.id;
            if(!workingHG){
                try{

                    const game = new BattleRoyale(hoster);

                    let startEmbed = new EmbedBuilder()
                        .setTitle("HG Battle Royale 🔮")
                        .setDescription(`
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
                        if (!game.players.has(user.id)) {
                            const newPlayer = new Player(user.id, user.displayAvatarURL());
                            game.players.set(user.id, newPlayer);

                            let addedToSquad = false;
                            for (const [squadId, squad] of game.squads) {
                                if (squad.players.length < 2) {
                                    squad.players.push(newPlayer);
                                    addedToSquad = true;
                                    break;
                                }
                            }

                            if (!addedToSquad) {
                                const squadId = `squad_${game.squads.size + 1}`;
                                game.squads.set(squadId, {
                                    name: `Squad ${game.squads.size + 1}`,
                                    players: [newPlayer]
                                });
                            }

                            game.updateLobbyMessage(message);
                        }
                    });
                    
                    ozzyCollector.on('collect', (reaction, user) => {
                        if (!game.players.has(OZZY_ID) && user.id === game.hoster) {
                            const ozzyPlayer = new Player(OZZY_ID, ozzyAvatarURL);
                            game.players.set(OZZY_ID, ozzyPlayer);
                            
                            // Add Ozzy to a squad (either existing or new)
                            let ozzyAdded = false;
                            for (const [squadId, squad] of game.squads) {
                                if (squad.players.length < 2) {
                                    squad.players.push(ozzyPlayer);
                                    ozzyAdded = true;
                                    break;
                                }
                            }
                            
                            if (!ozzyAdded) {
                                const squadId = `squad_${game.squads.size + 1}`;
                                game.squads.set(squadId, {
                                    name: `Squad ${game.squads.size + 1}`,
                                    players: [ozzyPlayer]
                                });
                            }
                            
                            game.updateLobbyMessage(message);
                        }
                    });
                    
                    startCollector.on('collect', (reaction, user) => {
                        // Require at least 3 squads with at least 1 player each
                        const validSquads = [...game.squads.values()].filter(squad => squad.players.length > 0);
                        
                        if (validSquads.length >= 2) {
                            if (user.id === game.hoster) {
                                game.phase = 'ring';
                                try {
                                    game.transitionTo('ring', interaction);
                                } catch (error) {
                                    console.error("Failed to transition", error);
                                    workingHG = false;
                                    this.cleanupCollectors();
                                    interaction.channel.send({embeds: [crashEmbed]});
                                }
                            }
                        }
                    });
                    
                    startCollector.on("end", (collected, reason) => {
                        if (game.phase === 'lobby') {
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