# aiken_minting_validator

This showcase project contains 4 minting validators:

- `always_true`
- `check_redeemer`
- `check_redeemer_2`
- `nft`

Install `pnpm` if you have not by running `npm i -g pnpm`, and then go to [`./offchain`](./offchain):

- Run `pnpm i` if you have never run the `offchain`.
- Run `pnpm dev` to run the `offchain`.

Go to http://localhost:3000

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
