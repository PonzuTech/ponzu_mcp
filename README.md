# @ponzu_app/mcp

MCP server for Ponzu — deploy tokens, buy presales, swap, and farm on Ethereum via AI agents.

## Tools (17)

| Tool | Description |
|------|-------------|
| `ponzu_get_skill` | Fetch full Ponzu documentation (SKILL.md) |
| `ponzu_get_addresses` | Get protocol contract addresses for configured network |
| `ponzu_calc_pricing` | Calculate presale pricing curve from target ETH raise |
| `ponzu_deploy` | Deploy full 9-contract token system in one transaction |
| `ponzu_get_presale_info` | Read presale state (tokens available, launched, etc.) |
| `ponzu_presale_buy` | Buy tokens in a presale |
| `ponzu_presale_refund` | Refund presale tokens (20% penalty) |
| `ponzu_trigger_launch` | Trigger DEX launch when presale sells out |
| `ponzu_claim_tokens` | Claim vested tokens from presale |
| `ponzu_claim_eth` | Claim ETH rewards from presale |
| `ponzu_swap_eth_for_tokens` | Buy tokens on PonzuSwap DEX |
| `ponzu_swap_tokens_for_eth` | Sell tokens on PonzuSwap DEX |
| `ponzu_zap_eth` | Convert ETH into LP tokens in one transaction |
| `ponzu_farm_stake` | Stake LP tokens in a farm |
| `ponzu_farm_unstake` | Unstake LP tokens (burns LiquidityCard NFT) |
| `ponzu_farm_claim` | Claim primary token rewards from farm |
| `ponzu_farm_claim_eth` | Claim WETH rewards from farm |

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PONZU_PRIVATE_KEY` | For write ops | — | Hex private key for signing transactions |
| `PONZU_RPC_URL` | No | Public RPC | Ethereum RPC endpoint |
| `PONZU_NETWORK` | No | `mainnet` | `mainnet` or `sepolia` |

### Claude Desktop / Claude Code

Add to your MCP config (`~/.claude/config.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "ponzu": {
      "command": "npx",
      "args": ["-y", "@ponzu_app/mcp"],
      "env": {
        "PONZU_PRIVATE_KEY": "0x...",
        "PONZU_RPC_URL": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
        "PONZU_NETWORK": "mainnet"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ponzu": {
      "command": "npx",
      "args": ["-y", "@ponzu_app/mcp"],
      "env": {
        "PONZU_PRIVATE_KEY": "0x...",
        "PONZU_RPC_URL": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
        "PONZU_NETWORK": "mainnet"
      }
    }
  }
}
```

### Read-Only Mode

Omit `PONZU_PRIVATE_KEY` to use read-only tools (`ponzu_get_skill`, `ponzu_get_addresses`, `ponzu_calc_pricing`, `ponzu_get_presale_info`). Write operations will return a clear error asking for the key.

## Development

```bash
yarn install
yarn build        # compiles TypeScript
yarn dev          # watch mode via tsx
```
