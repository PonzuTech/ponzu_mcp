import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

const SKILL_URL = 'https://ponzu.app/SKILL.md'

export function registerSkillTools(server: McpServer) {
  server.registerTool(
    'ponzu_get_skill',
    {
      description:
        'Fetch the complete Ponzu skill documentation. ' +
        'Returns the full SKILL.md with instructions for deploying tokens, ' +
        'buying presales, swapping, farming, and all contract interactions. ' +
        'Use this first to understand how Ponzu works.',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await fetch(SKILL_URL)
        if (!response.ok) {
          throw new Error(`Failed to fetch skill: ${response.status}`)
        }
        const skill = await response.text()
        return { content: [{ type: 'text' as const, text: skill }] }
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching skill documentation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    },
  )
}
