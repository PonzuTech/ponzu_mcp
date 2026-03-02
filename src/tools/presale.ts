import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { parseEther, formatEther, type Address } from 'viem'
import { getChain, getPublicClient, getWalletClient } from '../client.js'
import { PresaleABI } from '../abis.js'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export function registerPresaleTools(server: McpServer) {
  // --- Get Presale Info (read-only) ---
  server.registerTool(
    'ponzu_get_presale_info',
    {
      description:
        'Read the current state of a Ponzu presale contract. ' +
        'Returns tokens available, whether launched, launch time, total sold, and total purchases.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
      },
    },
    async ({ presaleAddress }) => {
      try {
        const client = getPublicClient()
        const addr = presaleAddress as Address

        const [tokensAvailable, launched, launchTime, totalSold, totalPurchases] =
          await Promise.all([
            client.readContract({ address: addr, abi: PresaleABI, functionName: 'tokensAvailable' }),
            client.readContract({ address: addr, abi: PresaleABI, functionName: 'launched' }),
            client.readContract({ address: addr, abi: PresaleABI, functionName: 'launchTime' }),
            client.readContract({ address: addr, abi: PresaleABI, functionName: 'totalSold' }),
            client.readContract({ address: addr, abi: PresaleABI, functionName: 'totalPurchases' }),
          ])

        const text =
          `# Presale Info\n\n` +
          `- **Address:** \`${presaleAddress}\`\n` +
          `- **Tokens Available:** ${formatEther(tokensAvailable as bigint)}\n` +
          `- **Launched:** ${launched}\n` +
          `- **Launch Time:** ${launchTime === 0n ? 'Not launched yet' : new Date(Number(launchTime) * 1000).toISOString()}\n` +
          `- **Total Sold:** ${formatEther(totalSold as bigint)} tokens\n` +
          `- **Total Purchases:** ${formatEther(totalPurchases as bigint)} tokens`
        return { content: [{ type: 'text' as const, text }] }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error reading presale: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Buy Presale ---
  server.registerTool(
    'ponzu_presale_buy',
    {
      description:
        'Buy tokens in a Ponzu presale. Sends ETH and receives tokens at the current price on the linear curve. ' +
        '4% fee: 1% creator, 1% protocol, 1% platform referrer, 1% order referrer.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
        ethAmount: z.string().describe('ETH amount to spend (e.g. "0.5")'),
        minTokens: z.string().optional().describe('Minimum tokens to receive (slippage protection)'),
      },
    },
    async ({ presaleAddress, ethAmount, minTokens }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const value = parseEther(ethAmount)
        const minOut = minTokens ? parseEther(minTokens) : 0n

        const hash = await wallet.writeContract({
          address: presaleAddress as Address,
          abi: PresaleABI,
          functionName: 'presale',
          args: [minOut, ZERO_ADDRESS, ZERO_ADDRESS],
          value,
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Presale Purchase Successful\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**ETH Spent:** ${ethAmount} ETH`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error buying presale: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Refund ---
  server.registerTool(
    'ponzu_presale_refund',
    {
      description:
        'Refund tokens from a Ponzu presale. Available before launch only. ' +
        '20% token penalty (stays in presale as pro-rata bonus for holders). ' +
        '80% of proportional ETH returned.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
        tokenAmount: z.string().describe('Token amount to refund (e.g. "1000")'),
      },
    },
    async ({ presaleAddress, tokenAmount }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const amount = parseEther(tokenAmount)

        const hash = await wallet.writeContract({
          address: presaleAddress as Address,
          abi: PresaleABI,
          functionName: 'refund',
          args: [amount],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Refund Successful\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**Tokens Refunded:** ${tokenAmount}\n**Note:** 20% penalty applied. 80% of ETH returned.`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error refunding: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Trigger Launch ---
  server.registerTool(
    'ponzu_trigger_launch',
    {
      description:
        'Trigger DEX launch for a Ponzu presale that has sold out. ' +
        'Creates the PonzuSwap liquidity pool with all raised ETH + 310,000 tokens. ' +
        'Anyone can call this once presale is sold out.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
      },
    },
    async ({ presaleAddress }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: presaleAddress as Address,
          abi: PresaleABI,
          functionName: 'triggerLaunch',
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Launch Triggered!\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n\nDEX pool created. Tokens are now tradeable on PonzuSwap. Vesting has started.`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error triggering launch: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Claim Tokens ---
  server.registerTool(
    'ponzu_claim_tokens',
    {
      description:
        'Claim vested tokens from a Ponzu presale. One-time claim per PonzuBottle NFT. ' +
        'If claimed before vesting completes (10 days), unvested portion goes to Distributor. ' +
        'Burns the PonzuBottle NFT.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
        tokenId: z.string().describe('PonzuBottle NFT token ID'),
      },
    },
    async ({ presaleAddress, tokenId }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: presaleAddress as Address,
          abi: PresaleABI,
          functionName: 'claimTokens',
          args: [BigInt(tokenId)],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Tokens Claimed\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**Token ID:** ${tokenId}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error claiming tokens: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Claim ETH ---
  server.registerTool(
    'ponzu_claim_eth',
    {
      description:
        'Claim ETH rewards from a Ponzu presale. Repeatable — can be called multiple times ' +
        'as more ETH flows into the presale from the Distributor.',
      inputSchema: {
        presaleAddress: z.string().describe('Presale contract address'),
        tokenId: z.string().describe('PonzuBottle NFT token ID'),
      },
    },
    async ({ presaleAddress, tokenId }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()

        const hash = await wallet.writeContract({
          address: presaleAddress as Address,
          abi: PresaleABI,
          functionName: 'claimETH',
          args: [BigInt(tokenId)],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text: `# ETH Rewards Claimed\n\n**Tx:** \`${hash}\`\n**Block:** ${receipt.blockNumber}\n**Token ID:** ${tokenId}`,
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
