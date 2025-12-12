***

description: Trace transactions
sidebar\_position: 6
--------------------

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Trace transactions

:::info

Trace API is currently an open beta feature, available to paying Infura customers.

:::

Infura provides access to a trace API that allows you to get detailed transaction processing information. Use the API to
extract information about contract interactions, transactions, and blocks on the Ethereum network. You can
also use the API to retrieve transaction details that are not recorded on the blockchain. For example, use the
[`trace_call`](../reference/ethereum/json-rpc-methods/trace-methods/trace_call.mdx) API to observe contract interactions.

\<img src={require('@site/static/img/trace-call.png').default} alt="Trace API example" />

:::tip

View the [trace API tutorial](https://www.youtube.com/watch?v=RpjbiDlwPEs) for more information on how to call the API to
trace, debug, analyze, and secure smart contracts.

:::

The trace API provides endpoints that can be categorized into the following groups, [ad-hoc tracing APIs](#ad-hoc-tracing-apis)
and [transaction-trace filtering APIs](#transaction-trace-filtering-apis).

## Ad-hoc tracing APIs

These API endpoints allow you to use the [__INLINE_CODE_1__](../reference/ethereum/json-rpc-methods/trace-methods/index.md#trace) or
[__INLINE_CODE_2__](../reference/ethereum/json-rpc-methods/trace-methods/index.md#statediff) diagnostic options when tracing calls or transactions, and are
helpful for debugging transactions and analyzing state changes.

:::info

The __INLINE_CODE_3__ diagnostic option is not supported.

:::

The ad-hoc tracing API endpoints are:

* [__INLINE_CODE_4__](../reference/ethereum/json-rpc-methods/trace-methods/trace_call.mdx)
* [__INLINE_CODE_5__](../reference/ethereum/json-rpc-methods/trace-methods/trace_callmany.mdx)

## Transaction-trace filtering APIs

These API endpoints allow you to filter and search by specific information such as the block, address, or transaction. The endpoints
only use the [__INLINE_CODE_6__](../reference/ethereum/json-rpc-methods/trace-methods/index.md) diagnostic option. The transaction-trace filtering API endpoints are:

* [__INLINE_CODE_7__](../reference/ethereum/json-rpc-methods/trace-methods/trace_block.mdx)
* [__INLINE_CODE_8__](../reference/ethereum/json-rpc-methods/trace-methods/trace_transaction.mdx)
* [__INLINE_CODE_9__](../reference/ethereum/json-rpc-methods/trace-methods/trace_filter.mdx)

## Trace a transaction example

In the following example, you'll trace a transaction using a transaction hash on Ethereum mainnet. The result displays two traces, meaning two separate calls were made within the transaction, and includes the gas used for each call.

This example represents a call to the __INLINE_CODE_10__ function of an ERC-20 token contract (indicated in the __INLINE_CODE_11__ field), transferring tokens to the address, __INLINE_CODE_12__.

<Tabs>
  <TabItem value="curl" label="curl" default>

```bash
curl https://mainnet.infura.io/v3/<YOUR-API-KEY> \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "trace_transaction", "params": ["0x1e404c4bf580688c5527df2ce5aceb3db5de49479ab7dd321dd4615e4f5a7a5c"], "id": 1}'
```

  </TabItem>
  <TabItem value="Result" label="Result" >

__CODE_BLOCK_1__

  </TabItem>
</Tabs>

## Use cases

Use cases for the trace API include:

* **Debugging transactions** - The trace API allows you to analyze and debug Ethereum transactions.
  Trace the execution of a transaction to identify issues or bugs in smart contracts or dapps.
  Track the sequence of operations, inspect the input and output data, and pinpoint potential errors
  or unexpected behavior.
* **Optimizing gas usage** - The trace API allows you to analyze the gas consumption of transactions
  and identify areas where gas usage can be optimized.
  By examining the execution trace, you can spot expensive operations, inefficient code patterns, or
  unnecessary computations that consume excessive gas.
  You can use this information to refactor smart contracts and reduce transaction costs for users.
* **Security auditing** - Conduct security audits of smart contracts and dapps by tracing the
  execution flow.
  This allows you to identify potential vulnerabilities or attack vectors in the code.
  You can analyze contract interactions, track data modifications, and validate that the smart
  contract behaves as intended.
  This helps uncover security loopholes and ensures that the smart contracts are robust against
  various types of attacks, such as reentrancy or unauthorized access.
