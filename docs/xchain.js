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
  const pact = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
  ].reduce(async (arr, chainId) => {
    arr = await arr;
    const host = `https://${server}/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
    const pactInfo = await Pact.fetch.poll({ requestKeys: [pactId] }, host);
    if (pactInfo[pactId]) {
      arr.push({ chainId: chainId, tx: pactInfo[pactId] });
    }
    return arr;
  }, []);
  return pact;
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

class State {
  /**
   *  e.g. api.testnet.chainweb.com
   */
  static set server(value) {
    document.getElementById('server').value = value;
    window.localStorage.setItem('xchain-server', value);
  }
  static get server() {
    const ls = window.localStorage.getItem('xchain-server');
    if (ls && ls.length > 0) {
      return ls;
    }

    return document.getElementById('server').value;
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
    const ls = window.localStorage.getItem('xchain-networkId');
    if (ls && ls.length > 0) {
      return ls;
    }

    return document.getElementById('networkId').textContent;
  }

  static set requestKey(value) {
    window.localStorage.setItem('xchain-requestKey', value);
    document.getElementById('pact-id').value = value;
  }

  static get requestKey() {
    const ls = window.localStorage.getItem('xchain-requestKey');
    if (ls && ls.length > 0) {
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
}

var getProof = async function () {
  const targetChainId = State.targetChainId;
  const pactId = State.pactId;
  const spvCmd = { targetChainId: targetChainId, requestKey: pactId };
  const host = `https://${State.server}/chainweb/0.0/${State.networkId}/chain/${State.sourceChainId}/pact`;
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
    const proof = await getProof();
    const targetChainId = State.targetChainId;
    let requestKey = State.requestKey;
    const pactId = State.pactId;
    const server = State.server;
    const networkId = State.networkId;
    const host = `https://${server}/chainweb/0.0/${networkId}/chain/${targetChainId}/pact`;
    const gasStation = 'kadena-xchain-gas';
    const gasLimit = 750;
    const gasPrice = 0.00000001;
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
        if (val !== null && val !== '') {
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
    function onInputPactId() {
      return function (event) {
        State.requestKey = event.target.value;
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
      };
    },
    false
  );
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
  },
  false
);

/**
 * Retreive information on gas-payer-account
 *
 * @param {*} account account to retreive information on
 */
function getCoinDetails(account, chainId) {
  return Pact.fetch
    .local({
      type: 'exec',
      pactCode: `(coin.details "${account}")`,
      nonce: new Date().getTime().toString(),
      meta: Pact.lang.mkMeta(
        account,
        chainId,
        0.00000001,
        750,
        new Date().getTime(),
        300
      ),
    })
    .catch((e) => {
      throw e;
    });
}
