***

description: Enable API forwarding
sidebar\_position: 7
--------------------

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Enable API request forwarding

For JSON-RPC methods, you can request failover protection by adding the failover header to
your API request using curl, Web3.js, Ethers.js, or any other language of your choice.

For more information about this feature, including our partner and their privacy information,
see [Failover protection](../concepts/failover-protection.md).

:::info

Failover support is available on Mainnet only.

:::

## Request

In the code tabs, the `eth_blockNumber` method is used as an example.

<Tabs>
  <TabItem value="curl">

__CODE_BLOCK_0__

  </TabItem>
  <TabItem value="Web3.js">

__CODE_BLOCK_1__

  </TabItem>
  <TabItem value="Ethers.js">

__CODE_BLOCK_2__

  </TabItem>  
</Tabs>
