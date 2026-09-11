const fs = require('fs');
const path = require('path');

async function updateAvatar(client) {
  try {
    const avatarPath = path.join(__dirname, '..', 'images', 'snorlax.png');

    if (!fs.existsSync(avatarPath)) {
      console.warn('[Avatar] File not found: newpfp.png');
      return;
    }

    await client.user.setAvatar(avatarPath);
    console.log('[Avatar] Updated bot avatar using newpfp.png');
  } catch (error) {
    console.error('[Avatar] Failed to update bot avatar:', error);
  }
}

module.exports = updateAvatar;