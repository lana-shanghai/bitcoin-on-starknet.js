import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";
import fetch from "cross-fetch";

jest.mock("cross-fetch");

describe("BitcoinRpcProvider", () => {
  let provider: BitcoinRpcProvider;

  beforeEach(() => {
    provider = new BitcoinRpcProvider({
      url: "http://localhost:8332",
      username: "testuser",
      password: "testpass",
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should get block header", async () => {
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ result: "mock_block_header" }),
    };
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      mockResponse as any
    );

    const result = await provider.getBlockHeader("mock_block_hash");
    expect(result).toBe("mock_block_header");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8332",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"method":"getblockheader"'),
      })
    );
  });

  it("should get block hash", async () => {
    const mockResponse = {
      json: jest.fn().mockResolvedValue({ result: "mock_block_hash" }),
    };
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
      mockResponse as any
    );

    const result = await provider.getBlockHash(12345);
    expect(result).toBe("mock_block_hash");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8332",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"method":"getblockhash"'),
      })
    );
  });
});
