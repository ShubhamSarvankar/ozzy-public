// Non-weapon events. Most are ported from the original /hg (wording kept);
// the betrayal/alliance pair events are new. `hp` is applied to the player(s)
// by the resolver: a number, or a function of the round.

// Day: things the arena does to you. Solo day phases use these instead of a
// weapon line some of the time.
const ENVIRONMENT = [
  { hp: (r) => -10 * r, text: (p) => `<@${p.id}> tries climbing a tree to set up camp but falls and gets hurt.` },
  { hp: (r) => -10 * r, text: (p) => `<@${p.id}> accidentally collected poisoned water to drink.` },
  { hp: (r) => -10 * r, text: (p) => `<@${p.id}> cooks a meal using stolen food from the staff kitchen, taking a huge risk...` },
  { hp: (r) => 5 * r, text: (p) => `<@${p.id}> harvests broccoli.` },
  { hp: (r) => 5 * r, text: (p) => `<@${p.id}> harvests some corn.` },
  { hp: (r) => -8 * r, text: (p) => `<@${p.id}> burns themselves while trying to start a fire.` },
  { hp: (r) => -6 * r, text: (p) => `<@${p.id}> finds a backpack but its booby trapped.` },
  { hp: (r) => 3 * r, text: (p) => `<@${p.id}> finds a backpack full of medicines and first-aid.` },
  { hp: (r) => -1 * r, text: (p) => `<@${p.id}> cries while thinking about home.` },
  { hp: (r) => -3 * r, text: (p) => `<@${p.id}> dosen't give a shit about their surroundings and sleeps.` },
  { hp: 0, text: (p) => `<@${p.id}> carefully selects a good sleeping spot to rest.` },
  { hp: 0, text: (p) => `<@${p.id}> explores the surroundings.` },
  { hp: 0, text: (p) => `<@${p.id}> scouts for people to fight, but gets distracted by an unsupervised cookie.` },
];

// Night, one player.
const NIGHT_SOLO = [
  { hp: 25, text: (p) => `<@${p.id}> received medicines from an unknown Sponsor` },
  { hp: 20, text: (p) => `<@${p.id}> sings in the quietness of night, fills the surrounding with temporary peace` },
  { hp: 10, text: (p) => `<@${p.id}> dreams of winning the Legends Cup.` },
  { hp: (r) => r, text: (p) => `<@${p.id}> tries to find a way to sneak into Elp's bedroom... 😳` },
  { hp: 10, text: (p) => `<@${p.id}> comes back from the mines alive` },
  { hp: 10, text: (p) => `<@${p.id}> receives a message from <@532991839238750243>, and goes to sleep looking confident.` },
  { hp: 5, text: (p) => `<@${p.id}> considers the chances of escaping the game if they complain hard enough.` },
  { hp: 5, text: (p) => `<@${p.id}> remembers the times when they would steal Snowy's office doors and blame some staff member for it.` },
  { hp: 5, text: (p) => `<@${p.id}> contemplates the state of equality among Helpers, and how Elp is slightly more equal than the others.` },
  { hp: 15, text: (p) => `<@${p.id}> writes an event post for the HF website, because even when your life is in danger, staff work must be done.` },
  { hp: 5, text: (p) => `The new-age HF Exodus is happening, with <@${p.id}> at the center of it! They almost get the Legend medal, but then they woke up.` },
  { hp: 5, text: (p) => `<@${p.id}> hides from the mini mods.` },
  { hp: 5, text: (p) => `<@${p.id}> stalks the Commanders, noting their every move for future reference.` },
  { hp: 5, text: (p) => `<@${p.id}> finds an abandoned cow.` },
  { hp: 5, text: (p) => `<@${p.id}> pets some cats.` },
  { hp: 5, text: (p) => `<@${p.id}> pets some dogs.` },
  { hp: 5, text: (p) => `<@${p.id}> chills with Jo.` },
  { hp: 5, text: (p) => `<@${p.id}> chills with Beasto.` },
  { hp: 5, text: (p) => `<@${p.id}> chills with Diwix.` },
  { hp: 5, text: (p) => `<@${p.id}> chills with Scorp.` },
  { hp: -5, text: (p) => `<@${p.id}> eats puffle pizza.` },
  { hp: -5, text: (p) => `<@${p.id}> tries some beans that burn their tongue.` },
  { hp: -5, text: (p) => `<@${p.id}> struggles with their trauma all alone` },
];

// Night, two players. `hp` is [first, second]. `betrayal` events are attacks:
// the first player hits the second for `damage(round)` and can kill them.
const NIGHT_PAIR = [
  { hp: [10, 10], text: (a, b) => `<@${a.id}> is sleeping in turns with <@${b.id}>` },
  { hp: [10, 10], text: (a, b) => `<@${a.id}> cuddles with <@${b.id}> near a campfire.` },
  { hp: [10, 10], text: (a, b) => `<@${b.id}> promises to sleep with <@${a.id}> for mutual protection, but then ghosts them.` },
  { hp: [10, 0], text: (a, b) => `<@${a.id}> abandons <@${b.id}> after they fell in a ditch.` },
  { hp: [10, 10], text: (a, b) => `<@${a.id}> takes turns sleeping with <@${b.id}>, but <@${b.id}>'s constant sleep-farting makes them run away.` },
  { hp: [5, 0], text: (a, b) => `<@${a.id}> pulls out a phone that they hid in their butt, to watch a video of <@${b.id}> that they recorded secretly.` },
  { hp: [15, 15], text: (a, b) => `<@${a.id}> and <@${b.id}> form an alliance and share their supplies.` },
  { hp: [10, 10], text: (a, b) => `<@${a.id}> and <@${b.id}> swap embarrassing staff stories until sunrise.` },
  { hp: [0, 20], text: (a, b) => `<@${a.id}> patches up <@${b.id}>'s wounds. Friendship is magic.` },
  { betrayal: true, damage: (r) => 12 * r, text: (a, b) => `<@${a.id}> offers to keep watch for <@${b.id}>, then stabs them in their sleep.` },
  { betrayal: true, damage: (r) => 10 * r, text: (a, b) => `<@${a.id}> and <@${b.id}> form an alliance. <@${a.id}> breaks it within the hour and pushes <@${b.id}> off a cliff.` },
  { betrayal: true, damage: (r) => 8 * r, text: (a, b) => `<@${a.id}> steals <@${b.id}>'s blanket and leaves them to freeze.` },
];

function applyHp(player, hp, round) {
  const amount = typeof hp === 'function' ? hp(round) : hp;
  if (amount > 0) player.heal(amount);
  else if (amount < 0) player.takeDamage(-amount);
}

module.exports = { ENVIRONMENT, NIGHT_SOLO, NIGHT_PAIR, applyHp };
