const {
  apiHost,
  verifyNetworkId,
  verifyChainId,
  verifySenderAcctOffline,
  verifyReceiverAcctOffline,
  verifyReceiverPublicKeyOffline,
  verifyAmountOffline,
  verifySenderPublicKey,
  verifySenderPrivateKey,
  printPreview,
  askContinue,
  askReview,
  printCurlCmd,
  exit,
} = require("../util/verify.js");

const { transferCreate } = require("../util/create-cmd.js");

const main = async () => {
 let networkId, chainId, senderAcct, receiverAcct, receiverPublicKey, amount, senderPublicKey, senderPrivateKey;
 await runOfflineTransferCreate(networkId, chainId, senderAcct, receiverAcct, receiverPublicKey, amount, senderPublicKey, senderPrivateKey)
 exit();
}

async function runOfflineTransferCreate(networkId, chainId, senderAcct, receiverAcct, receiverPublicKey, amount, senderPublicKey, senderPrivateKey) {
  networkId = await verifyNetworkId(networkId);
  chainId = await verifyChainId(chainId);
  const host = apiHost("{YOUR_NODE}", networkId, chainId)
  senderAcct = await verifySenderAcctOffline(senderAcct);
  receiverAcct = await verifyReceiverAcctOffline(receiverAcct);
  receiverPublicKey = await verifyReceiverPublicKeyOffline(receiverAcct, receiverPublicKey);
  amount = await verifyAmountOffline(senderAcct, receiverAcct, amount);
  const receiverGuard = {
    pred: 'keys-all',
    keys: [receiverPublicKey]
  }
  await askReview(chainId, senderAcct, receiverAcct, amount, receiverGuard);
  senderPublicKey =  await verifySenderPublicKey(senderAcct, senderPublicKey);
  senderPrivateKey = await verifySenderPrivateKey(senderAcct, senderPrivateKey);
  printCurlCmd(transferCreate.send(senderAcct, senderPublicKey, senderPrivateKey, receiverAcct, receiverPublicKey, amount, chainId, networkId), host)
  console.log("Replace {YOUR_NODE} with the node server you'll send to")
}

main();
