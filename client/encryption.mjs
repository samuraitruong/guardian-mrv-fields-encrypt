import crypto from "crypto";

const algorithm = "aes-256-ctr";
let key = "MySuperSecretKey";

key = crypto
  .createHash("sha256")
  .update(String(key))
  .digest("base64")
  .substr(0, 32);

export const encrypt = (stringInput) => {
  console.log("Encrypting content...");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const result = Buffer.concat([
    iv,
    cipher.update(Buffer.from(stringInput)),
    cipher.final(),
  ]);
  return result.toString("base64");
};

export const decrypt = (encryptedText) => {
  console.log("Decrypting content");
  const encrypted = Buffer.from(encryptedText);
  const iv = encrypted.slice(0, 16);
  encrypted = encrypted.slice(16);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return result;
};
