# chat-mcp-reconnect — recover MCP authorization from the chat

1. A connected Research Vault account expires before a requested capability runs. The normal capability search performs a live probe, identifies the exact connection, and puts a concise Reconnect Research Vault button beside the result, so the user does not have to translate setup instructions into another navigation journey.

2. Selecting Reconnect starts the real OpenWork Cloud flow for that exact connection. While provider consent is pending, the row stays usable and offers Open sign-in again. Reopening uses the same pending authorization instead of starting a duplicate reconnect or forcing the user to wait for a timeout.

3. After real provider consent, the row changes to Reconnected only when Den records a newer member authorization timestamp. The reusable browser action does not treat opening a page as successful sign-in.

4. Returning to the task preserves its Reconnected state. Try again does not silently replay the previous tool; it prepares a visible draft that searches live capabilities again and warns the user to confirm a write did not already complete before repeating it.

5. A new task then runs the same Research Vault capability successfully and returns its exact result. This proves the existing reconnect action still repairs the credential used by the real desktop-to-Den-to-provider execution path.

6. A downstream Salesforce capability now asks for its own provider sign-in. Even if the assistant also repeats the URL, the failed canonical Cloud tool row deterministically shows one app-authored Sign in action whose target is the exact same-origin URL supplied through Den. Merely rendering the row never opens a browser.

7. The user clicks Sign in, and the Electron shell opens that exact URL externally. OpenWork reports that sign-in was opened and offers Try again, but Try again only prepares a visible guarded draft; it neither sends a message nor replays the failed tool.

8. After the mock provider records completed sign-in, the user explicitly sends the reviewed draft. The agent searches current capabilities, re-runs the exact execute capability call, and receives the provider's success result through the real desktop-to-Den-to-MCP path.

9. Finally, the provider advertises a cross-origin sign-in URL. Den refuses to relay it and the renderer has no safe action to consume, so the tool row falls back to raw provider-error text with no Sign in or Reconnect button.
