/**
 * Weapons ported from the original /hg (commands/HungerGames.js, removed), in
 * the same shape as weapons.js. Discovery and duel lines keep the original
 * wording wherever the old game had one.
 */

const { random } = require('./rng');

const coin = () => Math.floor(random() * 2);

// Builds the full weapon shape from a base damage and the lines that differ.
function weapon(name, base, lines) {
  return {
    name,
    damage(round, doubled) {
      const dmg = base * round;
      return doubled ? dmg * 2 : dmg;
    },

    singleDay(player, round) {
      const doubled = coin();
      if (coin()) {
        player.takeDamage(this.damage(round, doubled));
        return lines.mishap(player, doubled);
      }
      return lines.calm(player);
    },

    duelDay(attacker, target, round) {
      target.takeDamage(this.damage(round, 0));
      return lines.duel(attacker, target);
    },

    discovery: (player) => lines.discovery(player),

    night(player, round) {
      if (!coin()) return `<@${player.id}> slept peacefully through the night...`;
      player.takeDamage(this.damage(round, 0));
      return lines.night(player);
    },

    feast(player, round) {
      player.heal(7 * round);
      return lines.feast(player);
    },

    finalDuel(attacker, target, round) {
      target.takeDamage(20 * this.damage(round, 0));
      return lines.duel(attacker, target);
    },
  };
}

const CLASSIC_WEAPONS = {
  excookiebur: weapon('Excookiebur', 22, {
    discovery: (p) => `After an intense adventure, <@${p.id}> rediscovers the legendary sword Excookiebur!`,
    calm: (p) => `<@${p.id}> polishes Excookiebur all day. It smells faintly of chocolate chips.`,
    mishap: (p, big) => (big
      ? `<@${p.id}> tries to take a bite out of Excookiebur. It is still a sword.`
      : `<@${p.id}> trips while showing off Excookiebur and nicks themselves.`),
    duel: (a, t) => `<@${a.id}> attacks <@${t.id}> with the legendary sword Excookiebur!`,
    night: (p) => `<@${p.id}> rolls over onto Excookiebur in their sleep.`,
    feast: (p) => `<@${p.id}> uses Excookiebur to slice cookies for everyone at the feast.`,
  }),

  ratofdoom: weapon('Rat of Doom', 12, {
    discovery: (p) => `<@${p.id}> does a very pathetic looking dance. An old, worn-out rubber rat falls on the ground afterwards.`,
    calm: (p) => `<@${p.id}> squeaks the rubber rat to keep morale up.`,
    mishap: (p, big) => (big
      ? `The Rat of Doom turns on <@${p.id}>. Nobody saw it move.`
      : `<@${p.id}> steps on the rubber rat in the dark and twists an ankle.`),
    duel: (a, t) => `<@${a.id}> squeezes the rubber rat, emitting a ridiculous squeak. <@${t.id}> laughs, but the Rat of Doom suddenly appears...`,
    night: (p) => `<@${p.id}> hears squeaking all night. The Rat of Doom is watching.`,
    feast: (p) => `<@${p.id}> shares their plate with the Rat of Doom. It seems pleased.`,
  }),

  bananapeellauncher: weapon('Banana Peel Launcher', 14, {
    discovery: (p) => `<@${p.id}> slips into an alternate dimension. When they return, they have a pink mohawk and a banana peel launcher.`,
    calm: (p) => `<@${p.id}> spends the day reloading the banana peel launcher. It takes a lot of bananas.`,
    mishap: (p, big) => (big
      ? `<@${p.id}> slips on their own banana peel and lands head first.`
      : `The banana peel launcher backfires and smacks <@${p.id}> in the face.`),
    duel: (a, t) => `<@${a.id}> shoots bananas at <@${t.id}>, who slips and falls on their head.`,
    night: (p) => `<@${p.id}> dreams of bananas, then wakes up on a pile of peels and slips.`,
    feast: (p) => `<@${p.id}> brings banana bread made from launcher ammo. Surprisingly good.`,
  }),

  roulettegun: {
    ...weapon('Roulette Gun', 20, {
      discovery: (p) => `<@${p.id}> starts praying for luck, after finding a Roulette Gun.`,
      calm: (p) => `<@${p.id}> spins the Roulette Gun's cylinder all day but never pulls the trigger.`,
      mishap: (p, big) => (big
        ? `<@${p.id}> plays roulette alone out of boredom. It does not go well.`
        : `<@${p.id}> drops the Roulette Gun and it goes off near their foot.`),
      duel: (a, t) => `<@${a.id}> ties <@${t.id}> to a chair, but promises to let them go if the first round is a blank. The first round goes off with a resounding bang, leaving blood everywhere.`,
      night: (p) => `<@${p.id}> hears the Roulette Gun click in the dark and panics.`,
      feast: (p) => `<@${p.id}> wins the last slice of pie in a very tense game of roulette.`,
    }),
    duelDay(attacker, target, round) {
      if (coin()) {
        return `<@${attacker.id}> points the Roulette Gun at <@${target.id}>... click. A blank. They both stare awkwardly.`;
      }
      target.takeDamage(this.damage(round, 1));
      return `<@${attacker.id}> ties <@${target.id}> to a chair, but promises to let them go if the first round is a blank. The first round goes off with a resounding bang, leaving blood everywhere.`;
    },
  },

  charizard: weapon('Charizard', 15, {
    discovery: (p) => `<@${p.id}> captures a wild Charizard!`,
    calm: (p) => `<@${p.id}> and Charizard roast marshmallows all day.`,
    mishap: (p, big) => (big
      ? `Charizard sneezes directly on <@${p.id}>.`
      : `<@${p.id}> tries to ride Charizard and falls off.`),
    duel: (a, t) => `<@${a.id}>'s Charizard attacks <@${t.id}> with Flamethrower.`,
    night: (p) => `Charizard's tail flame sets <@${p.id}>'s sleeping bag on fire.`,
    feast: (p) => `Charizard grills the whole feast for <@${p.id}>. Medium rare.`,
  }),

  gengar: weapon('Gengar', 15, {
    discovery: (p) => `<@${p.id}> captures a wild Gengar!`,
    calm: (p) => `<@${p.id}> plays hide and seek with Gengar. Gengar always wins.`,
    mishap: (p, big) => (big
      ? `Gengar decides <@${p.id}> is more fun as a ghost and gives it a try.`
      : `Gengar pranks <@${p.id}> and they run face first into a tree.`),
    duel: (a, t) => `<@${a.id}>'s Gengar attacks <@${t.id}> with Shadow Ball.`,
    night: (p) => `Gengar gives <@${p.id}> nightmares on purpose.`,
    feast: (p) => `Gengar steals extra food for <@${p.id}> while nobody is looking.`,
  }),

  mewtwo: weapon('Mewtwo', 18, {
    discovery: (p) => `<@${p.id}> captures a wild Mewtwo!`,
    calm: (p) => `<@${p.id}> and Mewtwo meditate. It is mostly Mewtwo meditating.`,
    mishap: (p, big) => (big
      ? `Mewtwo questions why it takes orders from <@${p.id}> and throws them into a rock.`
      : `Mewtwo levitates <@${p.id}> for fun and forgets to put them down gently.`),
    duel: (a, t) => `Mewtwo acknowledges <@${a.id}>'s command and attacks <@${t.id}> with Psystrike.`,
    night: (p) => `Mewtwo's psychic snoring gives <@${p.id}> a migraine.`,
    feast: (p) => `Mewtwo telekinetically serves <@${p.id}> the best dish at the feast.`,
  }),

  snorlax: {
    ...weapon('Snorlax', 8, {
      discovery: (p) => `<@${p.id}> captures a wild Snorlax!`,
      calm: (p) => `<@${p.id}> naps on Snorlax's belly all day and feels great.`,
      mishap: (p, big) => (big
        ? `Snorlax rolls over onto <@${p.id}>.`
        : `<@${p.id}> tries to wake Snorlax up and gets swatted.`),
      duel: (a, t) => `<@${a.id}>'s Snorlax uses Body Slam on <@${t.id}>.`,
      night: (p) => `Snorlax sleepwalks right over <@${p.id}>.`,
      feast: (p) => `Snorlax eats most of the feast, but shares the leftovers with <@${p.id}>. Huge heal.`,
    }),
    feast(player, round) {
      player.heal(14 * round);
      return `Snorlax eats most of the feast, but shares the leftovers with <@${player.id}>. Huge heal.`;
    },
  },

  torchic: {
    ...weapon('Torchic', 8, {
      discovery: (p) => `<@${p.id}> captures a wild Torchic!`,
      calm: (p) => `Torchic keeps <@${p.id}> warm all day.`,
      mishap: (p, big) => (big
        ? `Torchic pecks <@${p.id}> relentlessly for no reason.`
        : `Torchic singes <@${p.id}>'s eyebrows off.`),
      duel: (a, t) => `<@${a.id}>'s Torchic pecks <@${t.id}> with surprising aggression.`,
      night: (p) => `Torchic crows at 3am and <@${p.id}> falls out of their hammock.`,
      feast: (p) => `Torchic keeps <@${p.id}>'s food warm. Cozy heal.`,
    }),
    night(player, round) {
      if (coin()) {
        player.heal(5 * round);
        return `Torchic curls up next to <@${player.id}> and keeps them warm through the night.`;
      }
      return `<@${player.id}> slept peacefully through the night...`;
    },
  },

  mew: {
    ...weapon('Mew', 10, {
      discovery: (p) => `<@${p.id}> captures a wild Mew!`,
      calm: (p) => `Mew floats around <@${p.id}> all day, being adorable.`,
      mishap: (p, big) => (big
        ? `Mew transforms into something terrifying to prank <@${p.id}>.`
        : `Mew bonks <@${p.id}> on the head playfully. It hurts more than expected.`),
      duel: (a, t) => `<@${a.id}>'s Mew attacks <@${t.id}> with kindness. Oh No!`,
      night: (p) => `Mew keeps <@${p.id}> up all night wanting to play.`,
      feast: (p) => `Mew uses Recover on <@${p.id}> after the feast.`,
    }),
    feast(player, round) {
      player.heal(12 * round);
      return `Mew uses Recover on <@${player.id}> after the feast.`;
    },
  },

  ketchupcookies: weapon('Ketchup Cookies', 12, {
    discovery: (p) => `After a huge fight with Snowy, <@${p.id}> obtains ketchup cookies!`,
    calm: (p) => `<@${p.id}> stares at the ketchup cookies, trying to decide if they are food or a weapon.`,
    mishap: (p, big) => (big
      ? `<@${p.id}> eats one of the ketchup cookies. Big mistake.`
      : `<@${p.id}> takes a tiny nibble of a ketchup cookie and immediately regrets it.`),
    duel: (a, t) => `<@${a.id}> gives ketchup cookies to <@${t.id}>. They die inside a little.`,
    night: (p) => `The smell of ketchup cookies keeps <@${p.id}> from sleeping.`,
    feast: (p) => `<@${p.id}> brings ketchup cookies to the feast. Nobody touches them, so they get extra of everything else.`,
  }),

  excalibur: {
    ...weapon('Excalibur', 10, {
      discovery: (p) => `<@${p.id}> finds Excalibur but no one really cares cuz it's not Excookiebur.`,
      calm: (p) => `<@${p.id}> tries to pull Excalibur back into the stone. It doesn't fit.`,
      mishap: (p, big) => (big
        ? `Excalibur refuses to be wielded by <@${p.id}> and bites back.`
        : `<@${p.id}> cuts themselves on Excalibur while complaining it isn't Excookiebur.`),
      duel: (a, t) => `<@${a.id}> attacks <@${t.id}> with the Excalibur!`,
      night: (p) => `<@${p.id}> dreams they found Excookiebur, then wakes up holding Excalibur. Emotional damage.`,
      feast: (p) => `<@${p.id}> uses Excalibur as a very expensive butter knife.`,
    }),
    duelDay(attacker, target, round) {
      if (coin()) {
        attacker.takeDamage(this.damage(round, 0));
        return `<@${attacker.id}> attacks <@${target.id}> with the Excalibur. But it's not the Excookiebur, so it hurts the player instead.`;
      }
      target.takeDamage(this.damage(round, 0));
      return `<@${attacker.id}> attacks <@${target.id}> with the Excalibur, and for once it actually works.`;
    },
  },
};

module.exports = { CLASSIC_WEAPONS };
