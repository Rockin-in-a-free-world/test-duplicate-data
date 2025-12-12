***

description: Use JSON Web Tokens to secure data exchange.
sidebar\_position: 9
--------------------

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Use JSON Web Token (JWT)

JSON Web Token (JWT) is an internet standard ([RFC 7519](https://tools.ietf.org/html/rfc7519)) that defines a process for secure data exchange between two parties.

Infura projects can use [JSON Web Tokens](https://jwt.io) to authorize users and external parties. This allows developers to enhance the security profile of their dapps by configuring the expiry time and scope of JWTs.

:::info

Infura supports using JWTs for Web3 networks.

:::

## Use JWTs with Infura projects

Only authenticated users can access Infura projects by including JWTs in request headers.

#### Workflow

1. Set up your project's Infura security settings to enforce authorized access with JWTs.
2. A user logs into the project application and receives a JWT.
3. Each request the user makes to Infura with the application's API key includes the JWT in the header.
4. The JWT is verified and the request is successful, or the request is rejected if the JWT is invalid.

:::info

JWTs may also include allowlists that enforce further restrictions.

:::

## Set up a project to use JWTs

### Generate keys

Generate your private and public key pair. Infura supports the [RS256](https://datatracker.ietf.org/doc/html/rfc7518#section-3.3) and [ES256](https://datatracker.ietf.org/doc/html/rfc7518#section-3.4) cryptographic algorithms. If you are unfamiliar with generating keys, follow the [Authenticate with JWT](../tutorials/ethereum/authenticate-with-jwt.md#21-generate-your-private-key) tutorial.

:::warning

Ensure your [private key stays private](https://www.infura.io/blog/post/best-practises-for-infura-api-key-management)!

:::

### Upload the public key

Upload the contents of the public key file that you [generated earlier](json-web-token-jwt.md#generate-keys):

1. In the dashboard, select the API key, then select the **Settings** tab.

   :::info

   You must implement separate security settings for each API key.

   :::

2. Select **Require JWT for all requests** to enforce JWTs on all requests.

   :::info

   You can use [allowlists](https://dashboard.metamask.io/) to
   specify a subset of requests that must use JWTs.

   :::

3. Provide a unique name for your JWT public key, which can help you manage multiple keys.

4. Paste the public key into the **JWT Public Key** input box. It looks something like this:

   ```
   -----BEGIN PUBLIC KEY-----
   MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr7VlNytvNFt9wVkjJ8vG
   L4F0+id4kS1CpG7UMh1kghrLg9KMb8gauy7Bxk6PRz5Ckv1FnG4FL+Z3Cdzwd6c8
   jJlzJxbRTYvNi3elqAyItE3tRl6CatRur49t9nGepgFOrwmPP5We52G5O0BsW6Mx
   w/neqQH+Y/bXqs0PG/0ZbpTyr044Lh+p9grSuPIogIGIY5JM4AI+fpdH6hVnA7od
   PkinkWhQqAW+F8jngwZK+JCFS1GAeobTZVbvsiHZQGuP/T7hqE8z5Q8HYO4ymnkI
   MPH6zSKhSxsQRs/kWU5lXqY67ORC3DIMA+I/AJujLuoqC+YaMP0fO81XjrwXPf2j
   4wIDAQAB
   -----END PUBLIC KEY-----
   ```

5. Select **Add** to add the key to the settings.

6. The key has a **Name**, **ID**, **Fingerprint**. These are used for creating and verifying JWTs.
   You'll need the **ID** to [generate the JWT](json-web-token-jwt.md#generate-a-jwt).

   :::info

   For key rotation, upload up to three keys for each API key.

   :::

## Send requests with JWTs

If JWTs are required for all requests, the following fails with an `invalid JWT` error.

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []}' \
  "https://optimism-sepolia.infura.io/v3/<YOUR-API-KEY>"
```

To get the request to pass, generate a JWT, and add it to the request.

### Generate a JWT

Generate a JWT with an online tool, or programmatically:

#### Online tool

The following example uses the [jwt.io](https://jwt.io) site to generate the JWT:

* Use a supported algorithm (`RS256` or `ES256`) and declare it in the `alg` header field.
* Specify `JWT` in the `typ` header field.
* Include the JWT `ID` in the `kid` header field.
* Have an unexpired `exp` timestamp in the payload data.
* Specify `infura.io` in the `aud` field.
* Add the public key and private key created earlier into the **Verify Signature** section.

\<img src={require('@site/static/img/jwt.png').default} alt="Generate a JWT online" />

:::info

To generate a timestamp for testing, use an [online timestamp converter tool](https://www.freeformatter.com/epoch-timestamp-to-date-converter.html).

:::

#### Programmatically

Developers typically create the JWT token from their keys programmatically.
To learn more, follow the tutorial demonstrating how to [create and apply a JWT with Node.js](../tutorials/ethereum/authenticate-with-jwt.md).

### Apply the JWT

Pass the encoded token as part of the __INLINE_CODE_11__ entry:

__CODE_BLOCK_2__

__CODE_BLOCK_3__

## Next steps

### Set up allowlists

Allowlists restrict specific activity to users without JWTs. For example, in a system with proxy contracts, allowlists can restrict a user to sending requests to their own proxy only.

:::info

JWT allowlists override all other security settings for requests.

:::

A JWT with allowlists must have all of the above settings, plus properly formatted allowlists.

Set allowlists with one or more of the following keys:

* __INLINE_CODE_12__
* __INLINE_CODE_13__
* __INLINE_CODE_14__
* __INLINE_CODE_15__

The following example JWT definition allows only __INLINE_CODE_16__ requests, on a single specified address, coming from any HTTP origin, and any user agent.

**Header**:

__CODE_BLOCK_4__

**Payload:**

__CODE_BLOCK_5__

__CODE_BLOCK_6__

__CODE_BLOCK_7__

### Verify JWTs

To identify the public key you have used to create a JWT, verify it with the __INLINE_CODE_17__.

Take the private key, output it in __INLINE_CODE_18__ encoding; take the __INLINE_CODE_19__ of that, and __INLINE_CODE_20__ encode the result.

<Tabs>
  <TabItem value="RSA key" label="RSA key" default>

```bash
openssl rsa -in private.pem -pubout -outform DER | openssl sha256 -binary | openssl base64
```

  </TabItem>
  <TabItem value="EC (256) key" label="EC (256) key" default>

```bash
openssl ec -in private.pem -pubout -outform DER | openssl sha256 -binary | openssl base64
```

  </TabItem>
</Tabs>

### Learn more

* Learn more about [keeping your Infura secrets safe](https://www.infura.io/blog/post/best-practises-for-infura-api-key-management).
* Follow a [tutorial](../tutorials/ethereum/authenticate-with-jwt.md) to create and apply a JWT to authenticate an
  `eth_blockNumber` API request.
