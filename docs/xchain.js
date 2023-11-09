//UTILITY FUNCTIONS
const mkReq = cmd => {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(cmd),
  };
};

const is_hexadecimal = str => {
  const regexp = /^[0-9a-fA-F]+$/;
  if (regexp.test(str)) return true;
  else return false;
};

const convertDecimal = decimal => {
  decimal = decimal.toString();
  if (decimal.includes('.')) {
    return decimal;
  }
  if (decimal / Math.floor(decimal) === 1) {
    decimal = decimal + '.0';
  }
  return decimal;
};

const createTime = () => Math.round(new Date().getTime() / 1000) - 50;

const checkKey = key => {
  if (key.length !== 64) {
    throw 'Key does not have length of 64';
  } else if (!is_hexadecimal(key)) {
    throw 'Key is not hex string';
  }
  return true;
};

const checkSecretKey = key => {
  if (key.length !== 64 && key.length !== 128) {
    throw 'Key does not have the correct length';
  } else if (!is_hexadecimal(key)) {
    throw 'Key is not hex string';
  }
  return true;
};

async function getVersion(server) {
  try {
    const nodeInfo = await fetch(`https://${server}/info`);
    const nodeInfoJSON = await nodeInfo.json();
    return nodeInfoJSON.nodeVersion;
  } catch (e) {
    throw e;
  }
}

async function verifyNode(node) {
  return getVersion(node)
    .then(networkId => {
      document.getElementById('networkId').classList.remove('red');
      document.getElementById('networkId').textContent = networkId;
      State.networkId = networkId;
    })
    .catch(e => {
      State.server = '';
      State.networkId = '';
      document.getElementById('networkId').classList.add('red');
      document.getElementById('networkId').textContent = 'Not a Chainweb Node';
    });
}

//TRANSFER FUNCTIONS
const sendNonJson = async function (cmd, apiHost) {
  var c;
  if (!apiHost) throw new Error(`Pact.fetch.send(): No apiHost provided`);
  c = Pact.simple.cont.createCommand(
    cmd.keyPairs,
    cmd.nonce,
    cmd.step,
    cmd.pactId,
    cmd.rollback,
    cmd.envData,
    cmd.meta,
    cmd.proof,
    cmd.networkId,
  );
  const txRes = await fetch(`${apiHost}/api/v1/send`, mkReq(c));
  return txRes;
};

async function findSrcChain() {
  const pactId = State.pactId;
  const server = State.server;
  const networkId = State.networkId;
  const chainInfoPromises = Array.from(new Array(20)).map((_, chainId) => {
    const host = `https://${server}/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
    return Pact.fetch.poll({ requestKeys: [pactId] }, host);
  });
  const chainInfos = await Promise.all(chainInfoPromises);

  let found;
  chainInfos.map(async (pactInfo, chainId) => {
    if (pactInfo[pactId]) {
      found = { chainId: chainId, tx: pactInfo[pactId] };
    }
  });
  return [found];
}

async function getPact() {
  let requestKeys = await findSrcChain();
  document.getElementById('pact-info').hidden = true;
  if (requestKeys.length === 0) {
    document
      .getElementById('pact-message')
      .setAttribute('class', 'ui compact message');
    document.getElementById('pact-header').textContent =
      'Request Key could not be found';
  } else {
    try {
      let source = requestKeys[0].chainId;
      let tx = requestKeys[0].tx;
      let [sender, receiver, g, target, amount] =
        tx.continuation.continuation.args;
      document
        .getElementById('pact-message')
        .setAttribute('class', 'ui compact message');

      State.pactHeader = 'Pact Information';
      State.pactInfo = false;
      State.sourceChainId = source;
      State.targetChainId = target;
      State.sender = sender;
      State.receiver = receiver;
      State.rg = JSON.stringify(g);
      State.amount = amount;
    } catch (e) {
      document
        .getElementById('pact-message')
        .setAttribute('class', 'ui compact message');
      document.getElementById('pact-header').textContent =
        'Not a Cross Chain Request Key';
    }
  }
}

/**
 * Retreive item or false from LocalStorage
 *
 * @param {*} key key of the item
 * @return {string|false} value or false
 */
function getIfSetLocalStorage(key) {
  const ls = window.localStorage.getItem(key);
  if (ls && ls.length > 0) {
    return ls;
  }
  return false;
}

class State {
  /**
   *  e.g. api.testnet.chainweb.com
   */
  static set server(value) {
    document.getElementById('server').value = value;
    window.localStorage.setItem('xchain-server', value);
  }
  static get server() {
    const ls = getIfSetLocalStorage('xchain-server');
    if (ls) {
      return ls;
    }

    return document.getElementById('server').value;
  }

  static get sourceHost() {
    return (
      `https://${State.server}/chainweb/0.0/` +
      `${State.networkId}/chain/${State.sourceChainId}/pact`
    );
  }

  static get targetHost() {
    return (
      `https://${State.server}/chainweb/0.0/` +
      `${State.networkId}/chain/${State.targetChainId}/pact`
    );
  }

  /**
   *
   * e.g. 'mainnet01'
   */
  static set networkId(value) {
    window.localStorage.setItem('xchain-networkId', value);
    document.getElementById('networkId').textContent = value;
  }

  static get networkId() {
    const ls = getIfSetLocalStorage('xchain-networkId');
    if (ls) return ls;

    return document.getElementById('networkId').textContent;
  }

  static set requestKey(value) {
    window.localStorage.setItem('xchain-request-key', value.trim());
    document.getElementById('pact-id').value = value.trim();
  }

  static get requestKey() {
    const ls = getIfSetLocalStorage('xchain-request-key');
    if (ls) {
      return ls.trim();
    }

    const requestKey = document.getElementById('pact-id').value.trim();
    window.localStorage.setItem('xchain-request-key', requestKey);
    return requestKey;
  }

  static get pactId() {
    return State.requestKey.length === 44
      ? State.requestKey.slice(0, 43)
      : State.requestKey;
  }

  static get pactHeader() {
    return document.getElementById('pact-header').textContent;
  }

  /**
   * example: 'Pact Information'
   */
  static set pactHeader(value) {
    document.getElementById('pact-header').textContent = value;
  }
  static get pactInfo() {
    return document.getElementById('pact-info').hidden;
  }

  /**
   * example: false
   */
  static set pactInfo(value) {
    document.getElementById('pact-info').hidden = value;
  }
  static get sourceChainId() {
    return document.getElementById('source-chain-id').textContent;
  }

  /**
   * example: source
   */
  static set sourceChainId(value) {
    document.getElementById('source-chain-id').textContent = value;
  }
  static get targetChainId() {
    return document.getElementById('target-chain-id').textContent;
  }

  /**
   * example: target
   */
  static set targetChainId(value) {
    document.getElementById('target-chain-id').textContent = value;
  }

  /**
   * example: sender
   */
  static set sender(value) {
    document.getElementById('sender').textContent = value;
  }
  static get sender() {
    return document.getElementById('sender').textContent;
  }
  static get senderPublicKey() {
    return State.sender.split(':')[1];
  }

  static get receiver() {
    return document.getElementById('receiver').textContent;
  }

  /**
   * example: receiver
   */
  static set receiver(value) {
    document.getElementById('receiver').textContent = value;
  }
  static get rg() {
    return document.getElementById('rg').textContent;
  }

  /**
   * example: JSON.stringify(g)
   */
  static set rg(value) {
    document.getElementById('rg').textContent = value;
  }
  static get amount() {
    return document.getElementById('amount').textContent;
  }

  /**
   * example: amount
   */
  static set amount(value) {
    document.getElementById('amount').textContent = value;
  }

  /**
   * example: k:someaccount
   * example: kadena-xchain-gas
   */
  static set gasPayer(value) {
    localStorage.setItem('xchain-gas-payer', value);
    document.getElementById('gas-payer').value = value;
  }
  static get gasPayer() {
    const ls = getIfSetLocalStorage('xchain-gas-payer');
    if (ls) {
      State.gasPayer = ls;
      return ls;
    }

    return document.getElementById('gas-payer').value;
  }

  static set gasPayerAccountDetails(value) {
    window.gasPayerAccountDetails = value;
  }

  static get gasPayerAccountDetails() {
    return window.gasPayerAccountDetails;
  }

  static get gasLimit() {
    return Math.floor(document.getElementById('gas-limit').value);
  }

  static get gasPrice() {
    return Number.parseFloat(document.getElementById('gas-price').value);
  }

  static get proof() {
    return window.proof;
  }

  static set proof(val) {
    window.proof = val;
  }
}

async function getProof() {
  const targetChainId = State.targetChainId;
  const pactId = State.pactId;
  const spvCmd = { targetChainId: targetChainId, requestKey: pactId };
  const host = State.sourceHost;
  try {
    const res = await fetch(`${host}/spv`, mkReq(spvCmd));
    let foo = await res;

    if (foo.ok) {
      const proof = await res.json();
      State.proof = proof;
      return proof;
    } else {
      const proof = await res.text();
      //Initial Step is not confirmed yet.
      throw proof;
    }
  } catch (e) {
    setError(
      'Initial transfer is not confirmed yet. Please wait and try again.',
    );
  }
}

const handleResult = async function (res) {
  const foo = await res;
  hideSpinner();
  if (foo.ok) {
    showStatusBox();
    const j = await res.json();
    var reqKey = j.requestKeys[0];
    document.getElementById('status-message').textContent =
      'Transaction Pending...';
    document.getElementById('reqkey-box').hidden = false;
    document.getElementById('request-key').textContent = reqKey;
    listen();
  } else {
    showNegativeStatusBox();
    t = await res.text();
    document.getElementById('reqkey-box').hidden = true;
    document.getElementById('status-message').textContent = t;
  }
};

async function listen() {
  document.getElementById('listen-button').disabled = false;
  showSpinner();
  const reqKey = document.getElementById('request-key').textContent;
  Pact.fetch
    .listen(
      { listen: reqKey },
      `https://${State.server}/chainweb/0.0/${State.networkId}/chain/${State.targetChainId}/pact`,
    )
    .then(res => {
      console.log(res);
      if (res.result.status === 'success') {
        document.getElementById('status-message').textContent =
          'TRANSFER SUCCEEDED';
        document.getElementById('status-error').textContent = '';
        window.localStorage.removeItem('xchain-request-key');
      } else {
        document.getElementById('status-message').textContent =
          'TRANSFER FAILED with error';
        document.getElementById('status-error').textContent = JSON.stringify(
          res.result.error.message,
        );
        window.localStorage.removeItem('xchain-request-key');
      }
    });
}

async function finishXChain() {
  disableSubmit();
  const signedTransaction = document.getElementById('signed-transaction').value;
  try {
    if (signedTransaction) {
      try {
        const testLocal = await fetch(
          `${State.targetHost}/api/v1/local`,
          makeRawRequestInit(signedTransaction),
        ).then(r => r.json());
        if (
          testLocal.result.status === 'failure' &&
          testLocal.result.error.message.includes('pact completed')
        ) {
          setError(testLocal.result.error.message);
          return;
        }

        const result = await fetch(
          `${State.targetHost}/api/v1/send`,
          makeRawRequestInit(`{ "cmds": [${signedTransaction}] }`),
        );
        handleResult(result);
        document.getElementById('result-message').textContent =
          JSON.stringify(result);
      } catch (e) {
        setError(e);
      }
    } else {
      if (!State.proof) {
        State.proof = await getProof().catch(setError);
      }
      const targetChainId = State.targetChainId;
      const pactId = State.pactId;
      const networkId = State.networkId;
      const gasStation = State.gasPayer;
      const gasLimit = State.gasLimit;
      const gasPrice = State.gasPrice;
      const m = Pact.lang.mkMeta(
        gasStation,
        targetChainId,
        gasPrice,
        gasLimit,
        createTime(),
        28800,
      );
      const contCmd = {
        type: 'cont',
        keyPairs: [],
        pactId: pactId,
        rollback: false,
        step: 1,
        meta: m,
        proof: State.proof,
        networkId: networkId,
      };
      try {
        const c = Pact.simple.cont.createCommand(
          contCmd.keyPairs,
          contCmd.nonce,
          contCmd.step,
          contCmd.pactId,
          contCmd.rollback,
          contCmd.envData,
          contCmd.meta,
          contCmd.proof,
          contCmd.networkId,
        );
        const testLocal = await fetch(
          `${State.targetHost}/api/v1/local`,
          makeRawRequestInit(JSON.stringify(c.cmds[0])),
        ).then(r => r.json());
        if (
          testLocal.result.status === 'failure' &&
          testLocal.result.error.message.includes('pact completed')
        ) {
          setError(testLocal.result.error.message);
          return;
        }
      } catch (e) {
        setError(e);
        return;
      }
      try {
        const result = await sendNonJson(contCmd, State.targetHost);
        handleResult(result);
        document.getElementById('result-message').textContent =
          JSON.stringify(result);
      } catch (e) {
        setError(e);
      }
    }
  } catch (e) {
    setError(e);
  }
}

//UI FUNCTIONS
function disableSubmit() {
  document.getElementById('submit-button').disabled = true;
}

function enableSubmit() {
  document.getElementById('submit-button').disabled = false;
}

$(function () {
  $('.ui.dropdown').dropdown();
});

function showNegativeStatusBox() {
  document
    .getElementById('status-box')
    .setAttribute('class', 'ui compact negative message result');
}

function showStatusBox() {
  document.getElementById('listen-button').disabled = true;
  document
    .getElementById('status-box')
    .setAttribute('class', 'ui compact message result');
}

function hideStatusBox() {
  document
    .getElementById('status-box')
    .setAttribute('class', 'ui compact message result hidden');
}

function showSpinner() {
  //document.getElementById('pending-spinner').setAttribute("class", "ui dimmer active");
}

function hideSpinner() {
  //document.getElementById('pending-spinner').setAttribute("class", "ui dimmer");
}

function clearError() {
  document.getElementById('acct-err').innerText = '';
  document.getElementById('acct-err').classList.add('hidden');
  document.getElementById('kadena-form').setAttribute('class', 'ui form');
}

function setError(msg) {
  hideSigData();
  disableSubmit();
  document.getElementById('acct-err').innerText = msg;
  document.getElementById('acct-err').classList.remove('hidden');
  document.getElementById('kadena-form').setAttribute('class', 'ui form error');
}

function setSigData(msg) {
  const sigDataTextarea = document.getElementById('sig-data');
  sigDataTextarea.value = msg;
}

function sigData() {
  return document.getElementById('sig-data').value;
}

function clearSigData() {
  const sigDataTextarea = document.getElementById('sig-data');
  sigDataTextarea.value = '';
}

function hasValue(elId) {
  v = document.getElementById(elId).value;
  return v && v.length > 0;
}

function complete() {
  let requestKey = document.getElementById('pact-id').value.trim(); //remove whitespace
  hideStatusBox();
  return (
    document.getElementById('networkId').textContent !==
      'Not a Chainweb Node' &&
    (requestKey.length === 43 ||
      (requestKey.length === 44 && requestKey[43] === '='))
  );
}

function validateServer() {
  document.getElementById('server').addEventListener(
    'blur',
    function (event) {
      clearError();
      hideStatusBox();
      try {
        const val = event.target.value;
        if (val !== null && val !== '' && State.server !== val) {
          clearAll();
          State.server = val;
          verifyNode(val).then(() => {
            if (complete()) {
              State.server = val;
              fetchInfo();
            } else {
              document
                .getElementById('pact-message')
                .setAttribute('class', 'ui compact message hidden');
            }
          });
        }
      } catch (err) {
        console.log(err);
        setError(err);
      }

      setUrlParam('network', event.target.value);
    },
    false,
  );
}

function clearAll() {
  State.proof = null;
  clearSigData();
  hideSigData();
}

function validatePact() {
  clearError();
  hideStatusBox();
  document.getElementById('pact-id').addEventListener(
    'input',
    async function (event) {
      State.requestKey = event.target.value;
      clearAll();
      try {
        if (complete()) {
          await getPact();
          await getProof();
          await fetchInfo();
          await completeSigData();
        } else {
          document
            .getElementById('pact-message')
            .setAttribute('class', 'ui compact message hidden');
        }
      } catch (err) {
        console.log(err);
        setError(err);
      }

      setUrlParam('requestKey', event.target.value);
    },
    false,
  );
}

function onInputGasLimit(e) {
  e.preventDefault();
  clearError();
  State.gasLimit = e.target.value;
}

function onInputGasPrice(e) {
  e.preventDefault();
  clearError();
  State.gasPrice = e.target.value;
}

async function getCoinDetailsOfGasPayer() {
  State.gasPayerAccountDetails = await getCoinDetails(State.gasPayer);
}

function isAccountEligibleForGasPayment() {
  if (State.gasPayerAccountDetails.result.status === 'failure') {
    // an error occurrred
    if (
      State.gasPayerAccountDetails.result.error.message.includes(
        'row not found',
      )
    ) {
      setError(
        `Account ${State.gasPayer} does not exist yet on the target chain (${State.targetChainId})`,
      );
    }

    return false;
  }

  const isGasStation = window.isGasStation(State.gasPayerAccountDetails);
  const isBalanceSufficient = window.isBalanceSufficient(
    State.gasPrice,
    State.gasLimit,
    State.gasPayerAccountDetails,
  );
  const isSingleSig = window.isSingleSig(State.gasPayerAccountDetails);

  if (isGasStation && isBalanceSufficient) {
    return true;
  } else if (!isGasStation && isBalanceSufficient && isSingleSig) {
    return true;
  } else {
    // error state
    if (!isBalanceSufficient) {
      setError(
        `Balance of ${State.sender} is not sufficient ${State.gasPayerAccountDetails.result.data.balance}`,
      );
    } else if (!isSingleSig) {
      setError(
        `Account ${State.sender} requires multiple signatures which is currently not supported from this tool`,
      );
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}

// INITIATION FUNCTIONS
window.addEventListener(
  'load',
  async function () {
    fillNetworkIdFromQueryString();
    fillRequestKeyFromQueryString();

    State.server = State.server ? State.server : 'api.chainweb.com';
    State.networkId = State.networkId ? State.networkId : 'mainnet01';
    State.requestKey = State.requestKey ? State.requestKey : '';
    State.gasPayer = State.gasPayer ? State.gasPayer : 'kadena-xchain-gas';

    validateServer();
    validatePact();
    await getPact();
    await getProof();
    await fetchInfo();
    await completeSigData();
    document.getElementById('submit-button').addEventListener(
      'click',
      async function (event) {
        event.preventDefault();
        finishXChain();
      },
      false,
    );
    document.getElementById('listen-button').addEventListener(
      'click',
      async function (event) {
        event.preventDefault();
        listen();
      },
      false,
    );

    document.getElementById('gas-payer').addEventListener('blur', async e => {
      State.gasPayer = e.target.value;
      validateGasPayer();
      await getProof();
      await fetchInfo();
      await completeSigData();
    });

    [
      document.getElementById('gas-limit'),
      document.getElementById('gas-price'),
    ].forEach(e => {
      e.addEventListener('blur', e => {
        fetchInfo();
      });
    });

    document.getElementById('click-to-copy').addEventListener('click', e => {
      e.preventDefault();
      const clickToCopyElement = e.target;
      const textArea = document.getElementById('sig-data');

      // Select the text field
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices

      // Copy the text inside the text field
      navigator.clipboard.writeText(textArea.value);
      clickToCopyElement.classList.remove('td-underline');
      clickToCopyElement.innerText = 'Copied!';
      setTimeout(() => {
        clickToCopyElement.innerText = 'Click To Copy';
        clickToCopyElement.classList.add('td-underline');
      }, 1000);
    });

    document
      .getElementById('gas-price')
      .addEventListener('input', onInputGasPrice);

    document
      .getElementById('gas-limit')
      .addEventListener('input', onInputGasLimit);
  },

  false,
);

async function checkTransaction() {
  try {
    if (!State.targetChainId) {
      throw Error('Request Key is not a cross chain Transaction');
    }
    if (!State.gasPayerAccountDetails.result.status) {
      throw Error(JSON.stringify(State.gasPayerAccountDetails));
    }
    if (!State.proof) {
      getProof();
      throw Error('Waiting for Proof...');
    }
    return true;
  } catch (e) {
    setError(e);
  }
}

async function fetchInfo() {
  await validateGasPayer();
  await completeSigData();
}

async function validateGasPayer() {
  await getCoinDetailsOfGasPayer();
  clearError();
  if (isAccountEligibleForGasPayment()) {
    if (window.isGasStation(State.gasPayerAccountDetails)) {
      hideSigData();
    } else {
      if (checkTransaction()) {
        showSigData();
      }
    }
  }
}

function hideSigData() {
  const sigDataMessage = document.getElementById('sig-data-message');
  const signedTransactionWrapper = document.getElementById(
    'signed-transaction-wrapper',
  );
  const signedTransaction = document.getElementById('signed-transaction');
  sigDataMessage.classList.add('hidden');
  signedTransactionWrapper.classList.add('hidden');
  signedTransaction.value = '';
  clearError();
}

function showSigData() {
  const sigDataMessage = document.getElementById('sig-data-message');
  const signedTransactionWrapper = document.getElementById(
    'signed-transaction-wrapper',
  );
  sigDataMessage.classList.remove('hidden');
  signedTransactionWrapper.classList.remove('hidden');
}

async function completeSigData() {
  try {
    await checkTransaction();
    if (isAccountEligibleForGasPayment()) {
      if (window.isGasStation(State.gasPayerAccountDetails)) enableSubmit();
      else {
        enableSubmit();
        await fillSigData();
      }
    }
  } catch (e) {
    setError(e);
  }
}

async function fillSigData() {
  const m = Pact.lang.mkMeta(
    State.gasPayer,
    State.targetChainId,
    State.gasPrice,
    State.gasLimit,
    createTime(),
    28800,
  );

  const keys = new Keys().add(
      window.getGasPayerPublicKey(State.gasPayerAccountDetails),
      'coin.GAS',
    ),
    c = Pact.simple.cont.createCommand(
      keys,
      `transfer.chainweb ${State.requestKey} ${new Date().toLocaleString()}`,
      1,
      State.pactId,
      false,
      undefined,
      m,
      State.proof,
      State.networkId,
    ).cmds[0];

  c.sigs = keys.getSigsObject();
  setTimeout(() => setSigData(JSON.stringify(c, null, 2)));
}

function isGasStation(res) {
  return JSON.stringify(res.result.data?.guard).includes('gas-only');
}

function isBalanceSufficient(gasPrice, gasLimit, res) {
  try {
    return gasPrice * gasLimit <= res.result.data.balance;
  } catch (error) {
    return false;
  }
}

function isSingleSig(res) {
  try {
    if (Array.isArray(res.result.data.guard)) {
      return (
        res.result.data.guard.filter(g => g.keys && g.keys.length > 1).length >
        0
      );
    } else {
      return res.result.data.guard.keys.length === 1;
    }
  } catch (e) {
    return false;
  }
}

function getGasPayerPublicKey(res) {
  return res.result.data?.guard.keys[0];
}
/**
 * Retreive information on gas-payer-account
 *
 * @param {*} account account to retreive information on
 */
function getCoinDetails(account) {
  return Pact.fetch
    .local(
      {
        type: 'exec',
        pactCode: `(coin.details "${account}")`,
        nonce: new Date().getTime().toString(),
        meta: Pact.lang.mkMeta(
          account,
          State.targetChainId,
          0.00000001,
          750,
          new Date().getTime(),
          300,
        ),
      },
      State.targetHost,
    )
    .catch(e => {
      throw e;
    });
}

/**
 * Utility class that can be used to create Signers element
 *
 * @class Keys
 * @extends {Array}
 */
class Keys extends Array {
  /**
    [
      {
        publicKey: "keyblaablabala",
        clist: [{ name: 'coin.GAS', args: [] }],
      },
    ],
   */

  add(publicKey, name, args = []) {
    const foundKey = this.find(k => k.publicKey === publicKey);
    if (foundKey) {
      if (name) {
        const foundScope = foundKey.clist.find(c => c.name === name);
        if (foundScope) {
          foundScope.args = args;
        } else {
          foundKey.clist.push({ name, args });
        }
      }
    } else {
      if (name) {
        this.push({ publicKey, clist: [{ name, args }] });
      } else {
        this.push({ publicKey });
      }
    }
    return this;
  }

  getKeys() {
    return this.map(k => k.publicKey);
  }

  getSigsObject() {
    return this.reduce((acc, { publicKey }) => {
      return { ...acc, [publicKey]: null };
    }, {});
  }
}

function makeRawRequestInit(stringBody) {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: stringBody,
  };
}

function fillNetworkIdFromQueryString() {
  const network = getParameterByName('network');
  if (network) {
    document.getElementById('server').value = network;
    State.server = network;
  }
}

function fillRequestKeyFromQueryString() {
  const requestKey = getParameterByName('requestKey');
  if (requestKey) {
    document.getElementById('pact-id').value = requestKey;
    State.requestKey = requestKey;
  }
}

function getParameterByName(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function setUrlParam(key, value) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(key, value);
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}?${urlParams}`,
  );
}
