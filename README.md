# aiken_minting_validator

This showcase project contains 4 minting validators:

- `always_true`
- `check_redeemer`
- `check_redeemer_2`
- `nft`

To run the offchain:

1. Create a `.env.local` file
2. Run `pnpm dev`

Your `.env.local` file must contain:

```
NEXT_PUBLIC_BF_URL=https://cardano-preprod.blockfrost.io/api/v0
NEXT_PUBLIC_BF_PID=preprodYOUR_PREPROD_BLOCKFROST_PROJECT_ID
NEXT_PUBLIC_CARDANO_NETWORK=Preprod
```

To install `pnpm` run `npm i -g pnpm`.

## `always_true`

This is an introduction to minting validator, akin to hello-world in other programming languages. This validator will allow anyone to mint/burn tokens at anytime.

## `check_redeemer`

This is a trivial minting validator, anyone is allowed to mint/burn tokens at anytime as long as they provide the redeemer value of 42.

## `check_redeemer_2`

This is similar to `check_redeemer` but the redeemer is a custom type instead of a primitive type, defined as:

```gleam
pub type MyRedeemer {
  key: ByteArray,
  value: Int,
}
```

Take a look at the offchain code to see how we can construct a redeemer of this type.

## `nft`

We explore the concept of "One-shot" Minting policies to enforce token uniqueness.

See: https://aiken-lang.org/fundamentals/common-design-patterns#one-shot-minting-policies
