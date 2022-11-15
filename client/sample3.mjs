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
      try {
        // Encrypt reading value with our encryption method
        console.log(json?.credentialSubject?.[0]);
        if (
          json?.credentialSubject?.[0]?.readingValue &&
          json?.credentialSubject?.[0]?.__sensitiveFields
        ) {
          for (const fieldName of json?.credentialSubject?.[0]
            ?.__sensitiveFields) {
            const originalValue = json?.credentialSubject?.[0][fieldName];
            if (originalValue) {
              const encryptedValue = encrypt(originalValue.toString());

              console.log(
                "Field encrypt %s from %s to be %s",
                fieldName,
                originalValue,
                encryptedValue
              );
              json.credentialSubject[0][fieldName] = encryptedValue;
            }
          }
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
