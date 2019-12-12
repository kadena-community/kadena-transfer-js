const Pact = require("pact-lang-api");
const fetch = require("node-fetch")
const readline = require('readline');
const apiHost = (node, networkId, chainId) => `https://${node}/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
const stdin = process.openStdin()
const chains = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
const creationTime = () => Math.round((new Date).getTime()/1000)-15;

async function verifyNode(server){
  if (!server) server = await question(`Enter NODE: `)
  try {
    const nodeInfo = await fetch(`https://${server}/info`);
    const nodeInfoJSON = await nodeInfo.json();
    return { node: server, networkId: nodeInfoJSON.nodeVersion };
  } catch(e){
    console.log(`\n`, e)
    exitMessage("Node was not verified")
  }
}

async function verifyNetworkId(networkId){
  if (!networkId) networkId = await question(`Enter NETWORK ID of where this tx will run (press enter if using default, "mainnet01"): `)
  if (networkId === "") return "mainnet01";
  return networkId;
}

async function verifyChainId(chainId){
  if (!chainId) chainId = await question(`Enter CHAIN ID of single chain transfer: `)
  if (chains.indexOf(chainId.toString())===-1){
    exitMessage("Please Choose from 0 to 9");
  }
  return chainId.toString();
}

async function verifyCurrentChainId(chainId){
  if (!chainId) chainId = await question(`Enter SOURCE CHAIN ID of cross chain transfer: `)
  if (chains.indexOf(chainId.toString())===-1){
    exitMessage("Please Choose from 0 to 9");
  }
  return chainId.toString();
}

async function verifyTargetChainId(chainId){
  if (!chainId) chainId = await question(`Enter TARGET CHAIN ID of cross chain transfer: `)
  if (chains.indexOf(chainId.toString())===-1){
    exitMessage("Please Choose from 0 to 9");
  }
  return chainId.toString();
}

//online, offline
async function verifySenderAcctOffline(accountName){
  if (!accountName) accountName = await question("Enter SENDER ACCOUNT: ");
  checkAccountName(accountName);
  return accountName;
}

function checkAccountName(accountName) {
  if (accountName.length<4) {
    exitMessage("Account name is at least 4 characters!")
  }
}

async function verifySenderAcctOnline(accountName, chainId, host){
  if (!accountName) accountName = await question("Enter SENDER ACCOUNT: ");
  checkAccountName(accountName);
  const accountInfo = await getDetails(accountName, chainId, host);
  if (!accountInfo) exitMessage("SENDER DOES NOT EXIST")
  return accountInfo;
}

async function verifyReceiverAcctOffline(accountName){
  if (!accountName) accountName = await question("Enter RECEIVER ACCOUNT: ");
  checkAccountName(accountName);
  return accountName;
}

async function verifyReceiverAcctTransferOnline(accountName, chainId, host){
  if (!accountName) accountName = await question("Enter RECEIVER ACCOUNT: ");
  checkAccountName(accountName);
  const accountInfo = await getDetails(accountName, chainId, host);
  if (!accountInfo) exitMessage("RECEIVER DOES NOT EXIST")
  return accountInfo;
}

async function verifyReceiverAcctTransferCreateOnline(accountName, chainId, host){
  if (!accountName) accountName = await question("Enter RECEIVER ACCOUNT: ");
  checkAccountName(accountName);
  const accountInfo = await getDetails(accountName, chainId, host);
  if (!accountInfo) return {account: accountName, details: false}
  else return accountInfo;
}

async function verifyReceiverPublicKeyOffline(account, key){
  if (!key) key = await question(`Enter PUBLIC KEY of the receiver account, "${account}": `)
  checkKey(key);
  return key;
}

async function verifyReceiverPublicKeyOnline(account, key, accountDetails, chainId, host){
  if (!accountDetails) console.log("Receiver Doesn't exist. You'll create account when you transfer.")
  if (!key) key = await question(`Enter PUBLIC KEY of the receiver account, "${account}": `)
  checkKey(key);
  if (accountDetails){
    if (accountDetails.guard.keys.length>1) exitMessage("Receiver has a multi-sig guard")
    if (accountDetails.guard.keys[0] === key) {
      return key;
    } else {
      exitMessage("Receiver already exists but Receiver Guards don't match")
    }
  } else{
    return key;
  }
}

async function verifyAmountOnline(senderAcct, senderDetails, receiverAcct, amount, mode){
  if (!amount) amount = await question(`Enter AMOUNT to transfer from "${senderAcct}" to "${receiverAcct}": `)
  if (isNaN(Number(amount))){
    exitMessage("Please enter number for the amount");
  } else if (senderDetails.balance <= Number(amount)){
    exitMessage(`Sender Account Balance, ${senderDetails.balance} KDA,  is insufficient for this transfer.`);
  }
  return Number(amount);
}

async function verifyAmountOffline(senderAcct, receiverAcct, amount, mode){
  if (!amount) amount = await question(`Enter AMOUNT to transfer from "${senderAcct}" to "${receiverAcct}": `)
  if (isNaN(Number(amount))){
    exitMessage("Please enter number for the amount");
  } else return Number(amount);
}


async function verifySenderPublicKey(account, key){
  if (!key) key = await question(`Enter PUBLIC KEY of the sender account, "${account}": `)
  checkKey(key);
  return key;
}

async function verifySenderPrivateKey(account, key){
  if (!key) key = await question(`Enter PRIVATE KEY of the sender account, "${account}": `)
  checkKey(key);
  return key;
}

async function verifyProof(proof){
  if (!proof) proof = await question(`Enter SPV PROOF fetched from STEP 2: \n`)
  return proof;
}

async function askReview(chainId, senderAcct, receiverAcct, amount, receiverG){
  let answer;
  if (receiverG) answer = await question(`Review Transfer Details: \n\n CHAIN ID: "${chainId}"\n SENDER: "${senderAcct}"\n RECEIVER: "${receiverAcct}"\n RECEIVER GUARD:\n\n"${JSON.stringify(receiverG)}"\n\n AMOUNT: ${amount} KDA\n \nIs the information correct? (y or yes): `)
  else answer = await question(`Review Transfer Details: \n\n CHAIN ID: "${chainId}"\n SENDER: "${senderAcct}"\n RECEIVER: "${receiverAcct}"\n AMOUNT: ${amount} KDA\n \nIs the information correct? (y or yes): `)
  if (answer === "y" || answer === "yes") {
    console.log("")
  } else {
    exitMessage("You Cancelled Transfer")
  }
}

async function askContinue(){
  const answer = await question(`\nContinue? (y or yes): `);
  if (answer === "y" || answer === "yes") {
    console.log("")
  }
  else {
    exitMessage("You Responded not to Continue")
  }
}

async function printPreview(localCmd, host){
  const gasPrice = JSON.parse(localCmd.cmd).meta.gasPrice;
  const gasLimit = JSON.parse(localCmd.cmd).meta.gasLimit;
  try {
    const preview = await fetch(`${host}/api/v1/local`, mkReq(localCmd));
    const res = await preview.json();
    const gasOnFailure = (res.gas * gasPrice).toFixed(12);
    const gasOnSuccess = (gasPrice * gasLimit).toFixed(12);
    const view = JSON.stringify(res)
    if (res.result.status === "failure"){
      exitMessage(`\nYour tx will fail with the following details\n\n ${view}\n\nExpected Gas Consumption on Failure is: ${gasOnFailure}\nInvestigate issue and try again!` )
    } else if (res.result.status){
      console.log(`\nHere's a preview of your TX result! \n\n ${view}\n\nExpected Gas Consumption on Success is: ${gasOnSuccess}\nExpected Gas Consumption on Failure is: ${gasOnFailure}`)
    }
  } catch(e){
    exitMessage("\nSorry, Preview failed. \n" + e)
  }
}

function printCurlCmd(sendCmd, host){
  const reqKey = sendCmd.cmds[0].hash
  console.log(`\nHere you go! \n\nSTEP 1) MAKE TRANSFER \n\ncurl -k -X POST -H 'Content-Type:application/json' ${host}/api/v1/send -d '${JSON.stringify(sendCmd)}'\n\nSTEP 2) LOOK UP TX RESULT (You can call this as many times as you want) \n\ncurl -k -X POST -H 'Content-Type:application/json' ${host}/api/v1/listen -d '{"listen": "${reqKey}"}' \n\n`)
}

function printCmd(sendCmd){
  console.log(`\nHere you go! \n\n${JSON.stringify(sendCmd)} \n\n`);
  return sendCmd.cmds[0].hash;
}

async function executeCmd(sendCmd, host){
  try {
    console.log("\nSending to the Node... \n\n", JSON.stringify(sendCmd))
    const res = await fetch(`${host}/api/v1/send`, mkReq(sendCmd));
    const resJSON = await res.json();
    try {
      console.log("\n Listening For the Respose... \n\n", resJSON)
      const listen = await fetch(`${host}/api/v1/listen`, mkReq({listen: resJSON.requestKeys[0]}));
      const listenJSON = await listen.json();
      console.log("\nHere's your result!! \n\n", resJSON)
      return listen;
    } catch (e){
      exitMessage("\nSorry, LISTENING failed. \n" + e)
    }
  } catch(e){
    exitMessage("\nSorry, TX failed. \n" + e)
  }

}

const rl = readline.createInterface({
  input : process.stdin,
  output : process.stdout
});

const question = (theQuestion) => {
  return new Promise(resolve => rl.question(theQuestion, answ => resolve(answ)))
}

const exitMessage = (msg) => {
  console.log("EXITING - ", msg)
  process.exit()
}

const is_hexadecimal = (str) => {
  const regexp = /^[0-9a-fA-F]+$/;
  if (regexp.test(str)) return true;
  else return false;
}

const checkKey = (key) => {
  if (key.length !== 64) {
    exitMessage("Key does not have length of 64")
  } else if (!is_hexadecimal(key)){
    exitMessage("Key is not hex string")
  }
}

const mkReq = function(cmd) {
  return {
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    body: JSON.stringify(cmd)
  };
};

const getDetails = async function(account, chainId, host){
  try {
    const accountInfo = await Pact.fetch.local({
      pactCode: `(coin.details "${account}")`,
      keyPairs: Pact.crypto.genKeyPair(),
      meta:  Pact.lang.mkMeta(account, chainId, 0.00001, 600, creationTime(), 600)
    }, host)
    if (accountInfo.result.status ==="failure") {
      return null;
    } else if(accountInfo.result.status ==="success") {
      accountDetails = accountInfo.result.data;
      return { account: account, details: accountDetails };
    }
  } catch(e){
    console.log(e)
  }
}

module.exports = {
  apiHost: apiHost,
  verifyNode: verifyNode,
  verifyNetworkId: verifyNetworkId,
  verifyChainId: verifyChainId,
  verifySenderAcctOnline: verifySenderAcctOnline,
  verifySenderAcctOffline: verifySenderAcctOffline,
  verifyReceiverAcctOffline: verifyReceiverAcctOffline,
  verifyReceiverAcctTransferOnline: verifyReceiverAcctTransferOnline,
  verifyReceiverAcctTransferCreateOnline: verifyReceiverAcctTransferCreateOnline,
  verifyReceiverPublicKeyOnline: verifyReceiverPublicKeyOnline,
  verifyReceiverPublicKeyOffline: verifyReceiverPublicKeyOffline,
  verifyAmountOnline: verifyAmountOnline,
  verifyAmountOffline: verifyAmountOffline,
  verifySenderPublicKey: verifySenderPublicKey,
  verifySenderPrivateKey: verifySenderPrivateKey,
  verifyCurrentChainId: verifyCurrentChainId,
  verifyTargetChainId: verifyTargetChainId,
  verifyProof: verifyProof,
  askReview: askReview,
  askContinue: askContinue,
  printPreview: printPreview,
  printCurlCmd: printCurlCmd,
  printCmd: printCmd,
  executeCmd: executeCmd,
  exit: () => rl.close()
}
