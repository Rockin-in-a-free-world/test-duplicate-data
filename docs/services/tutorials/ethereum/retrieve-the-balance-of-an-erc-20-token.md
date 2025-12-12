***

description: Retrieve the balance of an ERC-20 token.
sidebar\_position: 6
--------------------

import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

# Retrieve the balance of an ERC-20 token

In this tutorial, using Web3.js, you'll retrieve the balance of an [ERC-20 token](../../how-to/interact-with-erc-20-tokens.md) in an account, using the account address and the token contract.

## Prerequisites

* An [Ethereum project](../../get-started/infura.md) on Infura
* [Node.js installed](https://nodejs.org/en/download/)

## Steps

### 1. Create a project directory

Create a new directory for your project. This can be done from the command line:

```bash
mkdir retrieveBalance
```

Change into the new directory:

```bash
cd retrieveBalance
```

### 2. Install required packages

Install the `web3` package in the project directory:

```bash
npm install web3
```

### 3. Set up the script

Create a file called `retrieveBalance.js`. At the top of the file, add the following lines to import the web3.js library and connect to the Infura HTTPS endpoint:

```javascript
const { Web3 } = require("web3")
const web3 = new Web3(
  new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/<YOUR-API-KEY>")
)
```

Make sure to replace `<YOUR-API-KEY>` with your Infura API key.

### 4. Set the ABI

You'll only use the `balanceOf` method, so you don’t need the entire ABI for ERC-20 smart contracts. In the `retrieveBalance.js` file, define the ABI for the `balanceOf` method by adding the following to the script:

```javascript
const balanceOfABI = [
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
]
```

### 5. Select a token address

To retrieve the balance of a token, you need the contract address of the token. You can find this in the tokens section of a block explorer such as [Etherscan](https://etherscan.io/).

This example uses a DAI token contract. However, you can use any ERC-20 token contract address. Copy the token contract address you wish to use.

\<img src={require('@site/static/img/contract\_address.jpeg').default} alt="" />

### 6. Request the token balance

Define the addresses to use in the __INLINE_CODE_6__ script:

__CODE_BLOCK_5__

Define __INLINE_CODE_7__ using __INLINE_CODE_8__, passing the __INLINE_CODE_9__ and the token contract address __INLINE_CODE_10__ as parameters:

__CODE_BLOCK_6__

Next, call __INLINE_CODE_11__ on the __INLINE_CODE_12__ and pass the __INLINE_CODE_13__ address. This call sends a request to your Infura endpoint to request the token balance in the __INLINE_CODE_14__ account address.

Create the below __INLINE_CODE_15__ function __INLINE_CODE_16__ that accomplishes this by interacting with the __INLINE_CODE_17__.

__CODE_BLOCK_7__

### 7. Convert the token units

By default, calling __INLINE_CODE_18__ returns the balance value in wei, which is the smallest unit in Ethereum, equal to 0.000000000000000001 Ether.

Use __INLINE_CODE_19__ to get the actual number of DAI tokens, by adding the following line to the __INLINE_CODE_20__ function:

__CODE_BLOCK_8__

Also, update your __INLINE_CODE_21__:

__CODE_BLOCK_9__

### 8. Run the script

#### Complete code

Here is the complete code for __INLINE_CODE_22__. Before running it make sure you replace __INLINE_CODE_23__ with your Infura API key.

__CODE_BLOCK_10__

Run the script using the following command:

<Tabs>
  <TabItem value="Command" label="Command" default>

```bash
node retrieveBalance.js
```

  </TabItem>
  <TabItem value="Example" label="Example" >

# Example output

__CODE_BLOCK_12__

  </TabItem>
</Tabs>
