import { config } from "dotenv";
import { UtuProvider } from "@/UtuProvider";
import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";

config();

describe("UtuProvider", () => {
  let utuProvider: UtuProvider;
  let bitcoinProvider: BitcoinRpcProvider;

  beforeAll(() => {
    bitcoinProvider = new BitcoinRpcProvider({
      url: process.env.BITCOIN_RPC_URL || "",
      username: process.env.BITCOIN_RPC_USERNAME || "",
      password: process.env.BITCOIN_RPC_PASSWORD || "",
    });
    utuProvider = new UtuProvider(bitcoinProvider);
  });

  it("should get block height proof for block 800000", async () => {
    const height = 800000;
    const proof = await utuProvider.getBlockHeightProof(height);

    expect(proof.blockHeader).toBeDefined();
    expect(proof.rawCoinbaseTx).toBe(
      "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1a0300350c0120130909092009092009102cda1492140000000000ffffffff02c09911260000000017a914c3f8f898ae5cab4f4c1d597ecb0f3a81a9b146c3870000000000000000266a24aa21a9ed9fbe517a588ccaca585a868f3cf19cb6897e3c26f3351361fb28ac8509e69a7e00000000"
    );
    expect(proof.merkleProof).toEqual([
      "d41f5de48325e79070ccd3a23005f7a3b405f3ce1faa4df09f6d71770497e9d5",
      "e966899d07c2e59033c073820b2f37a11532c1d11184373c4e558d65dac475e0",
      "9f43ef264af1c3a4678d2bf5e60cddbd87b97618b1c80bd2b8a7f9b7f3baca68",
      "4befb427613b7021015030bf67472af6c76f680fadc90bc4c267a9e5804d8948",
      "bf61e05d4675710220c0b8dd669dcac9a1cbc3edb7ac64fc50410da9228333d5",
      "c88892d93e8110f2ec82c41ac30e6a3c8dfe8cf062fefb4b5c09ee754d7ce42c",
      "d4e7722bda133364a17b82990b16c3eb62f4a47d6aaae1c16bb0553806fcd3df",
      "2cbc00355a2debbb8b90dd60ab0dd520699b40e4e4ad90d546864a6e4c5087f8",
      "f2a33c753e9894eea7728206d927e830e946c4e13706275df14362398538e3db",
      "8cc2c566df38c865e0aa6ddfd46d3440e99442a6d04d567323cbe53ffa470234",
      "885cd4d205c35e05f8f738328166b9c65304583704162bcac8944b20690f696f",
      "f6d90508da8aa581f7203f4899498c775ed4878544adcdef5e7b53a4ab691dd7",
    ]);
  });

  it("should get register blocks tx for given block hashes", async () => {
    const blockHash =
      "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee";
    const registerBlocksTx = await utuProvider.getRegisterBlocksTx([blockHash]);

    expect(registerBlocksTx).toBeDefined();
    expect(registerBlocksTx.contractAddress).toBe(
      "0x034838129702a2f071cd8cf9277d2f2f2dac3284c2217d9e2e076624fb5afc2f"
    ); // todo: eplace with actual contract address
    expect(registerBlocksTx.selector).toBe(
      "0x00afd92eeac2cdc892d6323dd051eaf871b8d21df8933ce111c596038eb3afd3"
    );
    expect(registerBlocksTx.calldata).toEqual([
      "0x1",
      "0x01000000",
      "0x55bd840a",
      "0x78798ad0",
      "0xda853f68",
      "0x974f3d18",
      "0x3e2bd1db",
      "0x6a842c1f",
      "0xeecf222a",
      "0x00000000",
      "0xff104ccb",
      "0x05421ab9",
      "0x3e63f8c3",
      "0xce5c2c2e",
      "0x9dbb37de",
      "0x2764b3a3",
      "0x175c8166",
      "0x562cac7d",
      "0x51b96a49",
      "0x1d00ffff",
      "0x283e9e70",
    ]);
  });

  it("should get canonical chain update tx for a given block slice", async () => {
    const updateCanonicalChainTx = await utuProvider.getCanonicalChainUpdateTx(
      865_698,
      865_699,
      true
    );

    // console.log(updateCanonicalChainTx.calldata.join(", "));
  });
});
