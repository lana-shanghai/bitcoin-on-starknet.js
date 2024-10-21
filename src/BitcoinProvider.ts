// src/BitcoinProvider.ts

export interface BitcoinProvider {
  getBlockHeader(blockHash: string): Promise<string>;
  getBlockHash(blockHeight: number): Promise<string>;
  getTxOutProof(txids: string[], blockHash?: string): Promise<string>;
  getRawTransaction(txid: string, verbose?: boolean): Promise<any>;
}
