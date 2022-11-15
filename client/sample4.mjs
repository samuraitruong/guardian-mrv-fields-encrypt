import { connect, headers, StringCodec } from "nats";
import { encrypt } from "./encryption.mjs";
import { logMessage } from "./log.mjs";

const options = { servers: ["localhost:4222"] };

(async () => {
  const nc = await connect(options);
  console.log(`connected to ${nc.getServer()}`);
  const sc = StringCodec();
  logMessage(nc, "external-events.ipfs_added_file");

  const sub = nc.subscribe("external-events.ipfs_before_upload_content");
  (async () => {
    for await (const m of sub) {
      const messageId = m.headers.get("messageId");
      const data = JSON.parse(sc.decode(m.data));
      const content = Buffer.from(data.content, "base64");
      const json = JSON.parse(content.toString());
      const encryptObject = (obj) => {
        if (!obj) return;

        if (obj.__sensitiveFields) {
          for (const fieldName of obj.__sensitiveFields) {
            const originalValue = obj[fieldName];
            if (originalValue) {
              const encryptedValue = encrypt(originalValue.toString());

              console.log(
                "Field encrypt %s from %s to be %s",
                fieldName,
                originalValue,
                encryptedValue
              );
              obj[fieldName] = encryptedValue;
            }
          }
        }
      };
      try {
        if (
          Array.isArray(json.type) &&
          json.type.includes("VerifiableCredential")
        ) {
          encryptObject(json?.credentialSubject?.[0]);
        }

        if (
          Array.isArray(json.type) &&
          json.type.includes("VerifiablePresentation")
        ) {
          // Loop throught all the VC and encrypt the field
          console.log;
          json.verifiableCredential.forEach((vc) =>
            encryptObject(vc.credentialSubject[0])
          );
        }
      } catch (err) {
        console.log(err);
      }

      const head = headers();
      head.append("messageId", messageId);

      await nc.publish(
        "response-message",
        sc.encode(
          JSON.stringify({
            body: Buffer.from(JSON.stringify(json)).toString("base64"),
          })
        ),
        {
          headers: head,
        }
      );
    }
  })();
})();
