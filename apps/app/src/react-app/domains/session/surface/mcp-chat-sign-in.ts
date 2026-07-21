import { openDesktopUrl } from "@/app/lib/desktop"
import type { ChatToolRetryAction } from "@/components/tools/error-attribution"

type OpenUrl = (url: string) => Promise<void>

export async function openMcpChatSignIn(
  connectUrl: string,
  openUrl: OpenUrl = openDesktopUrl,
): Promise<void> {
  await openUrl(connectUrl)
}

export function mcpChatRetryPrompt(action: ChatToolRetryAction): string {
  if ("connectUrl" in action) {
    const target = action.provider
    const signIn = target ? ` signing in to ${target}` : " signing in"
    return `I finished${signIn}. Search for the capability again and retry the previous request. Before repeating any write action, confirm it did not already complete.`
  }
  return `The ${action.connectionName} connection is restored. Search for the capability again and retry the previous request. Before repeating any write action, confirm it did not already complete.`
}
