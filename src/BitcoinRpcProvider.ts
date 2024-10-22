import fetch from "cross-fetch";
import { BitcoinProvider } from "@/BitcoinProvider";
import { BlockHeader, RawTransaction } from "@/BitcoinTypes";

interface RpcConfig {
  url: string;
  port?: number;
  username?: string;
  password?: string;
}

export class BitcoinRpcProvider implements BitcoinProvider {
  private rpcConfig: RpcConfig;

  constructor(rpcConfig: RpcConfig) {
    this.rpcConfig = {
      ...rpcConfig,
      port: rpcConfig.port || 8332, // Default Bitcoin RPC port
    };
  }

  private async callRpc(method: string, params: any[] = []): Promise<Response> {
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

    const url = `${this.rpcConfig.url}:${this.rpcConfig.port}`;
    return fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
  }

  private async callRpcJson(method: string, params: any[] = []): Promise<any> {
    const response = await this.callRpc(method, params);
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  }

  async getBlockHeader(blockHash: string): Promise<BlockHeader> {
    return this.callRpcJson("getblockheader", [blockHash, true]);
  }

  async getBlockHash(blockHeight: number): Promise<string> {
    return this.callRpcJson("getblockhash", [blockHeight]);
  }

  async getTxOutProof(txids: string[], blockHash?: string): Promise<string> {
    const params = [txids];
    if (blockHash) {
      params.push([blockHash]);
    }
    return this.callRpcJson("gettxoutproof", params);
  }

  async getRawTransaction(txid: string): Promise<RawTransaction> {
    return this.callRpcJson("getrawtransaction", [txid, true]);
  }
}
