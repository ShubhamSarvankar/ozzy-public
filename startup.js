// startup.js
const { exec } = require('child_process');
const path = require('path');

console.log('Starting bot deployment process...');

// Function to run a command and return a promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      console.log(stdout);
      resolve();
    });

    // Forward child process output in real-time
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}

async function startBot() {
  try {
    // First deploy commands
    console.log('Deploying commands...');
    await runCommand('node deploy-commands.js');
    
    // Then start the bot
    console.log('Starting bot...');
    await runCommand('node index.js');
    
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

startBot();