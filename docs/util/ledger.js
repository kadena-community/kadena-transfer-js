function showAccordion(node) {
    const title = node.querySelector('& > .title')
    const content = node.querySelector('& > .content')
    if (title) {
        title.classList.add('active');
    }
    if (content) {
        content.classList.add('active');
    }
}

function hideAccordion(node) {
    const title = node.querySelector('& > .title')
    const content = node.querySelector('& > .content')
    if (title) {
        title.classList.remove('active');
    }
    if (content) {
        content.classList.remove('active');
    }
}

async function onLoadDerivationMode() {
    const { legacyDerivationMode } = getInputs();
    if (legacyDerivationMode) {
        const outer = document.getElementById('getPubkey-button');
        const inner = document.getElementById('showDerivationOption-button');
        showAccordion(outer.parentNode);
        showAccordion(inner.parentNode);
        updateDerivationButton();
        await getPublicKeyFromLedger();
    }
}

function getLegacyDerivationModeFromLocation() {
    return new URLSearchParams(window.location.search).get("derivation") === 'legacy';
}

function updateDerivationButton() {
    const { legacyDerivationMode } = getInputs();
    const btn = document.getElementById('legacyDerivation-btn');
    if (legacyDerivationMode) {
        btn.classList.add('orange');
        btn.innerText = 'Legacy mode ON'
    } else {
        btn.classList.remove('orange');
        btn.innerText = 'Legacy mode OFF'
    }
}

async function switchDerivationMode() {
    const { legacyDerivationMode } = getInputs();
    const location = new URL(window.location.href);
    if (!legacyDerivationMode) {
        location.searchParams.set('derivation', 'legacy');
    } else {
        location.searchParams.delete('derivation');
    }
    if (location.toString() !== window.location.href) {
        window.history.pushState(null, null, location.toString());
    }
    updateDerivationButton();
    await getPublicKeyFromLedger();
}

async function getLedger() {
    if (!window.ledger) {
        var transp = await window.TranspWeb.create();
        window.ledger = new window.Kadena(transp);
    }
}

const BIP32_PATH_PREFIX = "";
function getPath() {
    const { keyId, legacyDerivationMode } = getInputs();
    if (legacyDerivationMode) {
        return `m/44'/626'/0'/0/${keyId}`;
    }
    return `m/44'/626'/${keyId}'`;
}

function bufferToHex (buffer) {
    return [...new Uint8Array (buffer)]
        .map (b => b.toString (16).padStart (2, "0"))
        .join ("");
}

async function getPublicKeyFromLedger(){
    dimBody("Waiting for ledger public key");
    setPublicKey('');
    setStatus('Loading');
    await getLedger();
    try {
        var publicKey = bufferToHex((await window.ledger.getPublicKey(getPath())).publicKey);
        setPublicKey(publicKey);
        setStatus();
    } catch (e) {
        setStatus('Error: '+e.message);
        setError("Could not get the Ledger Account " + e.message)
    }
    $("body").dimmer("hide");
}

async function verifyAddressOnLedger(){
    await getLedger();
    try {
        var path = getPath();
        var publicKey = bufferToHex((await window.ledger.verifyAddress(path)).publicKey);
        setPublicKey(publicKey);
    } catch (e) {
        console.error(e);
        setError("Could not get the Ledger Account "+e.message);
    }
}

function renderLedgerAccountChangeModal(elemId = 'change-ledger-key-accordion') {
    document.getElementById(elemId).innerHTML = `
        <div class="title" id="getPubkey-button">
          <i class="dropdown icon"></i>
          Change/Verify Ledger Account
        </div>
        <div class="content" id="getPubkey-content">
          <div class="ui message" style="margin-bottom:10px">
            <div>
              <div id="keyIdDropdown" class="ui floating small dropdown labeled search icon button">
                <input type="hidden" id="keyId" value="0" />
                <i class="key icon"></i>
                <div class="text">0</div>
                <div class="menu" id="ledger-key-menu">
                </div>
              </div>
              <i style="margin-right: -20px; margin-left: 5px" class="info icon small popup-target" data-content="Change ledger key. If unsure, leave the default (zero)."></i>
            </div>

            <p style="font-weight:bold;" id="fromAccount"></p>
            <p style="font-weight:bold;" id="status"></p>

            <div class="ui button" id="verifyAddress-button">
              <i class="eye icon"></i>
              <span>Verify</span>
            </div>

            <div class="ui accordion">
              <div class="title" id="showDerivationOption-button">
                <i class="dropdown icon"></i>
                Not the account you were expecting?
              </div>
              <div class="content" id="showDerivationOption-button">
                <div class="ui message">
                  <p>The first iteration of this tool derived account keys differently.</p>
                  <p><strong>If you used this tool to access accounts in October 2023:</strong></p>
                  <p>You can enable <strong>Legacy mode</strong> which will allow you to access your keys.</p>
                  <p><i>Note: The default (zero) account is not affected by this change.</i></p>
                  <button class="ui button" id="legacyDerivation-btn">Legacy mode OFF</button>
                </div>
              </div>
            </div>

          </div>
        </div>`;
}

window.addEventListener('load', function (event) {
    renderLedgerAccountChangeModal();

    let prevTimeout;
    document.getElementById("keyIdDropdown").addEventListener("change", async function(e){
        // debounce - when typing we sometimes get multiple triggers
        if (prevTimeout)
            clearTimeout(prevTimeout);
        prevTimeout = setTimeout(() => {
            prevTimeout = null;
            getPublicKeyFromLedger()
        }, 200);
    });

    document.getElementById("getSig-button").addEventListener("click", async function(e){
        dimBody("Waiting for ledger signature");
        await signWithLedger();
        $("body").dimmer("hide");
    });

    document.getElementById("getPubkey-button").addEventListener("click", async function(e){
        const content = document.getElementById("getPubkey-content");
        if (content.classList.contains('active')) {
            hideAccordion(content.parentNode);
        } else {
            showAccordion(content.parentNode);
            await getPublicKeyFromLedger();
        }
    })

    document.getElementById("verifyAddress-button").addEventListener("click", async function(e){
        // Dont dim, let the user see the address on web
        setStatus('Check your ledger to confirm your address');
        await verifyAddressOnLedger();
        setStatus('');
    })

    document.getElementById("showDerivationOption-button").addEventListener("click", async function(e){
        const content = document.getElementById("showDerivationOption-button");
        if (content.classList.contains('active')) {
            hideAccordion(content.parentNode);
        } else {
            showAccordion(content.parentNode);
        }
    })

    document.getElementById("legacyDerivation-btn").addEventListener("click", async function(e){
        switchDerivationMode();
    })

    if (navigator.userAgent.indexOf(' Firefox') > -1) {
        setError('It seems that you are using Firefox, which does not support the technology required to interact with a Ledger via this page. Try using a different browser.');
    }

    onLoadDerivationMode();

});
