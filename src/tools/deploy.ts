import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  parseEther,
  decodeEventLog,
  encodeAbiParameters,
  keccak256,
  toBytes,
  formatEther,
  type Address,
} from 'viem'
import { getNetwork, getChain, getPublicClient, getWalletClient } from '../client.js'
import { RecipeABI, PonzuCraftedABI } from '../abis.js'
import { getProtocolAddresses, type Network } from '../addresses.js'

const MIN_RAISE: Record<Network, bigint> = {
  mainnet: parseEther('3'),
  sepolia: parseEther('0.1'),
}

function calcPricing(targetEthRaise: bigint, network: Network) {
  const raise = targetEthRaise < MIN_RAISE[network] ? MIN_RAISE[network] : targetEthRaise
  const PRESALE_SUPPLY = 690_000n
  const endPriceWei = (raise * 20n) / (11n * PRESALE_SUPPLY)
  const startPriceWei = endPriceWei / 10n
  const pricingStrategyTemplate = keccak256(toBytes('LinearPricingStrategy'))
  const pricingStrategyData = encodeAbiParameters(
    [{ type: 'uint256' }, { type: 'uint256' }],
    [startPriceWei, endPriceWei],
  )
  return { startPriceWei, endPriceWei, pricingStrategyTemplate, pricingStrategyData }
}

// --- Tool Registration ---

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
const CREATION_FEE = parseEther('0.005')
const VESTING_10_DAYS = 864000n

export function registerDeployTools(server: McpServer) {
  // --- Get Addresses ---
  server.registerTool(
    'ponzu_get_addresses',
    {
      description:
        'Get all deployed Ponzu protocol contract addresses for the configured network. ' +
        'Returns factory, DEX, router, zap, WETH, and other protocol addresses.',
      inputSchema: {},
    },
    async () => {
      const network = getNetwork()
      const addrs = getProtocolAddresses(network)
      const text =
        `# Ponzu Protocol Addresses (${network})\n\n` +
        Object.entries(addrs)
          .map(([k, v]) => `- **${k}:** \`${v}\``)
          .join('\n')
      return { content: [{ type: 'text' as const, text }] }
    },
  )

  // --- Calc Pricing ---
  server.registerTool(
    'ponzu_calc_pricing',
    {
      description:
        'Calculate the linear pricing curve for a Ponzu presale given a target ETH raise. ' +
        'Returns start price, end price (10x start), and encoded pricing data. ' +
        'Formula: 690,000 tokens sold on a linear curve. Minimum raise: 3 ETH mainnet, 0.1 ETH sepolia.',
      inputSchema: {
        targetEthRaise: z
          .string()
          .describe('Target ETH raise amount (e.g. "5" for 5 ETH)'),
      },
    },
    async ({ targetEthRaise }) => {
      try {
        const network = getNetwork()
        const raise = parseEther(targetEthRaise)
        const pricing = calcPricing(raise, network)
        const text =
          `# Pricing Calculation (${network})\n\n` +
          `- **Target Raise:** ${targetEthRaise} ETH\n` +
          `- **Start Price:** ${formatEther(pricing.startPriceWei)} ETH/token\n` +
          `- **End Price:** ${formatEther(pricing.endPriceWei)} ETH/token\n` +
          `- **Price Ratio:** 1:10 (start to end)\n` +
          `- **Presale Supply:** 690,000 tokens\n` +
          `- **Strategy Template:** \`${pricing.pricingStrategyTemplate}\`\n` +
          `- **Strategy Data:** \`${pricing.pricingStrategyData}\``
        return { content: [{ type: 'text' as const, text }] }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Deploy Token ---
  server.registerTool(
    'ponzu_deploy',
    {
      description:
        'Deploy a full Ponzu token system — 9 contracts in one transaction: ' +
        'ERC-20 token, presale, launcher, distributor, farm, project, operator, ' +
        'PonzuBottle NFT, and LiquidityCard NFT. ' +
        'Cost: 0.005 ETH creation fee + optional initial buy. ' +
        'Presale opens immediately after deployment.',
      inputSchema: {
        tokenName: z.string().describe('Name of the token (e.g. "My Token")'),
        tokenSymbol: z.string().describe('Token ticker symbol (e.g. "MYTKN")'),
        metadata: z.string().describe('Metadata URI — IPFS, Arweave, or https:// pointing to JSON'),
        imageURI: z.string().describe('Token image URI — IPFS, Arweave, or https://'),
        targetEthRaise: z
          .string()
          .optional()
          .describe('Target ETH raise (default: network minimum — 3 ETH mainnet, 0.1 ETH sepolia)'),
        initialBuyAmount: z
          .string()
          .optional()
          .describe('Dev buy amount in ETH (default: "0")'),
      },
    },
    async ({ tokenName, tokenSymbol, metadata, imageURI, targetEthRaise, initialBuyAmount }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const network = getNetwork()
        const { ponzuRecipe } = getProtocolAddresses(network)

        const raise = targetEthRaise ? parseEther(targetEthRaise) : MIN_RAISE[network]
        const devBuy = initialBuyAmount ? parseEther(initialBuyAmount) : 0n
        const pricing = calcPricing(raise, network)

        const params = {
          owner: wallet.account!.address,
          keyContract: ZERO_ADDRESS,
          initialBuyAmount: devBuy,
          vestingDuration: VESTING_10_DAYS,
          pricingStrategyTemplate: pricing.pricingStrategyTemplate,
          pricingStrategyData: pricing.pricingStrategyData,
          feeStrategyData: '0x' as `0x${string}`,
          tokenName,
          tokenSymbol,
          metadata,
          imageURI,
        }

        const value = CREATION_FEE + devBuy

        const hash = await wallet.writeContract({
          address: ponzuRecipe,
          abi: RecipeABI,
          functionName: 'craftPonzu',
          args: [params],
          value,
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        // Decode PonzuCrafted event
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: PonzuCraftedABI,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === 'PonzuCrafted') {
              const addrs = decoded.args.addresses as Record<string, string>
              const text =
                `# Token Deployed Successfully!\n\n` +
                `**Transaction:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n\n` +
                `## Contract Addresses\n\n` +
                Object.entries(addrs)
                  .map(([k, v]) => `- **${k}:** \`${v}\``)
                  .join('\n')
              return { content: [{ type: 'text' as const, text }] }
            }
          } catch {
            // Not the PonzuCrafted event
          }
        }

        return {
          content: [
            { type: 'text' as const, text: `Transaction sent: ${hash}\nBut PonzuCrafted event not found in receipt.` },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error deploying token: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )
}
