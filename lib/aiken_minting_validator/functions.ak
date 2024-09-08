use aiken/collection/dict
use aiken/collection/list
use cardano/assets.{PolicyId, Value}
use cardano/transaction.{Input, OutputReference}

pub fn mint_qty(mint: Value, policy_id: PolicyId) -> Int {
  expect [Pair(_, qty)] =
    mint
      |> assets.tokens(policy_id)
      |> dict.to_pairs()
  qty
}

pub fn consume_utxo(
  transaction_inputs: List<Input>,
  output_reference: OutputReference,
) -> Bool {
  list.any(
    transaction_inputs,
    fn(transaction_input: Input) {
      transaction_input.output_reference == output_reference
    },
  )
}
