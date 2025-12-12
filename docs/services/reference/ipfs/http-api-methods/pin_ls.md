import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# `pin_ls`

## `/api/v0/pin/ls`

Lists objects pinned to local storage.

### Request

<Tabs>
  <TabItem value="Syntax" label="Syntax" default>

```bash
curl "https://ipfs.infura.io:5001/api/v0/pin/ls?arg=<ipfs-path>&type=all&quiet=<value>&stream=<value>" \
  -X POST \
  -u "<YOUR-API-KEY>:<YOUR-API-KEY-SECRET>"
```

  </TabItem>
  <TabItem value="Example" label="Example" >

__CODE_BLOCK_1__

  </TabItem>
</Tabs>

#### Request parameters

* `arg` *\[Optional]* - Path to objects to be listed.
* `type` *\[Optional]* - The type of pinned keys to list. Can be `direct`, `indirect`, `recursive`, or `all`. The default is `all`.
* `quiet` *\[Optional]* - Write just hashes of objects.
* `stream` *\[Optional]* - Enable streaming of pins as they are discovered.

### Response

On success, the call to this endpoint returns with 200 and the following body:

#### Body

```
{
  "PinLsList": {
    "Keys": {
      "<string>": {
        "Type": "string"
      }
    }
  },
  "PinLsObject": {
    "Cid": "string",
    "Type": "string"
  }
}
```
