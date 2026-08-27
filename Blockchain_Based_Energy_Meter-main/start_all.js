// ============================================================
// start_all.js – All-in-One Automated System Launcher
//
// Launches Blockchain Node, Deploys Smart Contract, Updates .env,
// Starts Backend API, Starts Frontend UI, and Starts IoT Simulator.
//
// Usage: npm start (or node start_all.js)
// ============================================================

const { spawn, execSync } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const blockchainDir = path.join(rootDir, 'blockchain');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const simulatorPidPath = path.join(backendDir, '.simulator.pid');
const blockchainPort = 8548;
const backendPort = 3002;
const frontendPort = 5173;
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

console.log('⚡ ==================================================== ⚡');
console.log('🚀 Launching ENARGY Ecosystem (All-In-One Runner)');
console.log('⚡ ==================================================== ⚡\n');

function log(prefix, data, colorCode = '36') {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line}`);
    }
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function startProcess(command, args, cwd) {
  if (process.platform === 'win32' && command.endsWith('.cmd')) {
    return spawn('cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
      cwd,
      windowsHide: true
    });
  }
  return spawn(command, args, { cwd, windowsHide: true });
}

// 1. Start Hardhat Node (use alternative port 8548 to avoid conflicts)
console.log(`1️⃣ Launching Local Blockchain Node (Port ${blockchainPort})...`);

// 2. Wait for node to initialize, then deploy smart contract
setTimeout(async () => {
  let nodeProc;
  if (await isPortInUse(blockchainPort)) {
    console.log(`✅ Blockchain node already running on port ${blockchainPort}; reusing it.`);
  } else {
    nodeProc = startProcess(npxCommand, ['hardhat', 'node', '--port', String(blockchainPort)], blockchainDir);
    nodeProc.stdout.on('data', (d) => log('BLOCKCHAIN', d, '35'));
    nodeProc.stderr.on('data', (d) => log('BLOCKCHAIN-ERR', d, '31'));
  }

  console.log('\n2️⃣ Deploying EnergyMeter Smart Contract...');
  try {
    const deployOutput = execSync(`${npxCommand} hardhat run scripts/deploy.js --network localhost`, {
      cwd: blockchainDir,
      encoding: 'utf8'
    });
    console.log(deployOutput);

    const match = deployOutput.match(/Contract Address:\s*(0x[a-fA-F0-9]{40})/);
    if (match && match[1]) {
      const contractAddress = match[1];
      console.log(`✅ Extracted Deployed Contract Address: ${contractAddress}`);
      
      const envPath = path.join(backendDir, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        // Update contract address
        envContent = envContent.replace(/CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}|CONTRACT_ADDRESS=0xYourDeployedContractAddress/g, `CONTRACT_ADDRESS=${contractAddress}`);
        // Update RPC URL to match the new port (8548)
        envContent = envContent.replace(/BLOCKCHAIN_RPC_URL=.*/g, 'BLOCKCHAIN_RPC_URL=http://127.0.0.1:8548');
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('✅ Updated backend/.env with contract address and RPC URL.\n');
      }
    }
  } catch (err) {
    console.error('❌ Contract deployment failed:', err.message);
  }

  // 3. Start Backend Express API
  // Backend reads its listening port from .env (PORT). We log the value after the server starts.
  console.log('3️⃣ Launching Backend Express Server (port from .env)...');
  let backendProc;
  if (await isPortInUse(backendPort)) {
    console.log(`✅ Backend already running on port ${backendPort}; reusing it.`);
  } else {
    backendProc = startProcess('node', ['server.js'], backendDir);
  }

  // 4. Start Frontend Vite Dashboard
  console.log('4️⃣ Launching Frontend Vite Dashboard (Port 5173)...');
  if (await isPortInUse(frontendPort)) {
    console.log(`✅ Frontend already running on port ${frontendPort}; reuse http://localhost:${frontendPort}/.`);
  } else {
    const frontendProc = startProcess(npxCommand, ['vite', '--port', String(frontendPort)], frontendDir);
    frontendProc.stdout.on('data', (d) => log('FRONTEND', d, '36'));
    frontendProc.stderr.on('data', (d) => log('FRONTEND-ERR', d, '31'));
  }

  // 5. Start IoT Smart Meter Simulator **after** the backend reports it is listening.
  // Previously we used a fixed timeout (3 s) which could fire before the Express server
  // finished binding to the port, causing ECONNREFUSED errors. We now wait for the
  // backend stdout line that contains "URL:" before launching the simulator.
  const launchSimulator = () => {
    if (fs.existsSync(simulatorPidPath)) {
      const simulatorPid = Number(fs.readFileSync(simulatorPidPath, 'utf8').trim());
      try {
        process.kill(simulatorPid, 0);
        console.log('✅ Simulator already running; reusing it.');
        return;
      } catch {
        fs.rmSync(simulatorPidPath, { force: true });
      }
    }
    console.log('5️⃣ Launching IoT Smart Meter Signed Simulator...');
    const simProc = startProcess('node', ['scripts/test_signed.js'], backendDir);
    fs.writeFileSync(simulatorPidPath, String(simProc.pid), 'utf8');
    simProc.stdout.on('data', (d) => log('SIMULATOR', d, '33'));
    simProc.stderr.on('data', (d) => log('SIMULATOR-ERR', d, '31'));
    simProc.on('exit', () => {
      if (fs.existsSync(simulatorPidPath) && Number(fs.readFileSync(simulatorPidPath, 'utf8')) === simProc.pid) {
        fs.rmSync(simulatorPidPath, { force: true });
      }
    });
  };

  // Listen for the backend's "URL:" log line to know it is ready.
  if (!backendProc) {
    launchSimulator();
  } else {
    backendProc.stderr.on('data', (d) => log('BACKEND-ERR', d, '31'));
    backendProc.stdout.on('data', (d) => {
    const line = d.toString();
    log('BACKEND', d, '32');
    if (line.includes('URL:')) {
      // Small delay to ensure the server is fully bound before the simulator hits it.
      setTimeout(launchSimulator, 500);
    }
  });
  }

}, 4500);

// Process termination handler
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ENARGY services...');
  process.exit(0);
});
