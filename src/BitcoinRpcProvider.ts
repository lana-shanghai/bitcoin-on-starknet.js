import { BitcoinProvider } from "@/BitcoinProvider";
import fetch from "cross-fetch";

interface RpcConfig {
  url: string;
  username?: string;
  password?: string;
}

export class BitcoinRpcProvider implements BitcoinProvider {
  private rpcConfig: RpcConfig;

  constructor(rpcConfig: RpcConfig) {
    this.rpcConfig = rpcConfig;
  }

  private async callRpc(method: string, params: any[] = []): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: "1.0",
      id: new Date().getTime(),
      method: method,
      params: params,
    });

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.rpcConfig.username && this.rpcConfig.password) {
      const auth = btoa(
        `${this.rpcConfig.username}:${this.rpcConfig.password}`
      );
      headers["Authorization"] = `Basic ${auth}`;
    }

    const response = await fetch(this.rpcConfig.url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  }

  async getBlockHeader(blockHash: string): Promise<string> {
    return this.callRpc("getblockheader", [blockHash, false]);
  }

  async getBlockHash(blockHeight: number): Promise<string> {
    return this.callRpc("getblockhash", [blockHeight]);
  }

  async getTxOutProof(txids: string[], blockHash?: string): Promise<string> {
    const params = [txids];
    if (blockHash) {
      params.push([blockHash]);
    }
    return this.callRpc("gettxoutproof", params);
  }

  async getRawTransaction(
    txid: string,
    verbose: boolean = false
  ): Promise<any> {
    return this.callRpc("getrawtransaction", [txid, verbose]);
  }
}
