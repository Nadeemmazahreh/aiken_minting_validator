import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { useState } from "react";
import { bytesToHex } from "ethereum-cryptography/utils";
import { sha256 } from '@noble/hashes/sha2'; 


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


type NoiseData = {
  timestamp: string;
  noiseLevel: number;
  location: string;
  hash?: string;
};

const Script = {

  Noise_reduction_validator: applyDoubleCborEncoding(
    "588a0101002229800aba2aba1aab9faab9eaab9dab9a9bae003488888896600264653001300800198041804800cc0200092225980099b8748000c020dd500144cc896600266e1cdc68042408114a314a08048dd7180598049baa0025980099b8748000c020dd5001c56600260126ea800e29345900a4590074590070c020004c010dd5004452689b2b200401"
  ),

};

export default function Dashboard(props: {
  lucid: LucidEvolution;
  address: Address;
  setActionResult: (result: string) => void;
  onError: (error: any) => void;
}) {
  const { lucid, address, setActionResult, onError } = props;
  const [newNoiseData, setNoiseData] = useState<NoiseData | null>(null);

  async function submitTx(tx: TxSignBuilder) {
    const txSigned = await tx.sign.withWallet().complete();
    const txHash = await txSigned.submit();

    return txHash;
  }
  
  function generateNoiseData() {
    // Generate noise data
    const newNoiseData: NoiseData = {
      timestamp: new Date().toISOString(),
      noiseLevel: Math.floor(Math.random() * 100) + 30,
      location: `${(Math.random() * 180 - 90).toFixed(4)}, ${(Math.random() * 360 - 180).toFixed(4)}`
    };

    // Create a string representation of the data to hash
    const dataString = JSON.stringify({
      timestamp: newNoiseData.timestamp,
      noiseLevel: newNoiseData.noiseLevel,
      location: newNoiseData.location
    });

    // Generate SHA-256 hash
    const hash = bytesToHex(sha256(new TextEncoder().encode(dataString)));
    
    // Add hash to noise data
    newNoiseData.hash = hash;
    
    setNoiseData(newNoiseData);
    console.log(newNoiseData);
  }

  type Action = () => Promise<void>;
  type ActionGroup = Record<string, Action>;

  const actions: Record<string, ActionGroup> = {
    NoiseReduction: {
      mint: async () => {
        try {
          const noisedatahash = newNoiseData!.hash;
          console.log({noisedatahash})
          const mintingScript = applyParamsToScript(Script.Noise_reduction_validator, [noisedatahash!]);
          const mintingValidator: MintingPolicy = { type: "PlutusV3", script: mintingScript};

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = "Noise Reduction Token";
          const redeemer = Data.void();

          const mintedAssets = { [`${policyID}${fromText(assetName)}`]: 10n };
          //const redeemer = Data.to(new Constr(0, [fromText("Hello, World!"), 42n]));

          const tx = await lucid
            .newTx()
            .collectFrom(await lucid.wallet().getUtxos()) // or something sounding like that
            .mintAssets(mintedAssets, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .attachMetadata(
              721,
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://bit.ly/3Xjas9h",
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
    },
    
  };

  return (
    <div className="flex flex-col gap-2">
      <span>{address}</span>
      <span>"Mint your first Noise Reduction Tokens"</span>

      {/* Noise Data Generation Section */}
      <div className="bg-black p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-3">Noise Data Generator</h3>
        <Button
          className="bg-gradient-to-tr from-blue-500 to-purple-500 text-white shadow-lg capitalize mb-3"
          radius="full"
          onPress={generateNoiseData}
        >
          Generate Random Noise Data
        </Button>
        
        {newNoiseData && (
          <div className="bg-black-50 p-3 rounded-md">
            <p>Timestamp: {newNoiseData.timestamp}</p>
            <p>Noise Level: {newNoiseData.noiseLevel} dB</p>
            <p>Location: {newNoiseData.location}</p>
            <p className="break-all">Data Hash: {newNoiseData.hash}</p>
          </div>
        )}
      </div>


      <Accordion variant="splitted">

        {/*Minting NRT*/}
        <AccordionItem key="2" aria-label="Accordion 2" title="Mint NRT">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.NoiseReduction.mint}
            >
              Mint
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.NoiseReduction.spend}
            >
              Sell
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
