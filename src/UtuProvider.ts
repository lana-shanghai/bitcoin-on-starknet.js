import { BitcoinProvider } from "./BitcoinProvider";
import { BlockHeightProof, RegisterBlocksTx } from "@/UtuTypes";
import { BlockHeader } from "./BitcoinTypes";
import { byteArray } from "starknet";

const CONTRACT_ADDRESS =
  "0x034838129702a2f071cd8cf9277d2f2f2dac3284c2217d9e2e076624fb5afc2f";

// Helper function to convert to little-endian hex
const toLittleEndianHex = (num: number): string => {
  return num.toString(16).padStart(8, "0").match(/.{2}/g)!.reverse().join("");
};

// New helper function to serialize hash
const serializedHash = (hash: string): string[] => {
  return hash
    .match(/.{8}/g)!
    .map((chunk) => "0x" + chunk.match(/.{2}/g)!.reverse().join(""))
    .reverse();
};

export interface UtuProviderResult {
  inclusionProof: string;
  bitcoinRelayerTx?: string;
}

export class UtuProvider {
  private bitcoinProvider: BitcoinProvider;

  constructor(bitcoinProvider: BitcoinProvider) {
    this.bitcoinProvider = bitcoinProvider;
  }

  async getBlockHeightProof(height: number): Promise<BlockHeightProof> {
    const blockHash = await this.bitcoinProvider.getBlockHash(height);
    const block = await this.bitcoinProvider.getBlock(blockHash);
    const coinbaseTransactionHash = block.tx[0];
    const fullProof = await this.bitcoinProvider.getTxOutProof(
      [coinbaseTransactionHash],
      blockHash
    );
    const rawTransaction = await this.bitcoinProvider.getRawTransaction(
      coinbaseTransactionHash
    );
    // Check if this is a SegWit transaction
    const isSegWit = rawTransaction.hex.substring(8, 12) === "0001";

    let cleanedRawTx = rawTransaction.hex;

    if (isSegWit) {
      // Remove marker and flag bytes (0001)
      cleanedRawTx = cleanedRawTx.substring(0, 8) + cleanedRawTx.substring(12);

      // Parse transaction components
      const txBytes = Buffer.from(cleanedRawTx, "hex");
      let offset = 4; // Skip version

      // Read input count and skip inputs
      const numInputs = txBytes[offset];
      offset++;
      for (let i = 0; i < numInputs; i++) {
        offset += 36; // Previous tx hash (32) + output index (4)
        const scriptLen = txBytes[offset];
        offset += 1 + scriptLen; // Script length + script
        offset += 4; // Sequence
      }

      // Read and skip outputs
      const numOutputs = txBytes[offset];
      offset++;
      for (let i = 0; i < numOutputs; i++) {
        offset += 8; // Value
        const scriptLen = txBytes[offset];
        offset += 1 + scriptLen; // Script length + script
      }

      // Reconstruct transaction without witness data
      cleanedRawTx =
        cleanedRawTx.substring(0, offset * 2) + cleanedRawTx.slice(-8);
    }

    const parsePartialMerkleTree = (proofHex: string): string[] => {
      const proofBytes = Buffer.from(proofHex, "hex");
      let offset = 80 + 4; // Skip 80-byte block header and 4-byte total transactions amount

      // Read number of hashes (varint)
      let numHashes = 0;
      let shift = 0;
      while (true) {
        const byte = proofBytes[offset++];
        numHashes |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) break;
        shift += 7;
      }

      // Extract hashes
      const hashes: string[] = [];
      for (let i = 0; i < numHashes; i++) {
        const hash = proofBytes
          .subarray(offset + i * 32, offset + (i + 1) * 32)
          .reverse()
          .toString("hex");
        hashes.push(hash);
      }

      return hashes;
    };

    const leftMerkleBranch = parsePartialMerkleTree(fullProof);

    return {
      // because block extends BlockHeader
      blockHeader: block,
      rawCoinbaseTx: cleanedRawTx,
      merkleProof: leftMerkleBranch.slice(1),
    };
  }

  async getCanonicalChainUpdateTx(
    beginHeight: number,
    endHeight: number,
    proof: boolean
  ) {
    const contractAddress = CONTRACT_ADDRESS;
    const selector = "0x...";
    const lastBlockHash = await this.bitcoinProvider.getBlockHash(endHeight);

    let calldata = [
      "0x" + beginHeight.toString(16),
      "0x" + endHeight.toString(16),
      ...serializedHash(lastBlockHash),
    ];

    if (proof) {
      const proof = await this.getBlockHeightProof(beginHeight);
      const rawCoinbaseTx = serializedHash(proof.rawCoinbaseTx);
      // Option::Some
      calldata.push("0x1");
      // rawCoinbaseTx is like a hash but we need to specify its length
      calldata.push("0x" + rawCoinbaseTx.length.toString(16), ...rawCoinbaseTx);
      // a merkleProof is basically an array of hashes (fixed size arrays)
      calldata.push(
        "0x" + proof.merkleProof.length.toString(16),
        ...proof.merkleProof
          .map(byteArray.byteArrayFromString)
          .flatMap((byteArr) => [
            "0x" + byteArr.data.length.toString(16),
            ...byteArr.data.map((word) => "0x" + word.toString(16)),
            "0x" + byteArr.pending_word.toString(16),
            "0x" + byteArr.pending_word_len.toString(16),
          ])
      );
    } else {
      // Option::None
      calldata.push("0x0");
    }

    return {
      contractAddress,
      selector,
      calldata,
    };
  }

  async getRegisterBlocksTx(blocks: string[]): Promise<RegisterBlocksTx> {
    const blockHeaders = await Promise.all(
      blocks.map((block) => this.bitcoinProvider.getBlockHeader(block))
    );

    return {
      contractAddress: CONTRACT_ADDRESS,
      selector:
        "0x00afd92eeac2cdc892d6323dd051eaf871b8d21df8933ce111c596038eb3afd3",
      calldata: [
        "0x" + blocks.length.toString(16),
        ...blockHeaders.flatMap((header) => this.serializeBlockHeader(header)),
      ],
    };
  }

  private serializeBlockHeader(blockHeader: BlockHeader): string[] {
    // Ensure all fields are present
    const requiredFields = [
      "version",
      "previousblockhash",
      "merkleroot",
      "time",
      "bits",
      "nonce",
    ];

    for (const field of requiredFields) {
      if (!(field in blockHeader)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Serialize each field
    const serialized = [
      "0x" + toLittleEndianHex(blockHeader.version),
      ...serializedHash(blockHeader.previousblockhash as string),
      ...serializedHash(blockHeader.merkleroot),
      "0x" + toLittleEndianHex(blockHeader.time),
      "0x" + blockHeader.bits,
      "0x" + toLittleEndianHex(blockHeader.nonce),
    ];

    return serialized;
  }
}
