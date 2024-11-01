use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}
use modules/functions.{consume_utxo, mint_qty}
use modules/types.{MyRedeemer}

validator always_true {
  /// ☝🏻validator:
  /// https://aiken-lang.org/language-tour/validators
  mint(_redeemer: Void, _policy_id: PolicyId, _tx: Transaction) {
    True
  }

  else(_) {
    fail
  }
}

validator check_redeemer {
  mint(redeemer: Int, _policy_id: PolicyId, _tx: Transaction) {
    (redeemer == 42)?
  }

  else(_) {
    fail
  }
}

validator check_redeemer_2 {
  mint(redeemer: MyRedeemer, _policy_id: PolicyId, _tx: Transaction) {
    let MyRedeemer { key, value } = redeemer
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
  mint(_redeemer: Void, policy_id: PolicyId, tx: Transaction) {
    let Transaction { mint, inputs, .. } = tx
    //                 ☝🏻Transaction.mint:
    // https://aiken-lang.github.io/stdlib/cardano/transaction.html#Transaction:~:text=%3A%20Lovelace%2C-,mint,-%3A%20Value%2C
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
