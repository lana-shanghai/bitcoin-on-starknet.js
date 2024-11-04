import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";

export class BitcoinProxiedRpcProvider extends BitcoinRpcProvider {
  private proxyUrl: string;

  constructor(proxyUrl: string) {
    // Pass a dummy config to parent class
    super({ url: "dummy" });
    this.proxyUrl = proxyUrl;
  }

  protected override async callRpc(
    method: string,
    params: any[] = []
  ): Promise<Response> {
    const body = JSON.stringify({
      jsonrpc: "1.0",
      id: new Date().getTime(),
      method: method,
      params: params,
    });

    return fetch(this.proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });
  }
}
