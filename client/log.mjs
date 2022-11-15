import { StringCodec } from "nats";

export function logMessage(nc, topic) {
  const sc = StringCodec();
  const sub = nc.subscribe(topic);
  console.log("subscribed", topic);
  (async () => {
    for await (const m of sub) {
      const messageId = m.headers.get("messageId");
      const data = JSON.parse(sc.decode(m.data));

      console.log("message", messageId, data);
    }
  })();
}
