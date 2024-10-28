import { BitcoinRpcProvider, UtuProvider } from "bitcoin-on-starknet";

async function main() {
  // Initialize the Bitcoin RPC provider
  const bitcoinProvider = new BitcoinRpcProvider({
    url: process.env.BITCOIN_RPC_URL || "http://localhost:8332",
    username: process.env.BITCOIN_RPC_USERNAME,
    password: process.env.BITCOIN_RPC_PASSWORD,
  });

  // Initialize the Utu provider with the Bitcoin provider
  const utuProvider = new UtuProvider(bitcoinProvider);

  try {
    // Get proof for block height 800000
    console.log("Getting proof for block 800000...");
    const proof = await utuProvider.getBlockHeightProof(800000);
    console.log("Block header:", proof.blockHeader);
    console.log("Raw coinbase transaction:", proof.rawCoinbaseTx);
    console.log("Merkle proof length:", proof.merkleProof.length);

    // Get register blocks transaction
    const blockHash =
      "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee";
    console.log("\nGetting register blocks transaction...");
    const registerTx = await utuProvider.getRegisterBlocksTx([blockHash]);
    console.log("Contract address:", registerTx.contractAddress);
    console.log("Selector:", registerTx.selector);
    console.log("Calldata length:", registerTx.calldata.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
