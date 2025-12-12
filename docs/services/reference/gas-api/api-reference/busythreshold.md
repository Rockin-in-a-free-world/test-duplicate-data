***

## description: Get the busy threshold.


import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Get the busy threshold

Returns the busy threshold for the specified blockchain network. 

For example, a `busyThreshold` value of `30` Gwei indicates that 90% of the historical base fees on
the network have been below `30` Gwei.
If the current base fee exceeds this value, it suggests that the network is busier than usual,
likely due to a high volume of transactions.

**GET** `https://gas.api.infura.io/networks/${chainId}/busyThreshold`

## Parameters

**Path**:

* `chainId`: `string` - ID of the chain to query.
  See the [list of supported chain IDs](../../../get-started/endpoints.md#gas-api).

## Returns

`busyThreshold`: `string` - Indicates that 90% of the historical base fees on the network
have been below this threshold, serving as a marker of network congestion when current base fees exceed it.

## Example

### Request

Include your [API key](https://dashboard.metamask.io/)
and optional [API key secret](https://dashboard.metamask.io/)
to authorize your account to use the APIs.

:::tip
You can call the API with only an API key, and [include it as a path parameter](../api-reference/index.md#supported-api-request-formats)
instead of using the curl authentication option (`-u`).
:::

<Tabs>
  <TabItem value="curl" label="curl" default >

__CODE_BLOCK_0__

  </TabItem>
  <TabItem value="JavaScript" label="JavaScript">

__CODE_BLOCK_1__

  </TabItem>
</Tabs>

### Response

```json
{
  "busyThreshold": "37.378956101"
}
```
