import { Accordion, AccordionItem } from "@heroui/accordion";
import { Button } from "@heroui/button";
import { useState, useEffect } from "react";
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'mint' | 'trade'>('mint');

  // Fetch UTXOs when component loads
  useEffect(() => {
    loadUtxos();
  }, []);

  async function loadUtxos() {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

  async function submitTx(tx: TxSignBuilder) {
    setIsLoading(true);
    try {
      const txSigned = await tx.sign.withWallet().complete();
      const txHash = await txSigned.submit();
      return txHash;
    } finally {
      setIsLoading(false);
    }
  }
  
  function generateNoiseData() {
    setIsLoading(true);
    
    setTimeout(() => {
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
      setIsLoading(false);
    }, 500); // Simulate processing time for better UX
  }

  type Action = (...args: any[]) => Promise<void>;
  type ActionGroup = Record<string, Action>;

  const actions: Record<string, ActionGroup> = {
    NoiseReduction: {
      mint: async () => {
        try {
          setIsLoading(true);
          
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
          
          submitTx(tx)
            .then((txHash) => {
              setActionResult(`Minted ${quantity} ${TOKEN_NAME} tokens based on data quality ${newNoiseData!.dataQuality}. TX: ${txHash}`);
              loadUtxos(); // Refresh UTXOs after minting
            })
            .catch((error) => {
              console.error("Transaction submission error:", error);
              onError(`Transaction failed: ${error.message || error}`);
            })
            .finally(() => {
              setIsLoading(false);
            });
        } catch (error) {
          console.error("Minting error:", error);
          setIsLoading(false);
        }
      },
      
      spend: async (action: number) => {
        try {
          setIsLoading(true);
          
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
          submitTx(tx)
            .then((txHash) => {
              const actionMessages = {
                0: `Listed ${Number(quantity)} ${readableName} tokens for sale at ${sellPrice} ADA`,
                1: `Canceled listing for ${readableName} tokens`,
                2: `Purchased ${readableName} tokens`
              };
              setActionResult(`${actionMessages[action as 0 | 1 | 2]}. TX: ${txHash}`);
              loadUtxos();
            })
            .catch((error) => {
              onError(`Transaction failed: ${error.message || error}`);
            })
            .finally(() => {
              setIsLoading(false);
            });
        } catch (error) {
          console.error("Spend error:", error);
          setIsLoading(false);
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

  // Function to get gradient based on data quality
  function getQualityGradient(quality: number): string {
    if (quality < 50) return "from-red-500 to-red-700";
    if (quality < 60) return "from-red-400 to-orange-500";
    if (quality < 70) return "from-orange-400 to-yellow-500";
    if (quality < 80) return "from-yellow-400 to-blue-400";
    if (quality < 90) return "from-blue-400 to-blue-600";
    if (quality < 95) return "from-blue-500 to-indigo-500";
    if (quality < 99) return "from-indigo-500 to-purple-500";
    return "from-purple-500 to-pink-500";
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto bg-slate-50 dark:bg-slate-900 rounded-xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Noise Reduction Token Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Wallet: {address.slice(0, 8)}...{address.slice(-8)}</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'mint' 
              ? 'text-slate-800 dark:text-slate-200 border-b-2 border-blue-500' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('mint')}
        >
          Mint Tokens
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'trade' 
              ? 'text-slate-800 dark:text-slate-200 border-b-2 border-blue-500' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('trade')}
        >
          Manage Tokens
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-slate-200 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-700 dark:text-slate-300">Processing...</p>
          </div>
        </div>
      )}

      {activeTab === 'mint' && (
        <>
          {/* Noise Data Generation Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Noise Data Collection</h3>
            
            <div className="flex flex-col gap-4">
              <p className="text-slate-600 dark:text-slate-400">
                Generate random noise data for minting Noise Reduction Tokens (NRT).
                Higher quality data will earn more tokens.
              </p>
              
              <Button
                className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white shadow-lg capitalize w-full md:w-auto self-start"
                radius="lg"
                onPress={generateNoiseData}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <span>Generate Random Noise Data</span>
                </div>
              </Button>
              
              {newNoiseData && (
                <div className="mt-2 p-5 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Timestamp</p>
                      <p className="font-mono text-slate-700 dark:text-slate-300">{new Date(newNoiseData.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Noise Level</p>
                      <p className="font-mono text-slate-700 dark:text-slate-300">{newNoiseData.noiseLevel} dB</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                      <p className="font-mono text-slate-700 dark:text-slate-300">{newNoiseData.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Data Quality</p>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-full rounded-full bg-gradient-to-r ${getQualityGradient(newNoiseData.dataQuality)}`}>
                          <div 
                            className="h-full bg-white rounded-full" 
                            style={{ width: `${100 - newNoiseData.dataQuality}%`, marginLeft: `${newNoiseData.dataQuality}%` }}
                          ></div>
                        </div>
                        <span className={`font-semibold ${getQualityColor(newNoiseData.dataQuality)}`}>
                          {newNoiseData.dataQuality}%
                        </span>
                      </div>
                      <p className={`text-sm ${getQualityColor(newNoiseData.dataQuality)}`}>
                        {getQualityTier(newNoiseData.dataQuality)} Quality
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Data Hash</p>
                    <p className="font-mono text-xs break-all text-slate-700 dark:text-slate-300">{newNoiseData.hash}</p>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg bg-slate-200 dark:bg-slate-700 flex flex-col md:flex-row justify-between items-center">
                    {newNoiseData.dataQuality < 50 ? (
                      <div className="flex items-center gap-2 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Quality too low for minting</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Eligible to mint {tokenQuantity} NRT tokens</span>
                      </div>
                    )}
                    
                    <Button
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg capitalize mt-3 md:mt-0"
                      radius="lg"
                      onPress={actions.NoiseReduction.mint}
                      disabled={isLoading || !newNoiseData || newNoiseData.dataQuality < 50}
                    >
                      Mint Tokens
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Token Quantity Rules */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg mt-4">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Token Quantity Rules</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 to-red-700 mb-2"></div>
                <p className="font-medium text-red-700 dark:text-red-400">Below 50%</p>
                <p className="text-sm text-red-600 dark:text-red-400">0 tokens</p>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">Insufficient Quality</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30">
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-700 mb-2"></div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">50-79%</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">10-20 tokens</p>
                <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-1">Basic Quality</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700 mb-2"></div>
                <p className="font-medium text-blue-700 dark:text-blue-400">80-94%</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">35-45 tokens</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Good Quality</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-green-500 to-green-700 mb-2"></div>
                <p className="font-medium text-green-700 dark:text-green-400">95-100%</p>
                <p className="text-sm text-green-600 dark:text-green-400">60-100 tokens</p>
                <p className="text-xs text-green-500 dark:text-green-400 mt-1">Excellent Quality</p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'trade' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md transition-all hover:shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Manage Tokens</h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-slate-700 dark:text-slate-300">Price (ADA):</label>
                <input 
                  type="number" 
                  value={sellPrice}
                  min="1"
                  onChange={(e) => setSellPrice(parseFloat(e.target.value))}
                  className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <Button
                className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white shadow-lg capitalize"
                radius="lg"
                onPress={loadUtxos}
                disabled={isLoading}
              >
                {tokens.length > 0 ? 'Refresh Tokens' : 'Load My Tokens'}
              </Button>
            </div>

            {tokens.length > 0 ? (
              <div className="mt-2">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">My Tokens</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                  {tokens.map((token, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg transition-all cursor-pointer ${
                        selectedToken?.unit === token.unit && 
                        selectedToken.utxo.txHash === token.utxo.txHash && 
                        selectedToken.utxo.outputIndex === token.utxo.outputIndex 
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 shadow-md' 
                          : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                      }`}
                      onClick={() => {
                        setSelectedUtxo(token.utxo);
                        setSelectedToken(token);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {token.readableName || "Unnamed Token"}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                              {token.quantity.toString()} tokens
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              UTXO: {token.utxo.txHash.slice(0, 6)}...#{token.utxo.outputIndex}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-right text-slate-500 dark:text-slate-400">
                          <p>Policy ID:</p>
                          <p className="font-mono">{formatPolicyId(token.policyId)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-50 dark:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-slate-500 dark:text-slate-400">No tokens found in your wallet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Mint some tokens first or click "Load My Tokens" to refresh
                </p>
              </div>
            )}

            {selectedToken && (
              <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">Selected Token</h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedToken.readableName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Quantity</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedToken.quantity.toString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Policy ID</p>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200">{selectedToken.policyId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Current Price</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{sellPrice} ADA</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg capitalize"
                    radius="lg"
                    onPress={() => actions.NoiseReduction.spend(0)} // 0 = sell
                    disabled={isLoading}
                  >
                    List for Sale
                  </Button>
                  
                  <Button
                    className="bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg capitalize"
                    radius="lg"
                    onPress={() => actions.NoiseReduction.spend(1)} // 1 = cancel
                    disabled={isLoading}
                  >
                    Cancel Listing
                  </Button>
                  
                  <Button
                    className="bg-gradient-to-r from-green-500 to-teal-600 text-white shadow-lg capitalize"
                    radius="lg"
                    onPress={() => actions.NoiseReduction.spend(2)} // 2 = buy
                    disabled={isLoading}
                  >
                    Buy Token
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Footer with concentric circles design inspired by the image */}
      <div className="relative mt-6 h-32 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full border border-slate-300 dark:border-slate-700"
              style={{
                width: `${(i + 1) * 20}px`,
                height: `${(i + 1) * 20}px`,
                opacity: 1 - i * 0.07,
              }}
            ></div>
          ))}
        </div>
        <div className="relative z-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Noise Reduction Token Platform
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Cardano Blockchain | Powered by Lucid
          </p>
        </div>
      </div>
    </div>
  );
}