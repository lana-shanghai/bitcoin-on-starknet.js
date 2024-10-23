import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";
import fetch from "cross-fetch";

jest.mock("cross-fetch");

describe("BitcoinRpcProvider", () => {
  let provider: BitcoinRpcProvider;

  beforeEach(() => {
    provider = new BitcoinRpcProvider({
      url: "http://example-bitcoin-rpc.com",
      username: "satoshi",
      password: "fakepassword123",
    });

    // Add this mock reset
    (fetch as jest.MockedFunction<typeof fetch>).mockReset();
  });

  it("should get block header", async () => {
    const knownBlockHash =
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"; // Genesis block hash

    // Update the mock to correctly simulate the RPC response
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        result: {
          hash: knownBlockHash,
          confirmations: 866714,
          height: 0,
          version: 1,
          versionHex: "00000001",
          merkleroot:
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
          time: 1231006505,
          mediantime: 1231006505,
          nonce: 2083236893,
          bits: "1d00ffff",
          difficulty: 1,
          chainwork:
            "0000000000000000000000000000000000000000000000000000000100010001",
          nTx: 1,
          nextblockhash:
            "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048",
        },
      }),
    } as any);

    const result = await provider.getBlockHeader(knownBlockHash);
    expect(result).toBeDefined();
    expect(result.hash).toBe(knownBlockHash);
    expect(result.confirmations).toBe(866714);
    expect(result.height).toBe(0);
    expect(result.version).toBe(1);
    expect(result.versionHex).toBe("00000001");
    expect(result.merkleroot).toBe(
      "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
    );
    expect(result.time).toBe(1231006505);
    expect(result.mediantime).toBe(1231006505);
    expect(result.nonce).toBe(2083236893);
    expect(result.bits).toBe("1d00ffff");
    expect(result.difficulty).toBe(1);
    expect(result.chainwork).toBe(
      "0000000000000000000000000000000000000000000000000000000100010001"
    );
    expect(result.nTx).toBe(1);
    expect(result.nextblockhash).toBe(
      "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048"
    );
  });

  it("should get block hash", async () => {
    const mockBlockHash =
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ result: mockBlockHash }),
    } as any);

    const result = await provider.getBlockHash(0);
    expect(result).toBe(mockBlockHash);
  });

  it("should get tx out proof", async () => {
    const mockProof =
      "02000000b64ea7b7615283a01d9d6019f5bfbd694d2a534ca87a7d07aa0100000000000045ff55adc8d6bc183e9abfa7bdfef3e7b942d786dcd116e776ead8238451a238ac204f516e81021ad0f8cd016400000008e5af83540c63d08a8f3ea70dc9b0aff130e5f69b0cf8d3a96f512fdaa501360feface67ef372ccc368143e9ea96c5939d1be2cb1eddd710808a8d36e311f3b26ee09b877d17d3628466e765dd123411dd12e8bdde192236a1dbd85be6ddd7df83ed791db9b7c5e2f990e2cd9d2a921c72b327a6097c05e73d38dca50795f1ce39a9f995341847bc1bab40c70115f3addf7d8bcc2372922ccf8e404e63db683800cb80f65a64ff99d3519b116c79bfaf3ee68c723344660f5177a92ebff184da4839c7d6351941e1facc6d64a327e4445ac8d5d0e07d1977ecc587623fcabbbd136857a60c637fb60938cbc6885b33bbd16568d8997ca3b38ab4e04bd7b54620b02ff00";
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ result: mockProof }),
    } as any);

    const txids = [
      "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5",
    ];
    const result = await provider.getTxOutProof(txids);
    expect(result).toBe(mockProof);
  });

  it("should get raw transaction", async () => {
    const mockRawTx = {
      txid: "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5",
      hash: "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5",
      version: 1,
      size: 124,
      vsize: 124,
      weight: 496,
      locktime: 0,
      vin: [
        {
          coinbase:
            "03fc7903062f503253482f04ac204f510858029a11000003550d3363646164312f736c7573682f",
          sequence: 0,
        },
      ],
      vout: [
        {
          value: 25.0626,
          n: 0,
          scriptPubKey: {
            asm: "OP_DUP OP_HASH160 e285a29e0704004d4e95dbb7c57a98563d9fb2eb OP_EQUALVERIFY OP_CHECKSIG",
            desc: "addr(1MejoVXRvsmwyDpTpkw3VJ82NsjjT8SyEw)#5zfhcaw2",
            hex: "76a914e285a29e0704004d4e95dbb7c57a98563d9fb2eb88ac",
            address: "1MejoVXRvsmwyDpTpkw3VJ82NsjjT8SyEw",
            type: "pubkeyhash",
          },
        },
      ],
      hex: "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2703fc7903062f503253482f04ac204f510858029a11000003550d3363646164312f736c7573682f0000000001207e6295000000001976a914e285a29e0704004d4e95dbb7c57a98563d9fb2eb88ac00000000",
      blockhash:
        "00000000000000d0dfd4c9d588d325dce4f32c1b31b7c0064cba7025a9b9adcc",
      confirmations: 639041,
      time: 1364140204,
      blocktime: 1364140204,
    };
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ result: mockRawTx }),
    } as any);

    const txid =
      "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5";
    const result = await provider.getRawTransaction(txid);
    expect(result).toEqual(mockRawTx);
    expect(result.txid).toBe(txid);
    expect(result.vin[0].coinbase).toBe(
      "03fc7903062f503253482f04ac204f510858029a11000003550d3363646164312f736c7573682f"
    );
    expect(result.vout[0].value).toBe(25.0626);
    expect(result.vout[0].scriptPubKey.address).toBe(
      "1MejoVXRvsmwyDpTpkw3VJ82NsjjT8SyEw"
    );
  });

  it("should get block", async () => {
    const mockBlockHash =
      "00000000000000d0dfd4c9d588d325dce4f32c1b31b7c0064cba7025a9b9adcc";
    const mockBlockData = {
      hash: "00000000000000d0dfd4c9d588d325dce4f32c1b31b7c0064cba7025a9b9adcc",
      confirmations: 639148,
      height: 227836,
      version: 2,
      versionHex: "00000002",
      merkleroot:
        "38a2518423d8ea76e716d1dc86d742b9e7f3febda7bf9a3e18bcd6c8ad55ff45",
      time: 1364140204,
      mediantime: 1364138296,
      nonce: 30275792,
      bits: "1a02816e",
      difficulty: 6695826.282596251,
      chainwork:
        "000000000000000000000000000000000000000000000030f64e660f4b573ba8",
      nTx: 100,
      previousblockhash:
        "00000000000001aa077d7aa84c532a4d69bdbff519609d1da0835261b7a74eb6",
      nextblockhash:
        "000000000000002579bc6db5a836a81d3a217b549721a0ef1facdf8f069ce0cb",
      strippedsize: 39628,
      size: 39628,
      weight: 158512,
      tx: [
        "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5",
        // ... other transaction IDs ...
        "13aa4bb9a1664275a481766b7fb9ea07c7e60b1a8adb5bdff08db8eccc614e53",
      ],
    };

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ result: mockBlockData }),
    } as any);

    const result = await provider.getBlock(mockBlockHash);
    expect(result).toEqual(mockBlockData);
    expect(result.hash).toBe(mockBlockHash);
    expect(result.height).toBe(227836);
    expect(result.version).toBe(2);
    expect(result.merkleroot).toBe(
      "38a2518423d8ea76e716d1dc86d742b9e7f3febda7bf9a3e18bcd6c8ad55ff45"
    );
    expect(result.time).toBe(1364140204);
    expect(result.nonce).toBe(30275792);
    expect(result.bits).toBe("1a02816e");
    expect(result.difficulty).toBe(6695826.282596251);
    expect(result.nTx).toBe(100);
    expect(result.tx).toHaveLength(2);
    expect(result.tx[0]).toBe(
      "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5"
    );
    expect(result.tx[1]).toBe(
      "13aa4bb9a1664275a481766b7fb9ea07c7e60b1a8adb5bdff08db8eccc614e53"
    );
  });
});
