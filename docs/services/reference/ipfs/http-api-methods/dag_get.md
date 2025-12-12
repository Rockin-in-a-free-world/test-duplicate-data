import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# `dag_get`

## `/api/v0/dag/get`

Get a DAG node from IPFS.

### Request

<Tabs>
  <TabItem value="Syntax" label="Syntax" default>

```bash
curl "https://ipfs.infura.io:5001/api/v0/dag/get?arg=<key>&output-codec=dag-json" \
  -X POST \
  -u "<YOUR-API-KEY>:<YOUR-API-KEY-SECRET>"
```

  </TabItem>
  <TabItem value="Example" label="Example" >

__CODE_BLOCK_1__

  </TabItem>
</Tabs>

#### Request parameters

* `arg` *\[Required]*: The object to get.
* `output-codec` *\[Optional]*: Format the object will be decoded in. The default is `dag-json`.

### Response

On success, the call to this endpoint will return with 200 and the following body:

```
This endpoint returns a `text/plain` response body.
```
