import { BlockHeader } from "@/BitcoinTypes";

export interface BitcoinProvider {
  getBlockHeader(blockHash: string): Promise<BlockHeader>;
  getBlockHash(blockHeight: number): Promise<string>;
  getTxOutProof(txids: string[], blockHash?: string): Promise<string>;
  getRawTransaction(txid: string, verbose?: boolean): Promise<any>;
}
