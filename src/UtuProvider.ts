import { BitcoinProvider } from "./BitcoinProvider";
import { BlockHeightProof } from "@/BitcoinTypes";

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
}
