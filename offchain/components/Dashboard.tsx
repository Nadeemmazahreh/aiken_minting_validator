import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";

import {
  Address,
  applyDoubleCborEncoding,
  applyParamsToScript,
  Constr,
  Data,
  fromText,
  LucidEvolution,
  MintingPolicy,
  mintingPolicyToId,
  TxSignBuilder,
} from "@lucid-evolution/lucid";

const Script = {
  MintAlwaysTrue: applyDoubleCborEncoding(
    "58b801010032323232323232323225333003323232323253330083370e900018051baa0011325333333010003153330093370e900018059baa0031533300d300c37540062944020020020020020020dd7180698059baa00116300c300d003300b002300a002300a001300637540022930a998022491856616c696461746f722072657475726e65642066616c73650013656153300249010f5f72656465656d65723a20566f696400165734ae7155ceaab9e5573eae855d12ba41"
  ),

  // MintCheckRedeemer: applyDoubleCborEncoding(
  //   "58c4010100323232323232323225333003323232323253330083370e900018051baa001132533333300f003008008008153330093370e6eb400d205414a22a660149211672656465656d6572203d3d203432203f2046616c73650014a00106eb8c030c02cdd50008b1805980600198050011804801180480098031baa001149854cc0112411856616c696461746f722072657475726e65642066616c73650013656153300249010d72656465656d65723a20496e7400165734ae7155ceaab9e5742ae895d201"
  // ),

  MintCheckRedeemer2: applyDoubleCborEncoding(
    "59018001010032323232323232323225333003323232323253330083370e900018051baa0011325333333010003153330093370e900018059baa003132533300e001009132533333301200100a00a00a00a13232533301100100c132533333301500100d00d00d1325333013301500313232533301153330113371e6eb8c05800922010d48656c6c6f2c20576f726c64210014a22a660249211e6b6579203d3d202248656c6c6f2c20576f726c642122203f2046616c73650014a02a66602266e1c005205414a22a660249211376616c7565203d3d203432203f2046616c73650014a02940dd6980a980b00098091baa00900e375a00201a602400260240066eb8004c03c004c030dd50018040040040040041bae300d300b37540022c6018601a006601600460140046014002600c6ea800452615330044911856616c696461746f722072657475726e65642066616c73650013656153300249011472656465656d65723a204d7952656465656d657200165734ae7155ceaab9e5573eae855d12ba41"
  ),

  MintNFT: applyDoubleCborEncoding(
    "5903a001010032323232323232323232322253330053232323232533300a3370e900018061baa00113253333330130031533300b3370e900018069baa0031533300f300e37540062646464a66601c66e1d2002001153300f49010a4973204d696e74696e67001533300e323300100100322533301400114a026644a66602466ebcc060c054dd50010078a511330040040013016001301700114a22a6601e92012e636f6e73756d655f7574786f28696e707574732c206f75747075745f7265666572656e636529203f2046616c73650014a02a66601c66e1d2001001153300f4910a4973204275726e696e670014a22a6601e9210b496e76616c6964205174790014a064a66602400201a264a666026602c00426eb4c048004038c050004c94ccc038cdc3a400460206ea800452f5bded8c026eacc050c044dd500099198008009bab3014301530153015301500322533301300114c103d87a80001323332225333013337220120062a66602666e3c02400c4cdd2a4000660306e980092f5c02980103d87a8000133006006001375c60240026eacc04c004c05c008c054004dd6180900098071baa004009009009009009009375c6020601a6ea800458c03cc04000cc038008c034008c034004c020dd50008a4c2a6600c9211856616c696461746f722072657475726e65642066616c73650013656153300349010f5f72656465656d65723a20566f696400161533002491ff657870656374205b50616972285f2c20717479295d203d0a202020202f2f2020202020e2989df09f8fbb506169723a0a202020202f2f20202020202d2068747470733a2f2f61696b656e2d6c616e672e6f72672f6c616e67756167652d746f75722f7072696d69746976652d747970657323706169720a202020202f2f20202020202d2068747470733a2f2f6769746875622e636f6d2f61696b656e2d6c616e672f7072656c7564652f626c6f622f313930363530363834653665626664303233366264383936623130376435373535333863366332322f6c69622f61696b656e2e616b234c38362d4c38380a202020202f2f20202020202d2068747470737b3a2f2f61696b656e2d6c616e672e6769746875622e696f2f7072656c7564652f61696b656e2f6275696c74696e2e68746d6c23506169720a202020206d696e740a2020202020207c3e206173736574732e746f6b656e7328706f6c6963795f6964290a2020202020207c3e20646963742e746f5f7061697273282900165734ae7155ceaab9e5573eae815d0aba257481"
  ),
};

export default function Dashboard(props: {
  lucid: LucidEvolution;
  address: Address;
  setActionResult: (result: string) => void;
  onError: (error: any) => void;
}) {
  const { lucid, address, setActionResult, onError } = props;

  async function submitTx(tx: TxSignBuilder) {
    const txSigned = await tx.sign.withWallet().complete();
    const txHash = await txSigned.submit();

    return txHash;
  }

  type Action = () => Promise<void>;
  type ActionGroup = Record<string, Action>;

  const actions: Record<string, ActionGroup> = {
    AlwaysTrue: {
      mint: async () => {
        try {
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintAlwaysTrue };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "Always True Token";

          const mintedAssets = { [`${policyID}${fromText(assetName)}`]: 1_000n };
          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .mintAssets(mintedAssets, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .attachMetadata(
              721,
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/1",
                  },
                },
              }
            )
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintAlwaysTrue };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "Always True Token";
          const assetUnit = `${policyID}${fromText(assetName)}`;
          const burnedAssets = { [assetUnit]: -1_000n };
          const redeemer = Data.void();

          const utxos = await lucid.utxosAtWithUnit(address, assetUnit);

          const tx = await lucid.newTx().collectFrom(utxos).mintAssets(burnedAssets, redeemer).attach.MintingPolicy(mintingValidator).complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },

    // CheckRedeemer: {
    //   mint: async () => {
    //     try {
    //       const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintCheckRedeemer };

    //       const policyID = mintingPolicyToId(mintingValidator);
    //       const assetName = "Check Redeemer Token";

    //       const mintedAssets = { [`${policyID}${fromText(assetName)}`]: 200n };
    //       const redeemer = Data.to(42n);

    //       const tx = await lucid
    //         .newTx()
    //         .mintAssets(mintedAssets, redeemer)
    //         .attach.MintingPolicy(mintingValidator)
    //         .attachMetadata(
    //           721,
    //           // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
    //           {
    //             [policyID]: {
    //               [assetName]: {
    //                 name: assetName,
    //                 image: "https://avatars.githubusercontent.com/u/2",
    //               },
    //             },
    //           }
    //         )
    //         .complete();

    //       submitTx(tx).then(setActionResult).catch(onError);
    //     } catch (error) {
    //       onError(error);
    //     }
    //   },

    //   burn: async () => {
    //     try {
    //       const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintCheckRedeemer };

    //       const policyID = mintingPolicyToId(mintingValidator);
    //       const assetName = "Check Redeemer Token";
    //       const assetUnit = `${policyID}${fromText(assetName)}`;
    //       const burnedAssets = { [assetUnit]: -200n };
    //       const redeemer = Data.to(42n);

    //       const utxos = await lucid.utxosAtWithUnit(address, assetUnit);

    //       const tx = await lucid.newTx().collectFrom(utxos).mintAssets(burnedAssets, redeemer).attach.MintingPolicy(mintingValidator).complete();

    //       submitTx(tx).then(setActionResult).catch(onError);
    //     } catch (error) {
    //       onError(error);
    //     }
    //   },
    // },

    CheckRedeemer2: {
      mint: async () => {
        try {
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintCheckRedeemer2 };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "Check Redeemer2 Token";

          const mintedAssets = { [`${policyID}${fromText(assetName)}`]: 30n };
          const redeemer = Data.to(new Constr(0, [fromText("Hello, World!"), 42n]));

          const tx = await lucid
            .newTx()
            .mintAssets(mintedAssets, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .attachMetadata(
              721,
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/3",
                  },
                },
              }
            )
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: Script.MintCheckRedeemer2 };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "Check Redeemer2 Token";
          const assetUnit = `${policyID}${fromText(assetName)}`;
          const burnedAssets = { [assetUnit]: -30n };
          const redeemer = Data.to(new Constr(0, [fromText("Hello, World!"), 42n]));

          const utxos = await lucid.utxosAtWithUnit(address, assetUnit);

          const tx = await lucid.newTx().collectFrom(utxos).mintAssets(burnedAssets, redeemer).attach.MintingPolicy(mintingValidator).complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },

    NFT: {
      mint: async () => {
        try {
          const utxos = await lucid.wallet().getUtxos();
          const utxo = utxos[0];

          // https://aiken-lang.github.io/stdlib/cardano/transaction.html#OutputReference
          const txHash = String(utxo.txHash);
          const txIndex = BigInt(utxo.outputIndex);
          const outputReference = new Constr(0, [txHash, txIndex]);

          const mintingScript = applyParamsToScript(Script.MintNFT, [outputReference]);
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: mintingScript };

          localStorage.setItem("nftMintingScript", mintingValidator.script);
          console.log({
            nftMintingScript: localStorage.getItem("nftMintingScript"),
          });

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "NFT";

          const mintedNFT = { [`${policyID}${fromText(assetName)}`]: 1n };
          const redeemer = Data.void();

          const tx = await lucid
            .newTx()
            .collectFrom([utxo])
            .mintAssets(mintedNFT, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .attachMetadata(
              721,
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/4",
                  },
                },
              }
            )
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const nftMintingScript = localStorage.getItem("nftMintingScript");
          if (!nftMintingScript) throw "You must mint an NFT First!";

          const mintingValidator: MintingPolicy = {
            type: "PlutusV3",
            script: nftMintingScript,
          };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "NFT";
          const assetUnit = `${policyID}${fromText(assetName)}`;
          const burnedNFT = { [assetUnit]: -1n };
          const redeemer = Data.void();

          const utxos = await lucid.utxosAtWithUnit(address, assetUnit);

          const tx = await lucid.newTx().collectFrom(utxos).mintAssets(burnedNFT, redeemer).attach.MintingPolicy(mintingValidator).complete();

          submitTx(tx)
            .then((result) => {
              setActionResult(result);
              localStorage.clear();
            })
            .catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <span>{address}</span>

      <Accordion variant="splitted">
        {/* Always True */}
        <AccordionItem key="1" aria-label="Accordion 1" title="Always True">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onPress={actions.AlwaysTrue.mint}>
              Mint
            </Button>
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onPress={actions.AlwaysTrue.burn}>
              Burn
            </Button>
          </div>
        </AccordionItem>

        {/* Check Redeemer */}
        {/* <AccordionItem key="2" aria-label="Accordion 2" title="Check Redeemer">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.CheckRedeemer.mint}
            >
              Mint
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.CheckRedeemer.burn}
            >
              Burn
            </Button>
          </div>
        </AccordionItem> */}

        {/* Check Redeemer2 */}
        <AccordionItem key="3" aria-label="Accordion 3" title="Check Redeemer2">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.CheckRedeemer2.mint}
            >
              Mint
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.CheckRedeemer2.burn}
            >
              Burn
            </Button>
          </div>
        </AccordionItem>

        {/* NFT */}
        <AccordionItem key="4" aria-label="Accordion 4" title="NFT">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onPress={actions.NFT.mint}>
              Mint
            </Button>
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onPress={actions.NFT.burn}>
              Burn
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
