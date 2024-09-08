use aiken_minting_validator/functions.{consume_utxo, mint_qty}
use aiken_minting_validator/types.{Redeemer}
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}

validator always_true {
  mint(_redeemer: Void, _policy_id: PolicyId, _self: Transaction) {
    True
  }

  else(_) {
    fail
  }
}

validator check_redeemer {
  mint(redeemer: Int, _policy_id: PolicyId, _self: Transaction) {
    (redeemer == 42)?
  }

  else(_) {
    fail
  }
}

validator check_redeemer_2 {
  mint(redeemer: Redeemer, _policy_id: PolicyId, _self: Transaction) {
    let Redeemer { key, value } = redeemer
    and {
      (key == "Hello, World!")?,
      (value == 42)?,
    }
  }

  else(_) {
    fail
  }
}

validator nft(output_reference: OutputReference) {
  mint(_redeemer: Void, policy_id: PolicyId, self: Transaction) {
    let Transaction { mint, inputs, .. } = self
    when mint |> mint_qty(policy_id) is {
      1 -> {
        trace @"Is Minting"
        consume_utxo(inputs, output_reference)?
      }
      -1 -> {
        trace @"Is Burning"
        True
      }
      _ -> {
        trace @"Invalid Qty"
        False
      }
    }
  }

  else(_) {
    fail
  }
}
