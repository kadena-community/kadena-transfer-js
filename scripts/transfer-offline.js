const {
  apiHost,
  verifyNetworkId,
  verifyChainId,
  verifySenderAcctOffline,
  verifyReceiverAcctOffline,
  verifyAmountOffline,
  verifySenderPublicKey,
  verifySenderPrivateKey,
  askContinue,
  askReview,
  printCurlCmd,
  exit } = require("../util/verify.js");
const { transfer } = require("../util/create-cmd.js");

const main = async () => {
 let networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey;
 await runOfflineTransfer(networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey)
 exit();
}

async function runOfflineTransfer(networkId, chainId, senderAcct, receiverAcct, amount, senderPublicKey, senderPrivateKey) {
  networkId = await verifyNetworkId(networkId);
  chainId = await verifyChainId(chainId);
  const host = apiHost("{YOUR_NODE}", chainId, networkId)
  senderAcct = await verifySenderAcctOffline(senderAcct);
  receiverAcct = await verifyReceiverAcctOffline(receiverAcct);
  amount = await verifyAmountOffline(senderAcct, receiverAcct, amount);
  await askReview(chainId, senderAcct, receiverAcct, amount);
  senderPublicKey =  await verifySenderPublicKey(senderAcct, senderPublicKey);
  senderPrivateKey = await verifySenderPrivateKey(senderAcct, senderPrivateKey);
  printCurlCmd(transfer.send(senderAcct, senderPublicKey, senderPrivateKey, receiverAcct, amount, chainId, networkId), host)
}

main();
