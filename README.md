# KDA Transfer

## Setup

- Install Node.js

## Single Chain Transfer

There are two ways to transfer KDA in Chainweb, `coin.transfer`, and `coin.transfer-create`.
You can learn more about KDA coin contract here(https://github.com/kadena-io/chainweb-node/blob/master/pact/coin-contract/coin.pact).

### coin.transfer-create
  `coin.transfer-create` is executed between two EXISTING accounts, or one EXISTING account and one NON-EXISTING account that will be created by this transaction.
  You should use this function if you are creating a new account and transferring KDA coin.
  If you already have the receiver account, this function is still useful if you know the guard of the receiver account.
  This will be a more conservative approach than `coin.transfer` which prevents you from transferring to a wrong account by checking the receiver guard.
  If you know the guard (aka public key) of the RECEIVER Account, this will be a safer way to run transfer.

  Use this if you want to build the command with verification of accounts and guards, in addition to a preview of the result.
  ```
  node transfer-create-online.js
  ```

  Use this if you want to build the command completely offline.
  ```
  node transfer-create-offline.js
  ```

### coin.transfer
  `coin.transfer` is executed between two EXISTING accounts.
  This function does not require a RECEIVER guard input, and so you can simply transfer KDA coin if you know the receiver Account Name.

  Use this if you want to build the command with verification of accounts, in addition to a preview of the result.
  ```
  node transfer-online.js
  ```

  Use this if you want to build the command completely offline.
  ```
  node transfer-offline.js
  ```

## Cross Chain Transfer
  Coming soon!
