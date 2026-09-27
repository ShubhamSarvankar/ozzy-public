/**
 * Squad-mode loot. SPECIALS drop in danger zones, HEALS and zone loot in safe
 * zones. Weapon attack(player, defender, round) mutates and returns the line.
 */

const { random } = require('./rng');

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
                    return `<@${player.id}> blows the whistle... a wild puffle attacks <@${defender.id}>!`;
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
                    return `<@${player.id}> kicks the ball at <@${defender.id}>... it explodes! 💥`;
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
                    return `<@${player.id}> throws the bomb... <@${defender.id}> gets blasted by glitter! ✨`;
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
                    return `<@${player.id}> slams the gavel... <@${defender.id}> is sentenced to damage!`;
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
                    return `<@${player.id}> lures <@${defender.id}> into a trap... BOOM!`;
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
                    return `<@${player.id}> runs over <@${defender.id}> with the sled! *"WHEEE... CRASH!"*`;
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
                    return `<@${player.id}> unleashes the scroll's power... <@${defender.id}> is engulfed in flames! 🔥`;
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
                    return `<@${player.id}> tosses the calzone at <@${defender.id}>... it explodes in a cheesy mess! 💥`;
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

module.exports = { SPECIALS, HEALS, ZONES };
