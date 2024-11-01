import { BitcoinRpcProvider, UtuProvider } from "bitcoin-on-starknet";

async function main() {
  // Initialize the Bitcoin RPC provider
  const bitcoinProvider = new BitcoinRpcProvider({
    url: process.env.BITCOIN_RPC_URL,
    username: process.env.BITCOIN_RPC_USERNAME,
    password: process.env.BITCOIN_RPC_PASSWORD,
  });
  const utuProvider = new UtuProvider(bitcoinProvider);

  try {
    // Data that we are going to use
    const txId =
      "fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc";
    const rawTransaction = await bitcoinProvider.getRawTransaction(txId, true);
    const blockHeader = await bitcoinProvider.getBlockHeader(
      rawTransaction.blockhash
    );

    // Generate actual transactions
    const registerBlocksTx = await utuProvider.getRegisterBlocksTx([
      rawTransaction.blockhash,
    ]);
    const canonicalChainUpdateTx = await utuProvider.getCanonicalChainUpdateTx(
      blockHeader.height,
      blockHeader.height,
      true
    );
    const txInclusionProof = await utuProvider.getTxInclusionProof(txId);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
