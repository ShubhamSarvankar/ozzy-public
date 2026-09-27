/**
 * Staff arena events for the bloodbath. Each takes (player, dies) and returns the
 * line to show; `dies` true means the staff member kills the player (no player
 * gets the kill).
 */

const CHARACTERS = {
    elp: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> tells Elp that he's not the greatest. Elp publicly executes them.`
            : `✨ <@${player.id}> exposed the underground staff food black market. Elp rewards <@${player.id}>!`; 
    },

    ayan: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> claims that Summer Bash is not a real trophy. Ayan impales them with his pencil.`
            : `✨ <@${player.id}> calls Ayan a curry muncher and receives Ayan Hats as a reward.`; 
    },

    scorp: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> publicly states that rock music is the worst genre. Scorp smashes a fucking grand piano on their head.`
            : `✨ <@${player.id}> listens to rock music for morale. Scorp notices and brews a coffee for them.`; 
    },

    wynn: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> wanders into Wynn's corn maze, gets lost and screams for help. Soon, the only sound left is zombies munching on bones.`
            : `✨ <@${player.id}> calls Wynn a curry muncher. Wynn is overjoyed and bakes them a cake.`; 
    },

    snowy: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> gets sued and hires Snowy as their lawyer. She causes legal damages and <@${player.id}> now owes **Elp** their soul.`
            : `✨ Snowy lets <@${player.id}> pet Petunia.`; 
    },

    maya: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> says they would make a better Twin Oreo than Snowy. Maya creates a sonic boom in the process of slapping them.`
            : `✨ Maya bought <@${player.id}> a gourmet lollipop!`; 
    },

    diwix: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> says that Diwix isn't a real curry muncher.`
            : `✨ <@${player.id}> spams Diwix's DMs with memes.`; 
    },

    nell: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> makes Nell's bruschetta recipe but adds curry to it. Nell uses a dental drill to slowly burrow into their brain.`
            : `✨ <@${player.id}> buys some teeth from Nell to snack on, giving them energy.`; 
    },

    joe: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> says that Joe is very American. Joe responds as a true patriot by invading their home and taking all their oil.`
            : `✨ <@${player.id}> helps Joe in getting some stuff done.`; 
    },

    geo: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> gets forced to pull Santa Geo's sleigh, which proves fatal.`
            : `✨ <@${player.id}> buys invests in GeoCoin. Geo sneaks into their home at night and leaves them some gifts.`; 
    },

    beasto: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> dies of cringe during a conversation with Beasto.`
            : `✨ <@${player.id}> calls Beasto a monkey.`; 
    },

    jo: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> gets accidentally eaten by Jo. Was it really an accident? We'll never know.`
            : `✨ <@${player.id}> does a headstand and says Tasty. Jo is happy that he finally found someone he can relate to.`; 
    },

    zenishira: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 <@${player.id}> trash talks all of Zenishira's favourite games... it does not end well.`
            : `✨ <@${player.id}> has an at-length conversation with Zenishira about games and personality types.`; 
    },

    ru: function(player, dies) {
        const damage = dies ? 100 : 0;
        player.takeDamage(damage);

        return dies
            ? `🪦 Ru is feeling sleepy, she accidentally drops a fucking building on <@${player.id}> while yawning.`
            : `✨ <@${player.id}> and Ru sing along to cringe Indian DJ songs.`; 
    },
    
}

module.exports = { CHARACTERS };
