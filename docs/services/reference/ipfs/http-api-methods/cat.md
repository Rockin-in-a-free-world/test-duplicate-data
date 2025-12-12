import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# `cat`

## `/api/v0/cat`

Show IPFS object data.

### Request

<Tabs>
  <TabItem value="Syntax" label="Syntax" default>

```bash
curl "https://ipfs.infura.io:5001/api/v0/cat?arg=<key>" \
  -X POST \
  -u "<YOUR-API-KEY>:<YOUR-API-KEY-SECRET>"
```

  </TabItem>
  <TabItem value="Example" label="Example" >

__CODE_BLOCK_1__

  </TabItem>
</Tabs>

#### Request parameters

* `arg` *\[required]* - The IPFS object hash.

### Response

On success, the call to this endpoint will return with 200 and the following body:

```
This endpoint returns a `text/plain` response body.
```
