#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerSkillTools } from './tools/skill.js'
import { registerDeployTools } from './tools/deploy.js'
import { registerPresaleTools } from './tools/presale.js'
import { registerSwapTools } from './tools/swap.js'
import { registerFarmTools } from './tools/farm.js'

const server = new McpServer({
  name: 'ponzu-mcp',
  version: '1.1.0',
  instructions:
    'Ponzu is a permissionless ERC-20 token launchpad on Ethereum. ' +
    'This server provides 17 tools covering the full token lifecycle: ' +
    'deploy a 9-contract token system, buy/refund presales with vesting, ' +
    'swap on PonzuSwap DEX, and stake LP tokens for farming rewards. ' +
    'Call ponzu_get_skill first for the complete integration guide.',
})

// Register all tool groups
registerSkillTools(server)
registerDeployTools(server)
registerPresaleTools(server)
registerSwapTools(server)
registerFarmTools(server)

// Connect via stdio transport
const transport = new StdioServerTransport()
await server.connect(transport)
console.error('Ponzu MCP server running on stdio')
