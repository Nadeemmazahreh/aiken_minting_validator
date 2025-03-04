use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}
use modules/functions.{consume_utxo, mint_qty}
use modules/types.{MyRedeemer}

validator noise_reduction_validator(
  ipfs_hash: ByteArray,
  _output_reference: OutputReference,
) {
  mint(redeemer: Void, _policy_id: PolicyId, _tx: Transaction) {
    // Define the expected length of the IPFS hash (e.g., 32 bytes for SHA-256, 46 for Base58
    // // Check if the provided IPFS hash has the correct length
    // Verify if the transaction is signed by the required address
    if must_be_correct_length(ipfs_hash, 32) {
      True
    } else {
      False
    }
  }

  else(_) {
    fail
  }
}

pub fn must_be_signed_by(
  transaction: Transaction,
  vk: VerificationKeyHash,
) -> Bool {
  transaction.extra_signatories |> list.has(vk)
}

pub fn must_be_correct_length(ipfs_hash: ByteArray, length: Int) -> Bool {
  bytearray.length(ipfs_hash) == length
}
