import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import Kadena from "@ledgerhq/hw-app-kda";

export default async function (thingToSign) {
  const transport = await TransportWebHID.default.request();
  const kadena = new Kadena.default(transport);

  const result = await kadena.signHash("", thingToSign);
  console.log("Sign result: ", result);

  return result;
};
