// ============================================================
// scripts/deploy.js – Hardhat Deployment Script
//
// Run with: npx hardhat run scripts/deploy.js --network localhost
//
// After running, copy the printed contract address into:
//   - backend/.env  →  CONTRACT_ADDRESS=0x...
// ============================================================

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying EnergyMeter contract...\n");

  // Get the deployer account (first Hardhat test account by default)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance :", hre.ethers.formatEther(balance), "ETH\n");

  // Get the contract factory and deploy
  const EnergyMeter = await hre.ethers.getContractFactory("EnergyMeter");
  const contract    = await EnergyMeter.deploy();

  // Wait until the transaction is mined
  await contract.waitForDeployment();

  console.log("✅ EnergyMeter deployed successfully!");
  console.log("📋 Contract Address:", contract.target);
  console.log("\n⚠️  ACTION REQUIRED:");
  console.log(`   Copy this address into backend/.env:`);
  console.log(`   CONTRACT_ADDRESS=${contract.target}\n`);
}

// Run the deploy function and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
