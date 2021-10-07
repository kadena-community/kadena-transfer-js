import SpeculosTransport from "@ledgerhq/hw-transport-node-speculos";
import Kadena from "@ledgerhq/hw-app-kda";

const apduPort = 8888;

export default async function (thingToSign) {
  const transport = await SpeculosTransport.default.open({apduPort});
  const kadena = new Kadena.default(transport);

  const result = await kadena.signHash("", thingToSign);
  console.log(result);

  return result;
}
