# MCP Transport Requirements for AI SDK

Based on our investigation, here are the undocumented requirements for implementing a transport for the AI SDK's experimental MCP client:

## Transport Interface

```typescript
interface MCPTransport {
  // Required properties (set by MCP client)
  onmessage?: (message: JSONRPCMessage) => void;
  onerror?: (error: unknown) => void;
  onclose?: () => void;

  // Required methods
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
}
```

## Key Requirements

### 1. **Message ID Handling**
- The MCP client manages message IDs internally
- Transport MUST NOT modify or add message IDs
- Pass messages through exactly as received

### 2. **Notification Handling**
- Notifications (methods starting with `notifications/`) don't have IDs
- Server should respond with 204 No Content for notifications
- Transport should NOT call `onmessage` for notification responses

### 3. **Response Handling**
- Use the `onmessage` callback to pass responses back to the client
- Do NOT return responses from the `send()` method
- The client tracks requests by ID and matches responses

### 4. **Protocol Version**
- Client sends `protocolVersion: "2025-06-18"` in initialize
- Server should echo back the same protocol version
- Capabilities should be objects, not booleans

## Working Example

```javascript
class WorkingTransport {
  constructor(url) {
    this.url = url;
  }

  async start() {
    // Do NOT send initialize - the client handles this
  }

  async send(message) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    // Handle notifications (no response expected)
    if (response.status === 204) {
      return;
    }

    const result = await response.json();

    // Pass response to client via callback
    if (this.onmessage) {
      this.onmessage(result);
    }
  }

  async close() {
    // Cleanup if needed
  }
}
```

## Server Requirements

1. **Initialize Response Format**:
```json
{
  "protocolVersion": "2025-06-18",
  "capabilities": {
    "tools": {},
    "resources": {},
    "prompts": {}
  },
  "serverInfo": {
    "name": "server-name",
    "version": "1.0.0"
  }
}
```

2. **Notifications**: Return 204 No Content
3. **Tool List**: Return array of tool definitions
4. **Tool Call**: Return content array with results

## Common Pitfalls

❌ **DON'T**: Send initialize in transport.start()
✅ **DO**: Let the MCP client handle initialization

❌ **DON'T**: Modify or generate message IDs
✅ **DO**: Pass messages exactly as received

❌ **DON'T**: Return values from send()
✅ **DO**: Use onmessage callback

❌ **DON'T**: Send response for notifications
✅ **DO**: Return 204 No Content