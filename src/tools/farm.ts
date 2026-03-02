import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { parseEther, formatEther, type Address } from 'viem'
import { getNetwork, getChain, getPublicClient, getWalletClient, getWalletAddress } from '../client.js'
import { ZapEthABI, FarmABI, TokenABI } from '../abis.js'
import { getProtocolAddresses } from '../addresses.js'

export function registerFarmTools(server: McpServer) {
  // --- Zap ETH ---
  server.registerTool(
    'ponzu_zap_eth',
    {
      description:
        'Convert ETH into LP tokens in one transaction. ' +
        'Splits ETH 50/50 — half buys tokens, half pairs with ETH to create LP. ' +
        'Uses ZapEth contract.',
      inputSchema: {
        tokenAddress: z.string().describe('Token address to create LP for'),
        ethAmount: z.string().describe('ETH amount to zap (e.g. "0.5")'),
      },
    },
    async ({ tokenAddress, ethAmount }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const network = getNetwork()
        const { zapEth: zapAddr } = getProtocolAddresses(network)
        const value = parseEther(ethAmount)

        // Get expected LP
        const expectedLP = (await client.readContract({
          address: zapAddr,
          abi: ZapEthABI,
          functionName: 'calculateExpectedLP',
          args: [tokenAddress as Address, value],
        })) as bigint

        const minLP = expectedLP - (expectedLP * 5n) / 100n // 5% slippage

        const hash = await wallet.writeContract({
          address: zapAddr,
          abi: ZapEthABI,
          functionName: 'zapETHToLP',
          args: [tokenAddress as Address, minLP, wallet.account!.address],
          value,
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `# Zap ETH → LP\n\n` +
                `**Tx:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n` +
                `**ETH In:** ${ethAmount}\n` +
                `**Expected LP:** ${formatEther(expectedLP)}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error zapping: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Farm Stake ---
  server.registerTool(
    'ponzu_farm_stake',
    {
      description:
        'Stake LP tokens in a Ponzu farm. Mints a LiquidityCard NFT on first stake. ' +
        'Requires LP token approval first (handled automatically). ' +
        'Early unstake (<7 days) incurs penalty up to 100% LP.',
      inputSchema: {
        farmAddress: z.string().describe('Farm contract address'),
        lpAmount: z.string().describe('LP token amount to stake (e.g. "1.5")'),
      },
    },
    async ({ farmAddress, lpAmount }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const amount = parseEther(lpAmount)
        const farm = farmAddress as Address

        // Get LP token address
        const lpToken = (await client.readContract({
          address: farm,
          abi: FarmABI,
          functionName: 'lpToken',
        })) as Address

        // Check and set approval
        const allowance = (await client.readContract({
          address: lpToken,
          abi: TokenABI,
          functionName: 'allowance',
          args: [wallet.account!.address, farm],
        })) as bigint

        if (allowance < amount) {
          const approveHash = await wallet.writeContract({
            address: lpToken,
            abi: TokenABI,
            functionName: 'approve',
            args: [farm, amount],
            chain: getChain(),
            account: wallet.account!,
          })
          await client.waitForTransactionReceipt({ hash: approveHash })
        }

        const hash = await wallet.writeContract({
          address: farm,
          abi: FarmABI,
          functionName: 'stake',
          args: [amount],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `# LP Staked\n\n` +
                `**Tx:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n` +
                `**LP Staked:** ${lpAmount}\n` +
                `**Note:** Early unstake (<7 days) incurs penalty.`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error staking: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Farm Unstake ---
  server.registerTool(
    'ponzu_farm_unstake',
    {
      description:
        'Unstake LP tokens from a Ponzu farm. Full withdrawal only — burns the LiquidityCard NFT. ' +
        'If staked <7 days, early exit penalty applies (up to 100% LP forfeiture). ' +
        'Half of penalty boosts remaining stakers.',
      inputSchema: {
        farmAddress: z.string().describe('Farm contract address'),
        cardId: z.string().describe('LiquidityCard NFT ID to unstake'),
      },
    },
    async ({ farmAddress, cardId }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: farmAddress as Address,
          abi: FarmABI,
          functionName: 'unstake',
          args: [BigInt(cardId)],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `# LP Unstaked\n\n` +
                `**Tx:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n` +
                `**Card ID:** ${cardId}\n` +
                `**Note:** Card burned. Check tx for actual LP received (penalty may apply).`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error unstaking: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Farm Claim ---
  server.registerTool(
    'ponzu_farm_claim',
    {
      description:
        'Claim primary token rewards from a Ponzu farm. One-time claim per LiquidityCard. ' +
        'After claiming, no further token or ETH claims are possible for this card.',
      inputSchema: {
        farmAddress: z.string().describe('Farm contract address'),
        cardId: z.string().describe('LiquidityCard NFT ID'),
      },
    },
    async ({ farmAddress, cardId }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: farmAddress as Address,
          abi: FarmABI,
          functionName: 'claim',
          args: [BigInt(cardId)],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Farm Rewards Claimed\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**Card ID:** ${cardId}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error claiming: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Farm Claim ETH ---
  server.registerTool(
    'ponzu_farm_claim_eth',
    {
      description:
        'Claim WETH rewards from a Ponzu farm. Repeatable — call as rewards accumulate. ' +
        'Cannot claim after primary token claim.',
      inputSchema: {
        farmAddress: z.string().describe('Farm contract address'),
        cardId: z.string().describe('LiquidityCard NFT ID'),
      },
    },
    async ({ farmAddress, cardId }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: farmAddress as Address,
          abi: FarmABI,
          functionName: 'claimETH',
          args: [BigInt(cardId)],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Farm ETH Rewards Claimed\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**Card ID:** ${cardId}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error claiming ETH: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )
}
