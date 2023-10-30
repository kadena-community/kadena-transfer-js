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
    const legacyDerivationMode = getLegacyDerivationModeFromLocation();
    if (legacyDerivationMode) {
        const outer = document.getElementById('getPubkey-button');
        if (outer)
            showAccordion(outer.parentNode);
        const inner = document.getElementById('showDerivationOption-button');
        if (inner)
            showAccordion(inner.parentNode);
        updateDerivationButton();
        await getPublicKeyFromLedger();
    }
}

function getLegacyDerivationModeFromLocation() {
    return new URLSearchParams(window.location.search).get("derivation") === 'legacy';
}

function updateDerivationButton() {
    const legacyDerivationMode = getLegacyDerivationModeFromLocation();
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
    const legacyDerivationMode = getLegacyDerivationModeFromLocation();
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
    // transfer/signing page
    if (window.dimBody) {
        await getPublicKeyFromLedger();
    }
    // search page
    if (window.stopSearch) {
        stopSearch('all');
    }
}

async function getLedger() {
    if (!window.ledger) {
        var transp = await window.TranspWeb.create();
        window.ledger = new window.Kadena(transp);
    }
}

function getPath(explicitKeyId) {
    // explicit used by search, transfer/sign have inputs
    const keyId = explicitKeyId !== undefined ? explicitKeyId : getInputs().keyId;
    const legacyDerivationMode = getLegacyDerivationModeFromLocation();
    if (legacyDerivationMode) {
        return `m/44'/626'/0'/0/${keyId}`;
    }
    return `m/44'/626'/${keyId}'/0/0`;
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
    const elem = document.getElementById(elemId);
    if (!elem) {
        return;
    }
    elem.innerHTML = `
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
              <i style="margin-right: -20px; margin-left: 5px" class="info icon small popup-target" data-content="Change ledger key. You can use any number (beyond the pre-defined 100). If unsure, leave the default (zero)."></i>
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
                  <p>Key derivation has changed since the first version of this tool.</p>
                  <p><strong>If you used this tool to access accounts in October 2023:</strong></p>
                  <p>You can enable <strong>Legacy mode</strong> which will allow you to access your keys.</p>
                  <p><i>Note: The default (zero) account is not affected by this change.</i></p>
                  <button type="button" class="ui button" id="legacyDerivation-btn">Legacy mode OFF</button>
                </div>
              </div>
            </div>

          </div>
        </div>`;
}

function addEventListenerMaybe(elementId, eventName, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        element.addEventListener(eventName, callback);
    }
}

window.addEventListener('load', function (event) {
    renderLedgerAccountChangeModal();

    let prevTimeout;
    addEventListenerMaybe("keyIdDropdown", "change", async function(e){
        // debounce - when typing we sometimes get multiple triggers
        if (prevTimeout)
            clearTimeout(prevTimeout);
        prevTimeout = setTimeout(() => {
            prevTimeout = null;
            getPublicKeyFromLedger()
        }, 200);
    });

    addEventListenerMaybe("getSig-button", "click", async function(e){
        dimBody("Waiting for ledger signature");
        await signWithLedger();
        $("body").dimmer("hide");
    });

    addEventListenerMaybe("getPubkey-button", "click", async function(e){
        const content = document.getElementById("getPubkey-content");
        if (content.classList.contains('active')) {
            hideAccordion(content.parentNode);
        } else {
            showAccordion(content.parentNode);
            await getPublicKeyFromLedger();
        }
    });

    addEventListenerMaybe("verifyAddress-button", "click", async function(e){
        // Dont dim, let the user see the address on web
        setStatus('Check your ledger to confirm your address');
        await verifyAddressOnLedger();
        setStatus('');
    });

    addEventListenerMaybe("showDerivationOption-button", "click", async function(e){
        const content = document.getElementById("showDerivationOption-button");
        if (content.classList.contains('active')) {
            hideAccordion(content.parentNode);
        } else {
            showAccordion(content.parentNode);
        }
    });

    addEventListenerMaybe("legacyDerivation-btn", "click", async function(e){
        switchDerivationMode();
    });

    if (navigator.userAgent.indexOf(' Firefox') > -1 && setError) {
        setError('It seems that you are using Firefox, which does not support the technology required to interact with a Ledger via this page. Try using a different browser.');
    }

    onLoadDerivationMode();

});

//Form Validation
$(document).ready(function(){

    // create 1000 entries under "ledger key"
    const m = $('#ledger-key-menu');
    if (m.length) {
        for(let i=0; i<100; i++) {
            m.append(`<div class="item" data-value="${i}">${i}</div>`);
        }
    }
    
    //Activate Ledger Dropdown
    $('.dropdown')
        .dropdown({ selectOnKeydown: false, allowAdditions: true, });

    $('.popup-target')
        .popup({ closable: false});

    $('.message .close')
        .on('click', function() {
            $(this)
                .closest('.message')
                .transition('fade')
            ;
        });
});

