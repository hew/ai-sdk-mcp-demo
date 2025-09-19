# Discoveries: Undocumented MCP Functionality in AI SDK

## Key Findings

### 1. Transport Contract

The AI SDK's `experimental_createMCPClient` expects a transport with this interface:

```typescript
interface MCPTransport {
  // Callbacks (set by the MCP client)
  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;

  // Methods to implement
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
}
```

### 2. Critical Implementation Details

1. **Do NOT initialize in start()** - The MCP client handles the initialization handshake
2. **Do NOT modify message IDs** - Pass messages exactly as received
3. **Do NOT return from send()** - Use the `onmessage` callback instead
4. **Handle 204 responses** - Notifications don't get responses

### 3. Protocol Details

- Protocol version: `"2025-06-18"`
- Capabilities are objects, not booleans: `{ tools: {}, resources: {}, prompts: {} }`
- Notifications (like `notifications/initialized`) don't have IDs

### 4. Tool Execution

Tools returned by `mcpClient.tools()` are objects with:
- `description`: Tool description
- `inputSchema`: JSON schema for parameters
- `execute(params)`: Function to call the tool
- `type`: Tool type identifier

Example:
```javascript
const tools = await mcpClient.tools();
const result = await tools.calculator.execute({
  operation: 'add',
  a: 5,
  b: 3
});
// result.content[0].text contains the JSON response
```

### 5. Server Response Format

Tool execution responses must follow this format:
```json
{
  "content": [
    {
      "type": "text",
      "text": "JSON-stringified result"
    }
  ]
}
```

## Working Implementation

```javascript
// Minimal working transport
class MCPTransport {
  constructor(url) {
    this.url = url;
  }

  async start() {
    // Empty - client handles initialization
  }

  async send(message) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.status === 204) {
      return; // Notification - no response
    }

    const result = await response.json();
    if (this.onmessage) {
      this.onmessage(result);
    }
  }

  async close() {
    // Cleanup
  }
}
```

## Usage with AI Models

While the blog post suggests direct integration with AI models works, the current implementation seems to focus on tool discovery and execution. The tools can be:

1. Discovered automatically
2. Executed directly via `.execute()`
3. Potentially used with AI models (though this needs more investigation)

## Limitations Discovered

1. Tools are not directly callable (must use `.execute()`)
2. SSE transport seems less reliable than direct RPC
3. The experimental nature means APIs could change

## Value for Developers

Despite being undocumented, this functionality provides:
- Universal tool integration across AI models
- Clean abstraction over MCP protocol complexity
- Type-safe tool execution
- Automatic schema validation

This makes it valuable for building AI applications that need to interact with external tools and services.