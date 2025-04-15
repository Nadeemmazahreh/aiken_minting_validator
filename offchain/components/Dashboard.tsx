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
  UTxO,
} from "@lucid-evolution/lucid";

type NoiseData = {
  timestamp: string;
  noiseLevel: number;
  location: string;
  hash?: string;
  dataQuality: number;
};

type SelectedToken = {
  utxo: UTxO;
  unit: string;
  policyId: string;
  assetName: string;
  readableName: string;
  quantity: bigint;
};

const Script = {
  Noise_reduction_validator: applyDoubleCborEncoding(
    "590549010100229800aba2aba1aba0aab9faab9eaab9dab9a9bae002488888889660033001300437540132300830093009001918041804980498049804800cdc3a40052300830090019b87480012222223232980098059baa001911192cc004c024c03cdd5000c5200089bad3013301037540028070c9660026012601e6ea80062980103d87a8000899198008009bab30143011375400444b30010018a6103d87a8000899192cc004cdc8803000c56600266e3c018006266e9520003301630140024bd7045300103d87a80004049133004004301800340486eb8c048004c054005013201c32330010010042259800800c5300103d87a8000899192cc004cdc8803000c56600266e3c018006266e9520003301530130024bd7045300103d87a80004045133004004301700340446eb8c044004c0500050124c03c022601e00491112cc004c01c0122b30013007300f3754003132323298009bae30160019bae30160039bad3016002488966002603400915980099b87371a6eb8c064c058dd5003a41000315980099b8948190dd69807180b1baa007899b8798009bab301030163754011375c6032602c6ea802e6eb8c044c058dd5003a01232598009800a40c91480022b30013001481e22900a45660026002904600c5201e8acc004c00520a0018a40511598009800a41680314811a2b30013001482f8062902d45660026002906300c520788a41900280a9015202a405480a9015202a37106eb4c038c058dd5003c52820288a50405116405c3016001301500130103754003164039159800980480244c8c8cc8966002601660266ea801626464646644b3001301d00389919912cc004c04c00a26464b30013022002801c5901f1bae3020001301c3754007159800980a801456600260386ea800e00316407516406880d0c064dd50008992cc004c048006264b300130200018992cc004c050c070dd5000c4c8c8cc8966002604a00700f8b2044375a60440026eb8c088008c088004c074dd5000c5901b180f800c5901d180d9baa0048acc004c0500062b3001301b37540090098b20388b2032406460326ea800cc0700122c80d0c068004dd6980d001980d000980c800980a1baa0058b2024159800980498089baa0018cc004c054c048dd5000cdd6980a98091baa0039119198008009bac3018301930193019301930193019301930193015375400644b30010018a508acc004cdc79bae30190010038a51899801001180d000a028405d2232330010010032259800800c52845660026006603200314a3133002002301a001405080ba4602c602e602e602e00291111192cc004c03c016264b3001301030183754003159800998028059bae301c30193754003159800998021bac301c301937540164600730013756602460346ea8c048c068dd5000cdd7180a980d1baa0089bae3004301a3754010806a2660086eb0c050c064dd500591801cc004dd59809180d1baa0019bae3015301a3754011375c600860346ea802100d4528202e8a50405d16405c602060306ea80262b300130110058992cc004c040c060dd5000c4c96600266ebcc96600266e4000400a2980103d87980008acc004cdc78008014530103d87a80008a6103d87b8000406480c8dd7180e980d1baa0084c0103d87a80008acc004cc01803000626600a6eb0c054c068dd500612cc004c01260026eacc04cc06cdd5000cdd7180b180d9baa0099bae3005301b3754012807226600c6eb0c078c06cdd5006919804007001c52820328a50406114a080c0dd7180e180c9baa0018b202e30103018375401316405880b0dc49bad30113017375400a8b20203015002301430150013010375400b1640388070601c601e002601c00c8a4d13656400801"
  ),
};

// Token name is fixed as "NRT"
const TOKEN_NAME = "NRT";

// Calculate token quantity based on data quality
function calculateTokenQuantity(dataQuality: number): number {
  if (dataQuality < 50) {
    return 0;
  } else if (dataQuality < 60) {
    return 10;
  } else if (dataQuality < 70) {
    return 15;
  } else if (dataQuality < 80) {
    return 20;
  } else if (dataQuality < 90) {
    return 35;
  } else if (dataQuality < 95) {
    return 45;
  } else if (dataQuality < 99) {
    return 60;
  } else {
    return 100;
  }
}

// Get quality tier description based on data quality
function getQualityTier(dataQuality: number): string {
  if (dataQuality < 50) {
    return "Insufficient";
  } else if (dataQuality < 60) {
    return "Minimal";
  } else if (dataQuality < 70) {
    return "Low";
  } else if (dataQuality < 80) {
    return "Basic";
  } else if (dataQuality < 90) {
    return "Good";
  } else if (dataQuality < 95) {
    return "Very Good";
  } else if (dataQuality < 99) {
    return "Excellent";
  } else {
    return "Perfect";
  }
}

function formatPolicyId(policyId: string): string {
  return `${policyId.slice(0, 8)}...${policyId.slice(-8)}`;
}

export default function Dashboard(props: {
  lucid: LucidEvolution;
  address: Address;
  setActionResult: (result: string) => void;
  onError: (error: any) => void;
}) {
  const { lucid, address, setActionResult, onError } = props;
  const [newNoiseData, setNoiseData] = useState<NoiseData | null>(null);
  const [tokenQuantity, setTokenQuantity] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(5);
  const [selectedUtxo, setSelectedUtxo] = useState<UTxO | null>(null);
  const [utxos, setUtxos] = useState<UTxO[]>([]);
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);
  const [tokens, setTokens] = useState<SelectedToken[]>([]);

  // Fetch UTXOs when component loads
  async function loadUtxos() {
    try {
      const walletUtxos = await lucid.utxosAt(address);
      setUtxos(walletUtxos);
      
      // Process tokens from UTXOs
      const processedTokens: SelectedToken[] = [];
      
      walletUtxos.forEach(utxo => {
        Object.entries(utxo.assets).forEach(([unit, quantity]) => {
          // Skip lovelace entries
          if (unit === "lovelace") return;
          
          const policyId = unit.slice(0, 56);
          const assetName = unit.slice(56);
          
          // Try to decode the asset name to a readable string
          let readableName;
          try {
            // Try to decode hex to UTF-8
            const bytes = Buffer.from(assetName, "hex");
            readableName = new TextDecoder().decode(bytes);
          } catch {
            // If decoding fails, use the hex representation
            readableName = assetName === "" ? "Default Asset" : assetName;
          }
          
          processedTokens.push({
            utxo,
            unit,
            policyId,
            assetName,
            readableName,
            quantity
          });
        });
      });
      
      setTokens(processedTokens);
      
      // Reset selections
      setSelectedUtxo(null);
      setSelectedToken(null);
    } catch (error) {
      onError(error);
    }
  }

  async function submitTx(tx: TxSignBuilder) {
    const txSigned = await tx.sign.withWallet().complete();
    const txHash = await txSigned.submit();
    return txHash;
  }
  
  function generateNoiseData() {
    
    // Generate noise data
    const newNoiseData: NoiseData = {
      timestamp: new Date().toISOString(),
      noiseLevel: Math.floor(Math.random() * 56) + 45,
      location: `${(Math.random() * 180 - 90).toFixed(4)}, ${(Math.random() * 360 - 180).toFixed(4)}`,
      dataQuality: Math.floor(Math.random() * 56) + 45, 
    };

    // Create a string representation of the data to hash
    const dataString = JSON.stringify({
      timestamp: newNoiseData.timestamp,
      noiseLevel: newNoiseData.noiseLevel,
      location: newNoiseData.location,
      dataQuality: newNoiseData.dataQuality
    });

    // Generate SHA-256 hash
    const hash = bytesToHex(sha256(new TextEncoder().encode(dataString)));
    
    // Add hash to noise data
    newNoiseData.hash = hash;
    
    // Calculate token quantity based on quality
    const quantity = calculateTokenQuantity(newNoiseData.dataQuality);
    setTokenQuantity(quantity);
    
    setNoiseData(newNoiseData);
    console.log(newNoiseData, "Token quantity:", quantity);
  }

  type Action = (...args: any[]) => Promise<void>;
  type ActionGroup = Record<string, Action>;

  const actions: Record<string, ActionGroup> = {
    NoiseReduction: {
      mint: async () => {
        try {
          if (!newNoiseData || !newNoiseData.hash) {
            onError("Please generate noise data first");
            return;
          }

          if (newNoiseData.dataQuality < 50) {
            onError("Data quality too low (below 50). Cannot mint tokens.");
            return;
          }
          const noisedatahash = newNoiseData!.hash;
          // Create the minting script with the hash parameter
          const mintingScript = applyParamsToScript(Script.Noise_reduction_validator, [noisedatahash!]);
          
          const mintingValidator: MintingPolicy = { 
            type: "PlutusV3", 
            script: mintingScript
          };

          const policyID = mintingPolicyToId(mintingValidator);
          const assetName = TOKEN_NAME;
          // Convert token name to hex once
          const assetNameHex = fromText(TOKEN_NAME); 

          // Calculate quantity based on data quality
          const quantity: bigint = BigInt(calculateTokenQuantity(newNoiseData.dataQuality));
          
          // Create MintRedeemer with hash, data quality, and token name
          const redeemer = Data.to(
            new Constr(0, [
              fromText(newNoiseData.hash),           // ipfs_hash: ByteArray
              BigInt(newNoiseData.dataQuality),      // data_quality: Int
              fromText(TOKEN_NAME),               // token_name: ByteArray
            ])
          );
          
          
          // According to the docs, this is the correct format for mintAssets
          const mintedAssets = { [`${policyID}${fromText(assetName)}`]: quantity };
          

          // Get wallet UTXOs for spending
          const walletUtxos = await lucid.wallet().getUtxos();
          

          const tx = await lucid
            .newTx()
            .collectFrom(walletUtxos) // Collect from available wallet UTXOs
            .mintAssets(mintedAssets, redeemer)
            .attach.MintingPolicy(mintingValidator)
            .attachMetadata(
              721,
              {
                [policyID]: {
                  [assetNameHex]: {
                    name: assetName,
                    image: ["ipfs://", "QmPtJcMNf4e99rx1YPUfBr4h2asBMRWG4eFzNBH9Ha8hwb"]
                  },
                },
              }
            )
            .complete();
          
          console.log("Here")
          const unsignedTx = tx.toString();
          console.log(unsignedTx);
          
          submitTx(tx)
            .then((txHash) => {
              setActionResult(`Minted ${quantity} ${TOKEN_NAME} tokens based on data quality ${newNoiseData!.dataQuality}. TX: ${txHash}`);
              loadUtxos(); // Refresh UTXOs after minting
            })
            .catch((error) => {
              console.error("Transaction submission error:", error);
              onError(`Transaction failed: ${error.message || error}`);
            });
        } catch (error) {
          console.error("Minting error:", error);
        }
      },
      
      spend: async (action: number) => {
        try {
          if (!selectedToken) {
            onError("Please select a token to trade");
            return;
          }
          
          // Use the selected token information
          const { utxo, unit: assetUnit, policyId, assetName, readableName, quantity } = selectedToken;
          
          // Destination address depends on the action
          const destinationAddress = action === 0 
            ? address  // For sell action, use the script address (for now we're using the same wallet address as placeholder)
            : address; // For cancel and buy, return to user's wallet
          
          // Define utxo_ref based on action
          const utxoRef = action === 2
            ? new Constr(0, [utxo.txHash, BigInt(utxo.outputIndex)]) // For buy, include UTxO reference
            : new Constr(1, []); // For sell and cancel, no UTxO reference needed
          
          // Create redeemer with appropriate action
          const redeemer = Data.to(
            new Constr(0, [
              BigInt(action), // 0 = sell, 1 = cancel, 2 = buy
              new Constr(0, [address]), // owner/buyer address
              utxoRef // UTxO reference
            ])
          );
          console.log("Here")
          // Create the transaction
          const tx = await lucid
            .newTx()
            .collectFrom([utxo], redeemer)
            .pay.ToAddress(destinationAddress, { 
              [assetUnit]: quantity,
              lovelace: 2000000n 
            })
            .complete();
          
          // Submit transaction and handle response
          submitTx(tx).then((txHash) => {
            const actionMessages = {
              0: `Listed ${Number(quantity)} ${readableName} tokens for sale at ${sellPrice} ADA`,
              1: `Canceled listing for ${readableName} tokens`,
              2: `Purchased ${readableName} tokens`
            };
            setActionResult(`${actionMessages[action as 0 | 1 | 2]}. TX: ${txHash}`);
            loadUtxos();
          }).catch((error) => {
            onError(`Transaction failed: ${error.message || error}`);
          });
        } catch (error) {
        }
      }
    },
  };

  // Function to get color based on data quality
  function getQualityColor(quality: number): string {
    if (quality < 50) return "text-red-500";
    if (quality < 60) return "text-red-400";
    if (quality < 70) return "text-yellow-500";
    if (quality < 80) return "text-yellow-400";
    if (quality < 90) return "text-blue-500";
    if (quality < 95) return "text-blue-400";
    if (quality < 99) return "text-green-500";
    return "text-green-400";
  }

  return (
    <div className="flex flex-col gap-2">
      <span>{address}</span>
      <span>"Mint and trade Noise Reduction Tokens (NRT) based on data quality"</span>

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
            
            {/* Data Quality Information */}
            <p className={`font-semibold ${getQualityColor(newNoiseData.dataQuality)}`}>
              Data Quality: {newNoiseData.dataQuality} - {getQualityTier(newNoiseData.dataQuality)} Quality
            </p>
            
            <p className="font-semibold mt-2">
              {newNoiseData.dataQuality < 50 ? (
                <span className="text-red-500">Quality too low for minting</span>
              ) : (
                <span className="text-green-500">Eligible to mint {tokenQuantity} {TOKEN_NAME} tokens</span>
              )}
            </p>
          </div>
        )}
      </div>

      <Accordion variant="splitted">
        {/* Minting NRT */}
        <AccordionItem key="1" aria-label="Mint NRT" title="Mint Noise Reduction Tokens">
          <div className="flex flex-col gap-4 mb-4">
            <div className="mb-4 p-3 bg-black-50 rounded">
              <h4 className="font-semibold">Token Quantity Rules:</h4>
              <ul className="list-disc pl-5 mt-2">
                <li>Data quality &lt; 50: Cannot mint (insufficient quality)</li>
                <li>Data quality 50-59: 10 tokens (Minimal Quality)</li>
                <li>Data quality 60-69: 15 tokens (Low Quality)</li>
                <li>Data quality 70-79: 20 tokens (Basic Quality)</li>
                <li>Data quality 80-89: 35 tokens (Good Quality)</li>
                <li>Data quality 90-94: 45 tokens (Very Good Quality)</li>
                <li>Data quality 95-98: 60 tokens (Excellent Quality)</li>
                <li>Data quality 99-100: 100 tokens (Perfect Quality)</li>
              </ul>
            </div>
            
            <Button
              className="bg-gradient-to-tr from-green-500 to-blue-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={actions.NoiseReduction.mint}
              isDisabled={!newNoiseData || newNoiseData.dataQuality < 50}
            >
              Mint {TOKEN_NAME}
            </Button>
          </div>
        </AccordionItem>
        
        {/* Trading NRT */}
        <AccordionItem key="2" aria-label="Trade NRT" title="Trade Noise Reduction Tokens">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-2 items-center">
              <label>Price (ADA):</label>
              <input 
                type="number" 
                value={sellPrice}
                onChange={(e) => setSellPrice(parseFloat(e.target.value))}
                className="max-w-xs p-2 border rounded"
              />
            </div>
            
            <Button
              className="bg-gradient-to-tr from-blue-500 to-pink-500 text-white shadow-lg capitalize"
              radius="full"
              onPress={loadUtxos}
            >
              Load My Tokens
            </Button>

            {tokens.length > 0 ? (
              <div className="mt-2">
                <h4 className="font-semibold mb-2">Select Token to Trade:</h4>
                <div className="max-h-60 overflow-y-auto">
                  {tokens.map((token, index) => (
                    <div 
                      key={index} 
                      className={`p-3 mb-1 border rounded cursor-pointer ${
                        selectedToken?.unit === token.unit && 
                        selectedToken.utxo.txHash === token.utxo.txHash && 
                        selectedToken.utxo.outputIndex === token.utxo.outputIndex 
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 dark:border-blue-400' 
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                      onClick={() => {
                        setSelectedUtxo(token.utxo);
                        setSelectedToken(token);
                      }}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {token.readableName || "Unnamed Token"}
                          </p>
                          <p className="text-xs mt-1">
                            Quantity: <span className="font-semibold">{token.quantity.toString()}</span>
                          </p>
                          <p className="text-xs mt-1">
                            UTXO: <span className="opacity-75">{token.utxo.txHash.slice(0, 10)}...#{token.utxo.outputIndex}</span>
                          </p>
                        </div>
                        <div className="text-xs text-right opacity-75">
                          <p>Policy ID:</p>
                          <p>{formatPolicyId(token.policyId)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-75 mt-2">No tokens found. Click "Load My Tokens" to refresh.</p>
            )}

            {selectedToken && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900 rounded">
                <h4 className="font-semibold">Selected Token:</h4>
                <p>Name: {selectedToken.readableName}</p>
                <p>Quantity: {selectedToken.quantity.toString()}</p>
                <p>Policy ID: {formatPolicyId(selectedToken.policyId)}</p>
              </div>
            )}
            
            {/* <div className="flex flex-wrap gap-2 mt-2">
              <Button
                className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
                radius="full"
                onPress={() => actions.NoiseReduction.spend(0)} // 0 = sell
                isDisabled={!selectedToken}
              >
                {selectedToken 
                  ? `Sell ${selectedToken.quantity.toString()} ${selectedToken.readableName}` 
                  : "Sell Token"}
              </Button>
              
              <Button
                className="bg-gradient-to-tr from-red-500 to-orange-500 text-white shadow-lg capitalize"
                radius="full"
                onPress={() => actions.NoiseReduction.spend(1)} // 1 = cancel
                isDisabled={!selectedToken}
              >
                Cancel Listing
              </Button>
              
              <Button
                className="bg-gradient-to-tr from-green-500 to-teal-500 text-white shadow-lg capitalize"
                radius="full"
                onPress={() => actions.NoiseReduction.spend(2)} // 2 = buy
                isDisabled={!selectedToken}
              >
                Buy Token
              </Button>
            </div> */}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}