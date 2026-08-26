// ============================================================
// start_all.js – All-in-One Automated System Launcher
//
// Launches Blockchain Node, Deploys Smart Contract, Updates .env,
// Starts Backend API, Starts Frontend UI, and Starts IoT Simulator.
//
// Usage: npm start (or node start_all.js)
// ============================================================

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const blockchainDir = path.join(rootDir, 'blockchain');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

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

// 1. Start Hardhat Node (use alternative port 8547 to avoid conflicts)
console.log('1️⃣ Launching Local Blockchain Node (Port 8547)...');
// Hardhat supports passing the port via the --port flag
const nodeProc = spawn('npx', ['hardhat', 'node', '--port', '8547'], { cwd: blockchainDir, shell: true });

nodeProc.stdout.on('data', (d) => log('BLOCKCHAIN', d, '35'));
nodeProc.stderr.on('data', (d) => log('BLOCKCHAIN-ERR', d, '31'));

// 2. Wait for node to initialize, then deploy smart contract
setTimeout(() => {
  console.log('\n2️⃣ Deploying EnergyMeter Smart Contract...');
  try {
    const deployOutput = execSync('npx hardhat run scripts/deploy.js --network localhost', {
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
        // Update RPC URL to match the new port (8547)
        envContent = envContent.replace(/BLOCKCHAIN_RPC_URL=.*/g, 'BLOCKCHAIN_RPC_URL=http://127.0.0.1:8547');
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
  const backendProc = spawn('node', ['server.js'], { cwd: backendDir, shell: true });
  backendProc.stdout.on('data', (d) => log('BACKEND', d, '32'));
  backendProc.stderr.on('data', (d) => log('BACKEND-ERR', d, '31'));

  // 4. Start Frontend Vite Dashboard
  console.log('4️⃣ Launching Frontend Vite Dashboard (Port 5173)...');
  const frontendProc = spawn('npx', ['vite'], { cwd: frontendDir, shell: true });
  frontendProc.stdout.on('data', (d) => log('FRONTEND', d, '36'));
  frontendProc.stderr.on('data', (d) => log('FRONTEND-ERR', d, '31'));

  // 5. Start IoT Smart Meter Simulator
  setTimeout(() => {
    console.log('5️⃣ Launching IoT Smart Meter Signed Simulator...');
    // Use the signed‑payload simulator which includes signature, sequence and hash.
    const simProc = spawn('node', ['scripts/test_signed.js'], { cwd: backendDir, shell: true });
    simProc.stdout.on('data', (d) => log('SIMULATOR', d, '33'));
    simProc.stderr.on('data', (d) => log('SIMULATOR-ERR', d, '31'));
  }, 3000);

}, 4500);

// Process termination handler
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ENARGY services...');
  process.exit(0);
});
