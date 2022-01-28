const Kadena = require("hw-app-kda").default;
const SpeculosTransport = require("@ledgerhq/hw-transport-node-speculos").default;
const TranspWeb = require("@ledgerhq/hw-transport-webhid").default;
const WebUSB = require("@ledgerhq/hw-transport-webusb").default;

function load_modules(){
    window.Kadena = Kadena;
    window.SpeculosTransport = SpeculosTransport;  
    window.TranspWeb = TranspWeb;
    window.WebUSB = WebUSB;
}

load_modules();
