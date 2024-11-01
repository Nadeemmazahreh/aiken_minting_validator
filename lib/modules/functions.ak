use aiken/collection/dict
use aiken/collection/list
use cardano/assets.{PolicyId, Value}
use cardano/transaction.{Input, OutputReference}

pub fn mint_qty(mint: Value, policy_id: PolicyId) -> Int {
  expect [Pair(_, qty)] =
    //     ☝🏻Pair:
    //     - https://aiken-lang.org/language-tour/primitive-types#pair
    //     - https://github.com/aiken-lang/prelude/blob/190650684e6ebfd0236bd896b107d575538c6c22/lib/aiken.ak#L86-L88
    //     - https://aiken-lang.github.io/prelude/aiken/builtin.html#Pair
    mint
      |> assets.tokens(policy_id)
      |> dict.to_pairs()
  //              ☝🏻Pairs:
  //              - https://aiken-lang.org/language-tour/primitive-types#pairs
  //              - https://github.com/aiken-lang/prelude/blob/190650684e6ebfd0236bd896b107d575538c6c22/lib/aiken.ak#L94-L95
  //              - https://aiken-lang.github.io/stdlib/aiken/collection/pairs.html
  qty
}

pub fn consume_utxo(
  transaction_inputs: List<Input>,
  output_reference: OutputReference,
) -> Bool {
  let transaction_input <- list.any(transaction_inputs)
  //                   ☝🏻Backpassing:
  // https://aiken-lang.org/language-tour/functions#backpassing-
  transaction_input.output_reference == output_reference
}
