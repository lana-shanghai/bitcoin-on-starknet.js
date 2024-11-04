import { BitcoinProvider } from "./BitcoinProvider";
import { BlockHeightProof, RegisterBlocksTx } from "@/UtuTypes";
import { BlockHeader } from "./BitcoinTypes";
import { BigNumberish, byteArray, ByteArray } from "starknet";

const CONTRACT_ADDRESS =
  "0x064e21f88caa162294fdda7f73d67ad09b81419e97df3409a5eb13ba39b88c31";

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

// Add this helper function near the top with other helpers
const formatFelt = (value: BigNumberish): string => {
  if (typeof value === "string" && value.startsWith("0x")) {
    return value;
  }
  return "0x" + (typeof value === "string" ? value : value.toString(16));
};

// Helper function to reverse bytes in a hex string
const reverseBytes = (hex: string): string => {
  return hex.match(/../g)!.reverse().join("");
};

// Helper function to convert hex string to ByteArray
const byteArrayFromHexString = (hex: string): ByteArray => {
  // Remove '0x' prefix if present
  hex = hex.replace("0x", "");

  const WORD_SIZE = 31; // Maximum bytes per word
  const data: BigNumberish[] = [];
  let currentWord = "";

  // Process pairs of hex chars (1 byte)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    currentWord += byte;

    // When we reach WORD_SIZE bytes, add to data array
    if (currentWord.length === WORD_SIZE) {
      data.push("0x" + Buffer.from(currentWord, "ascii").toString("hex"));
      currentWord = "";
    }
  }

  // Handle remaining bytes
  if (currentWord.length > 0) {
    return {
      data,
      pending_word: "0x" + Buffer.from(currentWord, "ascii").toString("hex"),
      pending_word_len: currentWord.length,
    };
  }

  return {
    data,
    pending_word: "0x00",
    pending_word_len: 0,
  };
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

  async getTxInclusionProof(txid: string): Promise<[string, boolean][]> {
    // Get the transaction's block hash and proof
    const proof = await this.bitcoinProvider.getTxOutProof([txid]);

    // Extract total transactions count (4 bytes after block header)
    const txCount = parseInt(
      proof.slice(160, 168).match(/../g)!.reverse().join(""),
      16
    );

    // Read CompactSize for number of hashes
    const [hashCount, startPosition] = this.readCompactSize(proof, 168);

    // Extract hashes
    const hashes: string[] = [];
    let position = startPosition;
    for (let i = 0; i < hashCount; i++) {
      const hash = proof.slice(position, position + 64);
      hashes.push(reverseBytes(hash));
      position += 64;
    }

    // Read flag bits
    const [flagBitsLength, flagPosition] = this.readCompactSize(
      proof,
      position
    );
    const flagBytes = proof.slice(
      flagPosition,
      flagPosition + flagBitsLength * 2
    );

    // Convert flag bytes to bits array
    const flagBits: boolean[] = [];
    for (let i = 0; i < flagBytes.length; i += 2) {
      const byte = parseInt(flagBytes.slice(i, i + 2), 16);
      for (let j = 0; j < 8; j++) {
        flagBits.push((byte & (1 << j)) !== 0);
      }
    }

    // Calculate merkle branch using tree traversal
    const merkleBranch: [string, boolean][] = [];
    let hashPos = 0;
    let flagPos = 0;

    const height = Math.ceil(Math.log2(txCount));

    // Helper function to calculate tree width at a given height
    function calcTreeWidth(height: number): number {
      return (txCount + (1 << height) - 1) >> height;
    }

    function traverse(height: number, pos: number): [string, boolean] {
      if (flagPos >= flagBits.length) {
        throw new Error("Overflowed flag bits array");
      }

      const parent = flagBits[flagPos++];

      if (height === 0 || !parent) {
        // If at height 0 or nothing interesting below, use the stored hash
        if (hashPos >= hashes.length) {
          throw new Error("Overflowed hash array");
        }
        const hash = hashes[hashPos++];
        return [hash, true];
      }

      // Otherwise, descend into the subtrees
      const [left, is_left_leaf] = traverse(height - 1, pos * 2);
      let [right, is_right_leaf] = [left, is_left_leaf]; // Default to left if no right child exists

      // Only traverse right child if it exists within the tree width
      if (pos * 2 + 1 < calcTreeWidth(height - 1)) {
        [right, is_right_leaf] = traverse(height - 1, pos * 2 + 1);
        if (right === left) {
          throw new Error("Invalid merkle proof - duplicate hash");
        }
      }

      if (is_left_leaf && left !== txid) {
        merkleBranch.push([left, true]);
      }
      if (is_right_leaf && right !== txid) {
        merkleBranch.push([right, false]);
      }

      function hashCouple(hex1: string, hex2: string): string {
        const crypto = require("crypto");
        const combined = Buffer.concat([
          Buffer.from(reverseBytes(hex1), "hex"),
          Buffer.from(reverseBytes(hex2), "hex"),
        ]);
        const firstHash = crypto.createHash("sha256").update(combined).digest();
        return reverseBytes(
          crypto.createHash("sha256").update(firstHash).digest("hex")
        );
      }

      const combined = hashCouple(left, right);
      return [combined, false];
    }

    const [_computedRoot, _] = traverse(height, 0);

    return merkleBranch;
  }

  async getCanonicalChainUpdateTx(
    beginHeight: number,
    endHeight: number,
    proof: boolean
  ) {
    const contractAddress = CONTRACT_ADDRESS;
    const selector =
      "0x02e486c87262b6abbb9f00f150fe22bd3fa5568adb9524d7c4f9f4e38ca17529";
    const firstBlockHash = await this.bitcoinProvider.getBlockHash(beginHeight);
    const lastBlockHash = await this.bitcoinProvider.getBlockHash(endHeight);
    const firstBlockHeader = await this.bitcoinProvider.getBlockHeader(
      firstBlockHash
    );

    let calldata = [
      formatFelt(beginHeight),
      formatFelt(endHeight),
      ...serializedHash(lastBlockHash),
    ];
    if (proof) {
      const proof = await this.getBlockHeightProof(beginHeight);
      // Option::Some
      calldata.push("0x0");

      // block header
      calldata.push(...this.serializeBlockHeader(firstBlockHeader));

      const byteArrayCoinbaseTx = byteArrayFromHexString(proof.rawCoinbaseTx);

      calldata.push(
        formatFelt(byteArrayCoinbaseTx.data.length),
        ...byteArrayCoinbaseTx.data.map((word) => formatFelt(word)),
        formatFelt(byteArrayCoinbaseTx.pending_word),
        formatFelt(byteArrayCoinbaseTx.pending_word_len)
      );
      // a merkleProof is basically an array of hashes (fixed size arrays)
      calldata.push(
        formatFelt(proof.merkleProof.length),
        ...proof.merkleProof.flatMap(serializedHash)
      );
    } else {
      // Option::None
      calldata.push("0x1");
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
        formatFelt(blocks.length),
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
      formatFelt(toLittleEndianHex(blockHeader.version)),
      ...serializedHash(blockHeader.previousblockhash as string),
      ...serializedHash(blockHeader.merkleroot),
      formatFelt(toLittleEndianHex(blockHeader.time)),
      formatFelt(blockHeader.bits),
      formatFelt(toLittleEndianHex(blockHeader.nonce)),
    ];

    return serialized;
  }

  private readCompactSize(
    hex: string,
    startPosition: number
  ): [number, number] {
    const firstByte = parseInt(hex.slice(startPosition, startPosition + 2), 16);
    let value: number;
    let newPosition = startPosition;

    if (firstByte < 0xfd) {
      value = firstByte;
      newPosition += 2;
    } else if (firstByte === 0xfd) {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 6)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 6;
    } else if (firstByte === 0xfe) {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 10)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 10;
    } else {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 18)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 18;
    }
    return [value, newPosition];
  }
}
