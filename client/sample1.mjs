import { connect, headers, StringCodec } from "nats";
const options = { servers: ["localhost:4222"] };

(async () => {
  const nc = await connect(options);
  console.log(`connected to ${nc.getServer()}`);
  const sc = StringCodec();
  const sub = nc.subscribe("external-events.ipfs_before_upload_content");

  (async () => {
    for await (const m of sub) {
      const messageId = m.headers.get("messageId");
      const data = JSON.parse(sc.decode(m.data));
      const content = Buffer.from(data.content, "base64");
      const json = JSON.parse(content.toString());
      console.log("JSON", json);
      const head = headers();
      head.append("messageId", messageId);
      await nc.publish(
        "response-message",
        sc.encode(JSON.stringify({ body: content.toString("base64") })),
        {
          headers: head,
        }
      );
    }
  })();
})();
