import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { parseEther, formatEther, type Address } from 'viem'
import { getNetwork, getChain, getPublicClient, getWalletClient, getWalletAddress } from '../client.js'
import { RouterABI, FactoryABI, TokenABI } from '../abis.js'
import { getProtocolAddresses } from '../addresses.js'

export function registerSwapTools(server: McpServer) {
  // --- Swap ETH for Tokens ---
  server.registerTool(
    'ponzu_swap_eth_for_tokens',
    {
      description:
        'Buy tokens on PonzuSwap DEX by swapping ETH. ' +
        '1% swap fee (20% in first hour after launch, decaying linearly). ' +
        'Uses PonzuRouter.swapExactETHForTokens.',
      inputSchema: {
        tokenAddress: z.string().describe('Token contract address to buy'),
        ethAmount: z.string().describe('ETH amount to swap (e.g. "0.1")'),
        slippage: z
          .string()
          .optional()
          .describe('Slippage tolerance as percentage (default "5" for 5%)'),
      },
    },
    async ({ tokenAddress, ethAmount, slippage }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const network = getNetwork()
        const { ponzuRouter, weth } = getProtocolAddresses(network)
        const value = parseEther(ethAmount)
        const slippagePct = BigInt(Math.floor(Number(slippage ?? '5')))

        // Get expected output
        const amountsOut = (await client.readContract({
          address: ponzuRouter,
          abi: RouterABI,
          functionName: 'getAmountsOut',
          args: [value, [weth, tokenAddress as Address]],
        })) as bigint[]

        const expectedOut = amountsOut[1]
        const minOut = expectedOut - (expectedOut * slippagePct) / 100n
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 min

        const hash = await wallet.writeContract({
          address: ponzuRouter,
          abi: RouterABI,
          functionName: 'swapExactETHForTokens',
          args: [minOut, [weth, tokenAddress as Address], wallet.account!.address, deadline],
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
                `# Swap ETH → Tokens\n\n` +
                `**Tx:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n` +
                `**ETH In:** ${ethAmount}\n` +
                `**Expected Tokens:** ${formatEther(expectedOut)}\n` +
                `**Min Tokens (${slippage ?? '5'}% slippage):** ${formatEther(minOut)}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error swapping: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )

  // --- Swap Tokens for ETH ---
  server.registerTool(
    'ponzu_swap_tokens_for_eth',
    {
      description:
        'Sell tokens on PonzuSwap DEX for ETH. ' +
        'Requires token approval first (handled automatically). ' +
        'Uses PonzuRouter.swapExactTokensForETH.',
      inputSchema: {
        tokenAddress: z.string().describe('Token contract address to sell'),
        tokenAmount: z.string().describe('Token amount to sell (e.g. "1000")'),
        slippage: z
          .string()
          .optional()
          .describe('Slippage tolerance as percentage (default "5" for 5%)'),
      },
    },
    async ({ tokenAddress, tokenAmount, slippage }) => {
      try {
        const wallet = getWalletClient()
        const client = getPublicClient()
        const network = getNetwork()
        const { ponzuRouter, weth } = getProtocolAddresses(network)
        const amount = parseEther(tokenAmount)
        const slippagePct = BigInt(Math.floor(Number(slippage ?? '5')))

        // Check and set approval
        const allowance = (await client.readContract({
          address: tokenAddress as Address,
          abi: TokenABI,
          functionName: 'allowance',
          args: [wallet.account!.address, ponzuRouter],
        })) as bigint

        if (allowance < amount) {
          const approveHash = await wallet.writeContract({
            address: tokenAddress as Address,
            abi: TokenABI,
            functionName: 'approve',
            args: [ponzuRouter, amount],
            chain: getChain(),
            account: wallet.account!,
          })
          await client.waitForTransactionReceipt({ hash: approveHash })
        }

        // Get expected output
        const amountsOut = (await client.readContract({
          address: ponzuRouter,
          abi: RouterABI,
          functionName: 'getAmountsOut',
          args: [amount, [tokenAddress as Address, weth]],
        })) as bigint[]

        const expectedOut = amountsOut[1]
        const minOut = expectedOut - (expectedOut * slippagePct) / 100n
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

        const hash = await wallet.writeContract({
          address: ponzuRouter,
          abi: RouterABI,
          functionName: 'swapExactTokensForETH',
          args: [amount, minOut, [tokenAddress as Address, weth], wallet.account!.address, deadline],
          chain: getChain(),
          account: wallet.account!,
        })

        const receipt = await client.waitForTransactionReceipt({ hash })

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `# Swap Tokens → ETH\n\n` +
                `**Tx:** \`${hash}\`\n` +
                `**Block:** ${receipt.blockNumber}\n` +
                `**Tokens In:** ${tokenAmount}\n` +
                `**Expected ETH:** ${formatEther(expectedOut)}\n` +
                `**Min ETH (${slippage ?? '5'}% slippage):** ${formatEther(minOut)}`,
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            { type: 'text' as const, text: `Error swapping: ${error instanceof Error ? error.message : String(error)}` },
          ],
          isError: true,
        }
      }
    },
  )
}
