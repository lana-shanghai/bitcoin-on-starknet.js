import {
  BitcoinProxiedRpcProvider,
  UtuProvider,
  serializedHash,
} from "bitcoin-on-starknet";
import { Account, RpcProvider, TransactionType, Invocations } from "starknet";

// Example of a serialized Bitcoin transaction data structure
// This represents a pre-formatted transaction ready for Starknet processing
const EXAMPLE_SERIALIZED_TRANSACTION = [
  2n,
  0n,
  1n,
  4n,
  127546132949210781219533252159022639450970689694324394832203925292873026833n,
  99892504610292551029880722820554936728813665763763858407732768400713688682n,
  172923111859001333637712955585689064747483567325099474889041414256563905907n,
  221929393252830214864465594073262010340874249222247854506920692160908531919n,
  11426847954597392708735371614518684n,
  15n,
  4294967295n,
  1615376208n,
  3463025754n,
  988515002n,
  88934289n,
  57631028n,
  1205197770n,
  4160278298n,
  1843336072n,
  1n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  0n,
  1n,
  100043947n,
  0n,
  744843869111954496999033090920949585736336206836849668294828n,
  25n,
  0n,
  0n,
] as const;

async function main() {
  // Initialize providers
  // Bitcoin RPC provider connects to LFG Labs' testing endpoint for Bitcoin network interaction
  const bitcoinProvider = new BitcoinProxiedRpcProvider(
    "https://btcrpc.lfg.rs/rpc"
  );
  const utuProvider = new UtuProvider(bitcoinProvider);

  // Configure Starknet provider for Sepolia testnet
  const starknetProvider = new RpcProvider({
    nodeUrl: "https://sepolia.rpc.starknet.id",
  });

  // Initialize Starknet account using environment variables
  // Requires STARKNET_ADDRESS and STARKNET_PRIVATE_KEY to be set
  const account = new Account(
    starknetProvider,
    process.env.STARKNET_ADDRESS as string,
    process.env.STARKNET_PRIVATE_KEY as string
  );

  try {
    // Fetch and verify Bitcoin deposit transaction
    const txId =
      "fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc";
    const rawTransaction = await bitcoinProvider.getRawTransaction(txId, true);
    const header = await bitcoinProvider.getBlockHeader(
      rawTransaction.blockhash
    );

    // Generate synchronization transactions for Starknet
    // These ensure the Bitcoin state is properly reflected on Starknet
    const syncTransactions = await utuProvider.getSyncTxs(
      starknetProvider,
      header.height,
      0n
    );

    // Generate Merkle proof for deposit verification
    const txInclusionProof = await utuProvider.getTxInclusionProof(txId);

    // Prepare calldata for prove_deposit function
    // Includes: transaction data, UTXO ID, block details, and Merkle proof
    let calldata = EXAMPLE_SERIALIZED_TRANSACTION.map(
      (n) => "0x" + n.toString(16)
    );
    calldata.push("0x0");
    calldata.push("0x" + header.height.toString(16)); // block_height (u64)
    calldata.push(...utuProvider.serializeBlockHeader(header));

    // Add tx_inclusion proof
    calldata.push(txInclusionProof.length);
    txInclusionProof.forEach(([hash, direction]: [string, boolean]) => {
      calldata.push(...serializedHash(hash)); // Merkle proof hash
      calldata.push(direction ? "0x1" : "0x0"); // Direction (bool)
    });
    const proveDepositCall = {
      contractAddress:
        "0x04d3c95735a74aafd9092705943b0602f100d77f2ce872ffd4962c4924e6d145",
      selector:
        "0x025a9ad6882f2475e2ffb11f893dc90829a3672ad40d5428084330b36e55fbff",
      calldata,
    };

    // Send a multicall syncing the chain before interacting with our contract
    await account.execute([...syncTransactions, proveDepositCall]);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
