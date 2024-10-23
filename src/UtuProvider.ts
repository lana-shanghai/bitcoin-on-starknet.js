import { BitcoinProvider } from "./BitcoinProvider";
import { BlockHeightProof, RegisterBlocksTx } from "@/UtuTypes";
import { BlockHeader } from "./BitcoinTypes";

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
      rawCoinbaseTx: rawTransaction.hex,
      merkleProof: leftMerkleBranch,
    };
  }

  async getRegisterBlocksTx(blocks: string[]): Promise<RegisterBlocksTx> {
    const blockHeaders = await Promise.all(
      blocks.map((block) => this.bitcoinProvider.getBlockHeader(block))
    );

    return {
      contractAddress: "0x...", // Replace with actual contract address
      selector: "0x...", // Replace with actual selector
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

    // Helper function to convert to little-endian hex
    const toLittleEndianHex = (num: number): string => {
      return num
        .toString(16)
        .padStart(8, "0")
        .match(/.{2}/g)!
        .reverse()
        .join("");
    };

    // Serialize each field
    const serialized = [
      "0x" + toLittleEndianHex(blockHeader.version),
      "0x" + blockHeader.previousblockhash,
      "0x" + blockHeader.merkleroot,
      "0x" + toLittleEndianHex(blockHeader.time),
      "0x" + blockHeader.bits,
      "0x" + toLittleEndianHex(blockHeader.nonce),
    ];

    return serialized;
  }
}
