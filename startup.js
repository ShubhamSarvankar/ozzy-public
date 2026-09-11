// startup.js
const { exec, spawn } = require('child_process');

const RESTART_DELAY_MS = 5000;

function deployCommands() {
  return new Promise((resolve, reject) => {
    const proc = exec('node deploy-commands.js', (error) => {
      if (error) reject(error);
      else resolve();
    });
    proc.stdout.on('data', (d) => process.stdout.write(d));
    proc.stderr.on('data', (d) => process.stderr.write(d));
  });
}

function runBot() {
  console.log('Starting bot...');
  const child = spawn('node', ['index.js'], { stdio: 'inherit' });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('[WATCHDOG] Bot exited cleanly. Not restarting.');
      return;
    }
    console.error(`[WATCHDOG] Bot exited with code ${code}. Restarting in ${RESTART_DELAY_MS / 1000}s...`);
    setTimeout(runBot, RESTART_DELAY_MS);
  });
}

async function main() {
  try {
    console.log('Deploying commands...');
    await deployCommands();
    runBot();
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

main();