const {
  verifyNetworkId,
  verifyChainId,
  verifySenderAcctOffline,
  verifyReceiverAcctOffline,
  verifyAmountOffline,
  verifySenderPublicKey,
  verifySenderPrivateKey,
  askContinue,
  askReview,
  printCmd,
  exit } = require("./verify.js");
const { transfer } = require("./create-cmd.js");

const main = async () => {
 let networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey;
 await runOfflineTransfer(networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey)
 exit();
}

async function runOfflineTransfer(networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey) {
  networkId = await verifyNetworkId(networkId);
  chainId = await verifyChainId(chainId);
  senderAcct = await verifySenderAcctOffline(senderAcct);
  receiverAcct = await verifyReceiverAcctOffline(receiverAcct);
  amount = await verifyAmountOffline(senderAcct, receiverAcct, amount);
  await askReview(chainId, senderAcct, receiverAcct, amount);
  senderPublicKey =  await verifySenderPublicKey(senderAcct, senderPublicKey);
  senderPrivateKey = await verifySenderPrivateKey(senderAcct, senderPrivateKey);
  printCmd(transfer.send(senderAcct, senderPublicKey, senderPrivateKey, receiverAcct, amount, chainId, networkId))
}

main();
