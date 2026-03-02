import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'

export type Network = 'mainnet' | 'sepolia'

const DEFAULT_RPC: Record<Network, string> = {
  mainnet: 'https://eth.llamarpc.com',
  sepolia: 'https://rpc.sepolia.org',
}

export function getNetwork(): Network {
  const net = process.env.PONZU_NETWORK ?? 'mainnet'
  if (net !== 'mainnet' && net !== 'sepolia') {
    throw new Error(`Invalid PONZU_NETWORK: ${net}. Must be 'mainnet' or 'sepolia'.`)
  }
  return net
}

export function getChain(): Chain {
  return getNetwork() === 'mainnet' ? mainnet : sepolia
}

export function getPublicClient(): PublicClient {
  const network = getNetwork()
  const rpcUrl = process.env.PONZU_RPC_URL ?? DEFAULT_RPC[network]
  return createPublicClient({
    chain: getChain(),
    transport: http(rpcUrl),
  })
}

export function getWalletClient(): WalletClient {
  const pk = process.env.PONZU_PRIVATE_KEY
  if (!pk) {
    throw new Error(
      'PONZU_PRIVATE_KEY environment variable is required for write operations. ' +
      'Set it in your MCP server config under "env".'
    )
  }
  const network = getNetwork()
  const rpcUrl = process.env.PONZU_RPC_URL ?? DEFAULT_RPC[network]
  const account = privateKeyToAccount(pk as `0x${string}`)
  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(rpcUrl),
  })
}

export function getWalletAddress(): Address {
  const pk = process.env.PONZU_PRIVATE_KEY
  if (!pk) {
    throw new Error('PONZU_PRIVATE_KEY is required to determine wallet address.')
  }
  return privateKeyToAccount(pk as `0x${string}`).address
}
