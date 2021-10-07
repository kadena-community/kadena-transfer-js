import SpeculosTransport from "@ledgerhq/hw-transport-node-speculos";

import Kadena from "@ledgerhq/hw-app-kda";

const apduPort = 8888;

const runTest = async () => {
  const transport = await SpeculosTransport.default.open({apduPort});
  const kadena = new Kadena.default(transport);

  const result = await kadena.signHash("", "E6shRPKxtsnw61s0yi26Qfx5mqosQuAJAL-Swq54CQI");

  console.log(result);
};

runTest().then(() => console.log("Test complete")).catch(err => console.log("Failure: ", err));
