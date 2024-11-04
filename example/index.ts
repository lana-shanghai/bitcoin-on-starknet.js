import { BitcoinProxiedRpcProvider, UtuProvider } from "bitcoin-on-starknet";
import { Account, RpcProvider } from "starknet";

async function main() {
  // Initialize the Bitcoin RPC provider with a testing rpc graciously provided by LFG Labs
  const bitcoinProvider = new BitcoinProxiedRpcProvider(
    "https://btcrpc.lfg.rs/rpc"
  );
  const utuProvider = new UtuProvider(bitcoinProvider);

  // Initialize Starknet provider
  const starknetProvider = new RpcProvider({
    nodeUrl: "https://sepolia.rpc.starknet.id",
  });

  // Initialize a Starknet Account
  const account = new Account(
    starknetProvider,
    process.env.STARKNET_ADDRESS as string,
    process.env.STARKNET_PRIVATE_KEY as string
  );

  try {
    // This is our bitcoin deposit transaction
    const txId =
      "fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc";
    const rawTransaction = await bitcoinProvider.getRawTransaction(txId, true);
    const header = await bitcoinProvider.getBlockHeader(
      rawTransaction.blockhash
    );

    // Generate actual transactions
    const syncTransactions = await utuProvider.getSyncTxs(
      starknetProvider,
      header.height,
      0n
    );

    const txInclusionProof = await utuProvider.getTxInclusionProof(txId);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
