const Pact = require("pact-lang-api");
const creationTime = () => Math.round((new Date).getTime()/1000)-15;

const transferCode = (sender, receiver, amount) => `(coin.transfer "${sender}" "${receiver}" ${amount})`;
const transferCreateCode = (sender, receiver, amount) => `(coin.transfer-create "${sender}" "${receiver}" (read-keyset "receiver-guard") ${amount})`;
const transferCrossChain = (sender, receiver, targetChain, amount) => `(coin.transfer-crosschain "${sender}" "${receiver}" (read-keyset "receiver-guard") "${targetChain}" ${amount})`;
const transferMeta = (sender, chainId) => Pact.lang.mkMeta(sender, chainId, 0.00001, 600, creationTime(), 600);
const transferKp = (sender, senderKp, receiver, amount) => {
  return { ...senderKp,
      clist: [
        {"name": "coin.TRANSFER", "args": [sender, receiver, Number(amount)]},
        {"name": "coin.GAS", "args": []},
    ]
  }
};

const transferCrossChainKp = (sender, senderKp) => {
  return { ...senderKp,
      clist: [
        {"name": "coin.DEBIT", "args": [sender]},
        {"name": "coin.GAS", "args": []},
    ]
  }
};

const transferReceiverG = (pubKey) => {return {"receiver-guard": [pubKey]}}

const keepDecimal = decimal =>{
  const num = decimal.toString().indexOf('.') === -1 ? `${decimal}.0` : decimal
  return num
}

function createTransferObj(sender, senderKp, receiver, receiverPubKey, amount, chainId, targetChain){
  let transferObj = {
    keyPairs: transferKp(sender, senderKp, receiver, amount),
    transferCrossChainKp: transferCrossChainKp(sender, senderKp),
    meta: transferMeta(sender, chainId),
    envData: transferReceiverG(receiverPubKey),
    transferCode: transferCode(sender, receiver, keepDecimal(amount)),
    transferCreateCode: transferCreateCode(sender, receiver, keepDecimal(amount)),
    transferCrossChainCode: transferCrossChain(sender, receiver, targetChain, keepDecimal(amount))
  }
  return transferObj
}

function createTransferCmd(sender, senderPubKey, senderSecretKey, receiver, amount, chainId, networkId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, null, amount, chainId);
  return Pact.simple.exec.createCommand(obj.keyPairs, undefined, obj.transferCode, null, obj.meta, networkId)
}

function createTransferLocalCmd(sender, senderPubKey, senderSecretKey, receiver, amount, chainId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, null, amount, chainId);
  return Pact.simple.exec.createLocalCommand(obj.keyPairs, undefined, obj.transferCode, null, obj.meta)
}

function createTransferCreateCmd(sender, senderPubKey, senderSecretKey, receiver, receiverPubKey, amount, chainId, networkId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, receiverPubKey, amount, chainId);
  if (!obj.envData) console.log("ERR - You don't have receiver guard")
  else return Pact.simple.exec.createCommand(obj.keyPairs, undefined, obj.transferCreateCode, obj.envData, obj.meta, networkId)
}

function createTransferCreateLocalCmd(sender, senderPubKey, senderSecretKey, receiver, receiverPubKey, amount, chainId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, receiverPubKey, amount, chainId);
  if (!obj.envData) console.log("ERR - You don't have receiver guard")
  else return Pact.simple.exec.createLocalCommand(obj.keyPairs, undefined, obj.transferCreateCode, obj.envData, obj.meta)
}

//STEP 1
function createTransferCrossChainCmd(sender, senderPubKey, senderSecretKey, receiver, receiverPubKey, amount, chainId, targetChain, networkId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, receiverPubKey, amount, chainId, targetChain);
  if (!obj.envData) console.log("ERR - You don't have receiver guard")
  return Pact.simple.exec.createCommand(obj.transferCrossChainKp, undefined, obj.transferCrossChainCode, obj.envData, obj.meta, networkId)
}

function createTransferCrossChainLocalCmd(sender, senderPubKey, senderSecretKey, receiver, receiverPubKey, amount, chainId, targetChain, networkId){
  const senderKp = {publicKey: senderPubKey, secretKey: senderSecretKey}
  const obj = createTransferObj(sender, senderKp, receiver, receiverPubKey, amount, chainId, targetChain);
  if (!obj.envData) console.log("ERR - You don't have receiver guard")
  return Pact.simple.exec.createLocalCommand(obj.transferCrossChainKp, undefined, obj.transferCrossChainCode, obj.envData, obj.meta, networkId)
}

//STEP 2
function createSPVCmd(pactId, targetChainId){
  if (!pactId) console.log("ERR - You don't have pactId")
  if (!targetChainId) console.log("ERR - You don't have target chain")
  return {
    requestKey: pactId,
    targetChainId: targetChainId
  }
}

//STEP 3
function createTransferCrossChainCont(gasPayer, gasPayerPubKey, gasPayerSecretKey, proof, pactId, targetChain, networkId){
  const senderKp = {publicKey: gasPayerPubKey, secretKey: gasPayerSecretKey}
  const meta = transferMeta(gasPayer, targetChain)
  return Pact.simple.cont.createCommand(senderKp, undefined, 1, pactId, false, null, meta, proof, networkId);
}

module.exports = {
  transfer: {
    send: createTransferCmd,
    local: createTransferLocalCmd
  },
  transferCreate: {
    send: createTransferCreateCmd,
    local: createTransferCreateLocalCmd
  },
  transferCrosschain: {
    stepOne: createTransferCrossChainCmd,
    stepOneLocal: createTransferCrossChainLocalCmd,
    stepTwo: createSPVCmd,
    stepThree: createTransferCrossChainCont
  }
}
