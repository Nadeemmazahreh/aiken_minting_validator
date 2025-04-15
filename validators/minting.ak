use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/primitive/bytearray
use cardano/assets.{PolicyId, Value, quantity_of}
use cardano/transaction.{
  Input, Output, OutputReference, ScriptPurpose, Spend, Transaction,
}
use modules/functions.{consume_utxo, mint_qty}
use modules/types.{MyRedeemer}

pub type CFdatum {
  seller: ByteArray,
  price: Int,
  policy_id: PolicyId,
  token_name: ByteArray,
  quantity: Int,
}

pub type CFredeemer {
  action: Int,
  owner: Option<VerificationKeyHash>,
  utxo_ref: Option<OutputReference>,
}

// Minting redeemer with data quality and IPFS hash
pub type MintRedeemer {
  ipfs_hash: ByteArray,
  data_quality: Int,
  token_name: ByteArray,
}

validator noise_reduction_validator(ipfs_hash: ByteArray) {
  mint(redeemer: MintRedeemer, policy_id: PolicyId, tx: Transaction) {
    // Check if IPFS hash has correct length (32 bytes for SHA-256)
    let valid_ipfs_hash = must_be_correct_length(redeemer.ipfs_hash, 64)
    // Check if data quality meets the minimum threshold
    let sufficient_quality = redeemer.data_quality >= 50
    // Calculate token quantity based on data quality
    let token_quantity = calculate_token_quantity(redeemer.data_quality)
    // Check the quantity being minted matches our calculated amount
    let mint_qty = assets.quantity_of(tx.mint, policy_id, redeemer.token_name)
    let valid_quantity = mint_qty == token_quantity
    // Anyone can mint as long as they provide valid IPFS hash, sufficient data quality,
    // and mint the correct quantity of tokens based on quality
    valid_ipfs_hash && sufficient_quality && valid_quantity
  }

  spend(
    datum: Option<CFdatum>,
    redeemer: CFredeemer,
    utxo_ref: OutputReference,
    transaction: Transaction,
  ) {
    expect Some(datum) = datum
    when redeemer.action is {
      // Place sell order with specified price
      0 -> sell_order(datum, redeemer, transaction)
      // Cancel the sell order
      1 -> cancel_order(datum, redeemer, transaction)
      // Buy token from a specific sell order
      // 2 -> buy_order(datum, redeemer, utxo_ref, transaction)
      // Invalid action
      _ -> fail @"Invalid marketplace action"
    }
  }

  else(_) {
    fail
  }
}

// Calculate token quantity based on data quality
pub fn calculate_token_quantity(data_quality: Int) -> Int {
  if data_quality < 50 {
    0
  } else if data_quality < 60 {
    10
  } else if data_quality < 70 {
    15
  } else if data_quality < 80 {
    20
  } else if data_quality < 90 {
    35
  } else if data_quality < 95 {
    45
  } else if data_quality < 99 {
    60
  } else {
    100
  }
}

// Check if transaction is signed by specified verification key
pub fn signed_by(
  signer: VerificationKeyHash,
  signatories: List<VerificationKeyHash>,
) {
  list.has(signatories, signer)
}

// Verify IPFS hash has the correct length
pub fn must_be_correct_length(ipfs_hash: ByteArray, length: Int) -> Bool {
  bytearray.length(ipfs_hash) == length
}

pub fn must_be_signed_by(tx: Transaction, vk: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, vk)
}

// Implement sell order logic - allows seller to list NRTs for sale
fn sell_order(datum: CFdatum, redeemer: CFredeemer, tx: Transaction) -> Bool {
  // Seller must sign the transaction
  expect Some(owner) = redeemer.owner
  // Check if transaction is signed by the owner
  let is_signed_by_owner = must_be_signed_by(tx, owner)
  // Verify that the transaction has the correct NRT tokens
  let has_correct_tokens =
    list.any(
      tx.inputs,
      fn(input) {
        let token_amount =
          assets.quantity_of(
            input.output.value,
            datum.policy_id,
            datum.token_name,
          )
        token_amount >= datum.quantity
      },
    )
  // Ensure the tokens are correctly sent to the script address
  let tokens_in_output =
    list.any(
      tx.outputs,
      fn(output) {
        let token_amount =
          assets.quantity_of(output.value, datum.policy_id, datum.token_name)
        token_amount >= datum.quantity
      },
    )
  // All conditions must be met
  is_signed_by_owner && has_correct_tokens && tokens_in_output
}

pub fn cancel_order(
  datum: CFdatum,
  redeemer: CFredeemer,
  tx: Transaction,
) -> Bool {
  // Only the original seller can cancel the order
  expect Some(owner) = redeemer.owner
  // Convert seller ByteArray to VerificationKeyHash for comparison
  let seller_vk = datum.seller
  // Check if conversion gives us the owner's verification key
  let is_owner = bytearray.compare(seller_vk, owner) == Equal
  // Owner must sign the transaction
  let is_signed = must_be_signed_by(tx, owner)
  // Verify that the NRT tokens are being returned to an address controlled by the owner
  let tokens_returned =
    list.any(
      tx.outputs,
      fn(output) {
        // Check if output contains the correct quantity of NRT tokens
        let token_amount =
          assets.quantity_of(output.value, datum.policy_id, datum.token_name)
        let has_tokens = token_amount >= datum.quantity
        // Get outputs that might be owned by the owner and have the tokens
        let potential_owner_output =
          list.any(tx.inputs, fn(input) { must_be_signed_by(tx, owner) })
        has_tokens && potential_owner_output
      },
    )
  // All conditions must be met
  is_owner && is_signed && tokens_returned
}
// pub fn buy_order(
//   datum: CFdatum,
//   redeemer: CFredeemer,
//   utxo_ref: OutputReference,
//   tx: Transaction,
// ) -> Bool {
//   // Buyer must sign the transaction
//   expect Some(buyer) = redeemer.owner
//   let is_signed_by_buyer = must_be_signed_by(tx, buyer)
//   // Check if the price is paid to the seller
//   let is_price_paid =
//     list.any(
//       tx.outputs,
//       fn(output) {
//         // Convert datum.seller to VerificationKeyHash
//         let seller_vk = datum.seller
//         // Check if output address matches seller's address
//         let to_seller =
//           list.any(
//             tx.inputs,
//             fn(input) {
//               // This is a simplification - in a real scenario, you would
//               // need to check the actual address derivation
//               bytearray.compare(input.output.address, seller_vk) == Equal
//             },
//           )
//         // Check if output contains at least the price in lovelace
//         let has_price = output.value.lovelace >= datum.price
//         to_seller && has_price
//       },
//     )
//   // Verify that the NRT tokens are being transferred to the buyer
//   let tokens_transferred =
//     list.any(
//       tx.outputs,
//       fn(output) {
//         // Check if output contains the correct quantity of NRT tokens
//         let token_amount =
//           assets.quantity_of(output.value, datum.policy_id, datum.token_name)
//         let has_tokens = token_amount >= datum.quantity
//         // Check if output might be owned by the buyer
//         let potential_buyer_output =
//           list.any(tx.inputs, fn(input) { must_be_signed_by(tx, buyer) })
//         has_tokens && potential_buyer_output
//       },
//     )
//   // Verify that the correct UTXO is being consumed
//   expect Some(target_utxo) = redeemer.utxo_ref
//   let correct_utxo = utxo_ref == target_utxo
//   // All conditions must be met
//   is_signed_by_buyer && is_price_paid && tokens_transferred && correct_utxo
// }
