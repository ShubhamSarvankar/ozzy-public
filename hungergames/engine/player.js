// A tribute. Weapon/character/zone data functions mutate these directly via
// takeDamage()/heal(), so the class shape is part of the data contract.

class Player {
  constructor(id, avatar = null) {
    this.id = id;
    this.avatar = avatar;
    this.health = 100;
    this.alive = true;
    this.weapons = []; // weapon keys (WEAPONS in solo, SQUAD_LOOT in squad)
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.alive = false;
  }

  heal(amount) {
    if (!this.alive) return;
    this.health = Math.min(100, this.health + amount);
  }

  addWeapon(key) {
    if (!this.weapons.includes(key)) this.weapons.push(key);
  }
}

module.exports = { Player };
