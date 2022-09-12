//UTILITY FUNCTIONS
const mkReq = (cmd) => {
  return {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(cmd),
  };
};

const is_hexadecimal = (str) => {
  const regexp = /^[0-9a-fA-F]+$/;
  if (regexp.test(str)) return true;
  else return false;
};

const convertDecimal = (decimal) => {
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

const checkKey = (key) => {
  if (key.length !== 64) {
    throw 'Key does not have length of 64';
  } else if (!is_hexadecimal(key)) {
    throw 'Key is not hex string';
  }
  return true;
};

const checkSecretKey = (key) => {
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
    .then((networkId) => {
      document.getElementById('networkId').classList.remove('red');
      document.getElementById('networkId').textContent = networkId;
      State.networkId = networkId;
    })
    .catch((e) => {
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
    cmd.networkId
  );
  const txRes = await fetch(`${apiHost}/api/v1/send`, mkReq(c));
  return txRes;
};

async function findSrcChain() {
  const pactId = State.pactId;
  const server = State.server;
  const networkId = State.networkId;
  console.log(networkId);
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
      enableSubmit();
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
    window.localStorage.setItem('xchain-requestKey', value);
    document.getElementById('pact-id').value = value;
  }

  static get requestKey() {
    const ls = getIfSetLocalStorage('xchain-requestKey');
    if (ls) {
      return ls;
    }

    const requestKey = document.getElementById('pact-id').value.trim();
    window.localStorage.setItem('xchain-requestKey', requestKey);
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
  static get sender() {
    return document.getElementById('sender').textContent;
  }

  /**
   * example: sender
   */
  static set sender(value) {
    document.getElementById('sender').textContent = value;
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
}

var getProof = async function () {
  const targetChainId = State.targetChainId;
  const pactId = State.pactId;
  const spvCmd = { targetChainId: targetChainId, requestKey: pactId };
  const host = State.sourceHost;
  try {
    const res = await fetch(`${host}/spv`, mkReq(spvCmd));
    let foo = await res;
    if (foo.ok) {
      const proof = await res.json();
      return proof;
    } else {
      const proof = await res.text();
      //Initial Step is not confirmed yet.
      throw proof;
    }
  } catch (e) {
    throw 'Initial transfer is not confirmed yet. Please wait and try again.';
  }
};

const handleResult = async function (res) {
  foo = await res;
  hideSpinner();
  if (foo.ok) {
    showStatusBox();
    j = await res.json();
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
      `https://${State.server}/chainweb/0.0/${State.networkId}/chain/${State.targetChainId}/pact`
    )
    .then((res) => {
      console.log(res);
      if (res.result.status === 'success') {
        document.getElementById('status-message').textContent =
          'TRANSFER SUCCEEDED';
        document.getElementById('status-error').textContent = '';
        window.localStorage.removeItem('xchain-requestKey');
        window.localStorage.removeItem('xchain-server');
      } else {
        document.getElementById('status-message').textContent =
          'TRANSFER FAILED with error';
        document.getElementById('status-error').textContent = JSON.stringify(
          res.result.error.message
        );
      }
    });
}

async function finishXChain() {
  disableSubmit();
  try {
    let proof;
    if (!window.proof) {
      proof = await getProof();
    }
    const targetChainId = State.targetChainId;
    const pactId = State.pactId;
    const networkId = State.networkId;
    const host = State.targetHost;
    const gasStation = State.gasPayer;
    const gasLimit = State.gasLimit;
    const gasPrice = State.gasPrice;
    const m = Pact.lang.mkMeta(
      gasStation,
      targetChainId,
      gasPrice,
      gasLimit,
      createTime(),
      28800
    );
    const contCmd = {
      type: 'cont',
      keyPairs: [],
      pactId: pactId,
      rollback: false,
      step: 1,
      meta: m,
      proof: proof,
      networkId: networkId,
    };
    try {
      const result = await sendNonJson(contCmd, host);
      handleResult(result);
      document.getElementById('result-message').textContent =
        JSON.stringify(result);
    } catch (e) {
      setError(e);
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
  document.getElementById('kadena-form').setAttribute('class', 'ui form');
}

function setError(msg) {
  document.getElementById('acct-err').innerText = msg;
  document.getElementById('kadena-form').setAttribute('class', 'ui form error');
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
          delete window.proof;
          State.server = val;
          verifyNode(val).then(() => {
            if (complete()) {
              State.server = val;
              getPact();
            } else {
              document
                .getElementById('pact-message')
                .setAttribute('class', 'ui compact message hidden');
            }
          });
        }
      } catch (err) {
        console.log(err);
        disableSubmit();
        setError(err);
      }
    },
    false
  );
}

function validatePact() {
  clearError();
  hideStatusBox();
  document.getElementById('pact-id').addEventListener(
    'input',
    function (event) {
      State.requestKey = event.target.value;
      delete window.proof;
      try {
        if (complete()) {
          getPact();
        } else {
          document
            .getElementById('pact-message')
            .setAttribute('class', 'ui compact message hidden');
        }
      } catch (err) {
        console.log(err);
        disableSubmit();
        setError(err);
      }
    },
    false
  );
}

function onInputGasLimit(e) {
  e.preventDefault();
  State.gasLimit = e.target.value;
}

function onInputGasPrice(e) {
  e.preventDefault();
  State.gasPrice = e.target.value;
}

async function getCoinDetailsOfGasPayer(e) {
  e.preventDefault();
  State.gasPayerAccountDetails = await getCoinDetails(State.gasPayer);
}

function isAccountEligibleForGasPayment() {
  if (State.gasPayerAccountDetails.result.status === 'failure') {
    // an error occurrred
    if (
      State.gasPayerAccountDetails.result.error.message.includes(
        'row not found'
      )
    ) {
      setError(
        `Account ${State.gasPayer} does not exist yet on the target chain (${State.targetChainId})`
      );
    }

    return false;
  }

  const isGasStation = window.isGasStation(State.gasPayerAccountDetails);
  const isBalanceSufficient = window.isBalanceSufficient(
    State.gasPrice,
    State.gasLimit,
    State.gasPayerAccountDetails
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
        `Balance of ${State.sender} is not sufficient ${State.gasPayerAccountDetails.result.data.balance}`
      );
    } else if (!isSingleSig) {
      setError(
        `Account ${State.sender} requires multiple signatures which is currently not supported from this tool`
      );
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}

// INITIATION FUNCTIONS
window.addEventListener(
  'load',
  function (event) {
    State.server = State.server ? State.server : 'api.chainweb.com';
    State.networkId = State.networkId ? State.networkId : 'mainnet01';
    State.requestKey = State.requestKey ? State.requestKey : '';
    if (State.requestKey && State.requestKey.length > 0) {
      getPact();
    }
    validateServer();
    validatePact();
    document.getElementById('submit-button').addEventListener(
      'click',
      async function (event) {
        event.preventDefault();
        finishXChain();
      },
      false
    );
    document.getElementById('listen-button').addEventListener(
      'click',
      async function (event) {
        event.preventDefault();
        listen();
      },
      false
    );

    document.getElementById('gas-payer').addEventListener('blur', async (e) => {
      await getCoinDetailsOfGasPayer(e);
      if (isAccountEligibleForGasPayment()) {
        const sigDataMessage = document.getElementById('sig-data-message');
        if (window.isGasStation(State.gasPayerAccountDetails)) {
          sigDataMessage.classList.add('hidden');
        } else {
          sigDataMessage.classList.remove('hidden');
          const sigDataTextarea = document.getElementById('sig-data');
          sigDataTextarea.value = ``;
        }
      }
    });

    [
      document.getElementById('gas-payer'),
      document.getElementById('gas-limit'),
      document.getElementById('gas-price'),
    ].forEach((e) => {
      e.addEventListener('blur', (e) => {
        fillSigData();
      });
    });

    document.getElementById('click-to-copy').addEventListener('click', (e) => {
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

  false
);

async function fillSigData() {
  if (!window.proof) {
    window.proof = await getProof();
  }
  const pactId = State.pactId;
  const networkId = State.networkId;

  const m = Pact.lang.mkMeta(
    State.gasPayer,
    State.targetChainId,
    State.gasPrice,
    State.gasLimit,
    createTime(),
    28800
  );

  c = Pact.simple.cont.createCommand(
    [{ publicKey: State.sender.split(':')[1] }],
    `transfer.chainweb ${State.requestKey} ${new Date().toLocaleString()}`,
    1,
    pactId,
    false,
    undefined,
    m,
    proof,
    networkId
  ).cmds[0];

  c.sigs = {
    [State.sender]: null,
  };

  setTimeout(
    () =>
      (document.getElementById('sig-data').value = JSON.stringify(c, null, 2))
  );
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
    return (
      res.result.data.guard.filter((g) => g.keys && g.keys.length === 1)
        .length > 0
    );
  } catch (e) {
    return false;
  }
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
          300
        ),
      },
      State.targetHost
    )
    .catch((e) => {
      throw e;
    });
}
