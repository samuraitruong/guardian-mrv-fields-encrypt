# Protect sensitive information when public data on Hedera Blockchain with Guardian

## Blockchain is public
One of the best features of blockchain is publicity information, It means that all the information we send to the blockchain will be available to everyone. People can access your data from data on a chain in many different ways. When designing the blockchain solution we have to be very mindful of what data will need to be sent to the blockchain. However, When we develop any application we have to include some sensitive information so data can be audited and verifiable by other parties. The most simple solution to achieve this is using some form of hybrid encryption we display all the public information in the raw format and other sensitive data will be encrypted with the secret key. The 3rd party will be provided with the secret key and they can decode the encrypted information themselves.


## What is PII and how important
In short, Personally Identifiable Information (PII) is a legal term for information security environments. While PII has several formal definitions, generally speaking, it is information that can be used by organizations on its own or with other information to identify, contact, or locate a single person, or to identify an individual in context. 


However, PII maybe contains other information which can be used to identify a business behavior, it may result in some security contexts. Such as when we public the energy reading the attacker can sample the usage and timestamp to identify when tenancy has people occupy. from that context they can find the best time during the day that they can enter the tenancy.

Also, PII is any other information that clients want to hide from the public or at least don't want to be accessed by everyone.


## What is guardian
Guardian is an open source that helps you send your data into the public Hedera Blockchain without any required knowledge about blockchain development and integration. It provides you with the concept of drag & drop functionality to design the workflow (policy) then it will publish all of the relevant information to the blockchain. At Tymlez we develop Tokenize carbon data using Guardian and Hedera as the blockchain solution to capture and store client carbon data.

Read more about guardian here - https://docs.hedera.com/guardian/getting-started/readme

## Problem

As mentioned above, clients' data usually include a lot of PII  and one of our clients requested to hide the actual meter reading from the public data that we sending into the blockchain. However, Guardian hasn't had any built-in solution to this problem.  This may be a very common requirement because with the solution related to blockchain as we mentioned above everything is public but we want to keep some secrets only accessible by some trusted 3rd


## Solution

We come up with the solution that we will design the MRV to hold the reading data and public those data to the blockchain. The value of energy usage is included in the schema however the value will be encrypted by our secret key, The encryption key and the equivalent decryption function will provide to 3rd party to access the encrypted information. We implemented this solution as a generic solution that can be used flexibly by all of our clients. The client can choose which field they want to protect without changing anything in Guardian. TYmlez has prepared this solution a few months ago when we contributed the external events feature to Guardian project in this PR - https://github.com/hashgraph/guardian/pull/1065. 



Guardian has implemented some external events (https://docs.hedera.com/guardian/external-events/external-events). Please note that the document is not 100% work with the latest version of Guardian as the implementation of the message broker has changed in it was written. Please follow the below guide if you want to adopt a similar solution while waiting for the best solution built in by Hedera and Guardian.


### Setup guardian policy

Guardian is nothing but policy, The only interface to interact with blockchain is 'Policy'. We need a simple policy to test our solution. I have made a very simple policy to run through the solution. This policy includes: 


1 - Standard registry: Will approve the MRV submission, Only     MRV got approved will move to the next step (Aggregate) until reaches 1 ton for Token Minting 
2 - Project Owner: Will submit MRV data(in the real project we use our background job to submit data realtime using this Project Owner identity)

Our policy will mint 1 NFT token when carbon Offset reaches 1 TON, each MRV will include the reading value of electricity usage from grid and solar generation value and other information such as reading time, and meter identity ...

We need a running guardian stack to test this solution, You can follow Guardian document here (https://docs.hedera.com/guardian/getting-started/getting-started/installation). However, to make my life easier I have created the very simple docker-compose here to bootstrap the full guardian environment with just 1 single command. You can grab it from here(https://github.com/samuraitruong/hashgraph-guardian-docker-compose).


After the environment is up and running. You need to log in with Standard Registry account (using a default test account or set up a new account for yourself) and import the policy using timestamp `1668391988.728481003` and publish the policy(Alternatively, you can import using the policy file here). If you open the MRV schema, there is a special field name '__sensitiveFields' is an array of strings, we design that field for the Project Owner set which fields will be considered as sensitive information, and all of those field value will be encrypted by the custom code integration with guardian policy engines before uploading to IPFS


After the policy is published successfully, you need to log in as the Project Owner and go to Token and associated yourself with the token (name as Demo) below the above policy.  The standard registry later needs to grant KYC for the project owner on the same token.

Login with  Project Owner and open the policy, complete the setup step, we only design a very simple VC screen to capture just the name and email of the Project Owner.  The policy was designed with a screen that allows Project Owner manually enter MRV data. This button `Add MRV` can be accessed on MRV tab after opening the policy. If everything works correctly after you add some MRV and the aggregate value of `CO2Offset` reaches 1 (1 ton of CO2) and an NFT token (Demo Token) will be minted and appear in VP tab. At this point, MRV data will be uploaded to IPFS as raw values for both VC(MRV) and VP, which means that everyone can see your data on-chain and get the raw data from IPFS.


### Encrypt sensitive data.

As mentioned above in the solution, We will implement the Nats client to hook up to some events emitted by Guardian and modify content before it landed on the decentralized storage provider. I will start with the steps by steps code example so we can integrate and test to make sure everything works


To start up, we use the below code to hook up to the Nats server and respond to event `external-events.ipfs_before_upload_content`. In this example, we only hooked and return the same content to ipfs service.  There are 2 special notes in the nats event to make sure it works with a guardian
1. The ipfs message is a string of JSON stringify so you have to decode using StringCoded  and the content of the file is base64 encoded with the below format
   ```
    {
        content: 'base64 of file
    }
   ```
2. You have to publish the message back to the topic name `response-message` with messageId in the header match with the original messageId sent in the message header and the payload is a string of the below object
   ```
    { body: 'base64 of file content'}
   ```

Here is the basic example of a passthought IPFS file hook (sample1.mjs)
Now run the above code and submit the MRV from UI then approve it with Standard Registry account, If everything works correctly, you will see the json message of the VC printout in the console of the terminal running above code. At this point we did not change anything in the content, it simply just return the same content same to Guardian. We just need to verify that the custom hook-up works properly with Guardian file service.


Until now we have everything set up to implement the actual encryption function applies to readingValue field. Please have a look at the sample MRV file content below

```json
{
  id: 'f727c170-6383-49ac-9f98-551194a57d8f',
  type: [ 'VerifiableCredential' ],
  issuer: 'did:hedera:testnet:EFo1UcXQjcYuY2WExz8qMLVoGyJM3uJVEhdmzA8bJZRj;hedera:testnet:tid=0.0.48673640',
  issuanceDate: '2022-11-14T05:12:35.816Z',
  '@context': [ 'https://www.w3.org/2018/credentials/v1' ],
  credentialSubject: [
    {
      readingId: '1',
      readingValue: '1',
      readingDateTime: '2021-12-31T13:00:00.000Z',
      solarReading: 1,
      CO2Offset: 1,
      otherMRVData: [],
      __sensitiveFields: [],
      policyId: '6371a0470530b9364c8d5646',
      '@context': [Array],
      id: 'did:hedera:testnet:CGwUCEGdw6AXRdfmCbhHXCpH3yPWEGTqNpeeXCmcodkG;hedera:testnet:tid=0.0.48877308',
      type: '1421526c-e096-451b-8c2e-73e3b3954fad&1.0.0'
    }
  ],
  proof: {
    type: 'Ed25519Signature2018',
    created: '2022-11-14T05:12:35Z',
    verificationMethod: 'did:hedera:testnet:EFo1UcXQjcYuY2WExz8qMLVoGyJM3uJVEhdmzA8bJZRj;hedera:testnet:tid=0.0.48673640#did-root-key',
    proofPurpose: 'assertionMethod',
    jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..E7SSap5QHIZTm5w81_3Xgj6l6KuK3hmta0EZQMVoCECfTPTKDozTuliAhvFVJDmDeCy9rVdvij6gIkCFGA1ADg'
  }
}

```

In our solution, we will change readingValue to the secret value using any AES (aes-256-ctr) encryption. You can choose anything that works for you does not mater here, Below are  our super simple encryption function
```js
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
  return result.toString("base64);
};


```

We need to integrate with encrypt function above with the passthought code example above as below: (sample2.mjs)

```js
import { connect, headers, StringCodec } from "nats";
import { encrypt } from "./encryption.mjs";
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

      // Encrypt reading value with our encryption method
      json.credentialSubject[0].readingValue = encrypt(
        json.credentialSubject[0].readingValue
      );
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


```
To verify the encryption works properly we need to retrieve the IPFS file after Guardian upload them, we need to hook up to the event `external-events.ipfs_added_file` and print out the CID of the document. The below code will help you do that

```js
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

// Then add this into above example 

logMessage(nc, "external-events.ipfs_added_file");

```

Now run this hook and submit MRV by owner then approve it with a standard registry, you will see below logs printed out 

```js
message 544b308d-91a3-4dbf-95f6-f2c8cfb55f58 {
  cid: 'bafkreidv4xwiiipsaxnubxkvanhbq4ebdcdb33wcplijnsdbo6juiupwny',
  url: 'https://ipfs.io/ipfs/bafkreidv4xwiiipsaxnubxkvanhbq4ebdcdb33wcplijnsdbo6juiupwny'
}
```

If you open the above file, you can confirm the readingValue is encrypted

Note that with MRV chunking feature, there will be a few IPFS files for 1 VC transaction, make sure you open all the files in the logs and find the correct MRV vc file. also when you write your custom hooks, you only process the data you want and passthought all other data, this is important because any error inside your hook can result in Guardian policy being unuseable on UI. This is a very annoying issue and will be a problem in the production environment. If that happens accidentally in your development, you can delete the state in the database below the policy or republish the policy with a newer version and continue testing with the new policy.


So far, We have implemented the solution that encrypts 1 single field, we not uplift this solution to allow  Project Owner set sensitive fields to be encrypted when he enters the MRV from using. we add a special field name '__sensitiveFields' for this purpose. But before we test this we need to update our hook code as below (sample3.mjs)


```js
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


```

Test the MRV again, and this time we want to protect the readingValue and SolarValue, so when Project Owner submits MRV, he will add those 2 into the Sensitive Fields from the UI the MRV data will look like below (we designed the field as array so it a bit boring when we have to click and add the fields. You can choose to add the string with comma separated values):


```json

{
  readingId: '1',
  readingValue: '1',
  readingDateTime: '2021-12-31T13:00:00.000Z',
  solarReading: 1,
  CO2Offset: 1,
  otherMRVData: [],
  __sensitiveFields: [ 'readingValue', 'solarReading' ],
  policyId: '6372fb7ac3b46869718850c1',
  '@context': [
    'https://ipfs.io/ipfs/bafkreicenoaydy5ogzjiscibvu5i4vnyfbzty4gxw2ebti6nypc4tljyru'
  ],
  id: 'did:hedera:testnet:5dx8eXTWgbhnjWQkLe96d3oRPUwpV82jtFh7QmJKnYzx;hedera:testnet:tid=0.0.48889910',
  type: '1421526c-e096-451b-8c2e-73e3b3954fad&1.0.0'
}
```

This file will be encrypted and stored in IPFS with 2 field readingValue and solarReading is encrypted.  You can have a look here - https://ipfs.io/ipfs/bafkreid3fk444x5dyrr5fomedcjuncn3plnmnssku2lqchvupaamdw4sbe
as you see in the file above, the solarReading was a number but not it was changed to string as we store the encrypted content of anything as a string. This is one of the limitations of this solution. that we have planned to design the schema with the sensitive field as string.

Our MRV data field now is encrypted. However, the way guardian works it again includes all MRV data inside the VP file, so we need to protect data inside VP document too. we need to update the above function that can support both VP & VC as below: (sample4.mjs)

HINT: We can base on the type field to identify whether the document is VP or VC



```js
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


```

Now, run a new MRV submission and make sure you add CO2Offset value to any value > 1 to trigger the token Minting process. after a few seconds, the token mint will submit the VP document and then our custom hook will run again that document to loop through all VC inside it and encrypted all the field respect the setting inside __sensitiveFields. If you don't see the VP, it may be taken Mint got an error (network, out of balance, or your hook code failed) Please make sure you double check on guardian-service and worker-service logs to get more details of the error and fix them to continue testing this solution.


Here is the example of VP document on IPFS with my test data - https://ipfs.io/ipfs/bafkreibmwqz377qwjo6orjrcmz5rkqdpr7svgtsgdes6hdaiklokafb2wi
An above function is a simple approach, You probably have the schema with the nested object or the Array of Object that you want to protect all of them. In that just case there 2 option
- Encrypt the whole file, if you go with this option there are many options that you can choose such as GPG encryption  or RSA encryption with provide stronger protection and work with Private/Public key
- Update the function to loop deeper in the nested level and encrypt them all. 


To decrypt all the above data we need to use the below decryption function. Depending on your encryption function, you need to write the equivalent decryption function.
```js
export const decrypt = (encryptedText) => {
  console.log("Decrypting content");
  cont encrypted = Buffer.from(encryptedText)
  const iv = encrypted.slice(0, 16);
  encrypted = encrypted.slice(16);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return result;
};

```

## Conclusion

Guardian team is working on the proper solution for the sensitive information to be accessible by 3rd party when needed with on-chain verification support. We developed this solution a while ago when there no other solution is available. The auditor or whoever wants to verify data needs to be provided with the same secret key, If you choose to encrypt the whole file then we can give them the public key to decrypt data. Another limitation of this solution is field type need to be a string if not it will lose the validation with schema.  With the same approach, we can do much more to inject some data that Guardian does not support into the IPFS file before uploading to public storage depending on your business requirements.
All the above examples can be found on my GitHub repo here - https://github.com/samuraitruong/guardian-mrv-fields-encrypt