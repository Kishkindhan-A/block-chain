require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",

  networks: {
    // Local Hardhat development node (default)
    localhost: {
      // Updated to match the custom port used by start_all.js to avoid conflicts
      url: "http://127.0.0.1:8547",
    },
    // Sepolia testnet
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/12YLHOQTngcYaYvZ_pp3r",
      accounts: ["0xf3544773d54ae06396ce379803e15f025a5fdcca56807d5b780614b177e5ab62"],
    },
  },
};
