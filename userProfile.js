const fs = require('fs');
const path = require('path');

// Use a safe, writable path - tries these locations in order:
const DATA_DIR = [
  path.join(__dirname, 'bot_data'),      // 1. Local bot_data folder
  '/tmp/bot_data',                       // 2. System temp directory
  path.join(process.cwd(), 'data')       // 3. Current working directory
].find(dir => {
  try {
    fs.accessSync(path.dirname(dir), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}) || path.join(__dirname, 'bot_data');  // Fallback

const profilesPath = path.join(DATA_DIR, 'profiles.json');

// Ensure directory and file exist (with error handling)
function initStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`📁 Created data directory: ${DATA_DIR}`);
    }
    if (!fs.existsSync(profilesPath)) {
      fs.writeFileSync(profilesPath, '{}');
      console.log(`📄 Created profiles file: ${profilesPath}`);
    }
  } catch (err) {
    console.error('❌ Storage initialization failed:', err.message);
    console.error('💡 Solution: Contact your host to enable writes to one of these paths:');
    console.error(`- ${path.join(__dirname, 'bot_data')}`);
    console.error(`- /tmp/bot_data`);
    process.exit(1);
  }
}
initStorage();

function getProfile(userId) {
  try {
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    return profiles[userId] || { about: 'No information provided.' };
  } catch (err) {
    console.error('❌ Failed to read profiles:', err.message);
    return { about: 'Profile unavailable.' };
  }
}

function setProfile(userId, data) {
  try {
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    profiles[userId] = data;
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
  } catch (err) {
    console.error('❌ Failed to save profile:', err.message);
    throw new Error('Could not save profile data');
  }
}

module.exports = { getProfile, setProfile };