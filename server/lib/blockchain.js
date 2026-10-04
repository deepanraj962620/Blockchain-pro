const crypto = require('crypto');

async function recordFileOnChain({ fileName, fileHash, ipfsCid, ownerWallet }) {
  const txHash = '0x' + crypto.createHash('sha256').update(`${fileName}:${fileHash}:${ipfsCid}:${ownerWallet}`).digest('hex').slice(0, 64);

  if (process.env.ETHEREUM_RPC_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
    try {
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const abi = [
        'function addFile(string memory name, string memory hashValue, string memory cid, address owner) public returns (bool)'
      ];
      const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
      const tx = await contract.addFile(fileName, fileHash, ipfsCid, ownerWallet);
      await tx.wait();
      return { txHash: tx.hash, network: process.env.ETHEREUM_NETWORK || 'sepolia', status: 'on-chain' };
    } catch (err) {
      console.warn('On-chain transaction failed, using simulated hash.', err.message);
    }
  }

  return {
    txHash,
    network: process.env.ETHEREUM_NETWORK || 'sepolia',
    status: 'simulated'
  };
}

module.exports = {
  recordFileOnChain
};
