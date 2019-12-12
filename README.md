# Transfer KDA

## Setup

- Install Node.js

## Single Chain Transfer

There are two ways to transfer KDA in Chainweb on a single chain.
  1. `transfer`
  2. `transfer-create`


You can learn more about KDA coin contract [here](https://github.com/kadena-io/chainweb-node/blob/master/pact/coin-contract/coin.pact).

### transfer-create

**transfer-create** is executed between:   
- One EXISTING account and one NON-EXISTING account that will be created by this transaction
- Two EXSTIING accounts

The function takes in the following arguments:
- Sender Account
- Receiver Account
- Receiver Guard
- Amount

and requires a signature of the sender Keypair.

You should use this function if you are creating a new account and transferring KDA coin.
If you already have the receiver account, this function is still useful if you know the guard of the receiver account.
This will be a more conservative approach than `coin.transfer` which prevents you from transferring to a wrong account by checking the receiver guard.

If you want to create the command completely offline, use:
```
node scripts/transfer-create-offline.js
```
If you want to create the command with account validations and guard checks, use:
```
node scripts/transfer-create-online.js
```

### transfer

**transfer** is executed between:
- Two EXISTING accounts.

The function takes in the following arguments:
- Sender Account
- Receiver Account
- Amount

and requires a signature of the sender keypair.

You should use this function ONLY IF you are completely sure about the receiver account.

If you want to create the command completely offline, use:
```
node scripts/transfer-offline.js
```
If you want to create the command with account validations and guard checks, use:
```
node scripts/transfer-offline.js
```

## Cross Chain Transfer
  Coming soon!
