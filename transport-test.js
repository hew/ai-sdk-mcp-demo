// Test file to understand MCP transport requirements
// Let's trace through what the AI SDK expects

import { experimental_createMCPClient } from 'ai';

// Debugging Transport - logs everything
class DebugTransport {
  constructor(url) {
    this.url = url;
    console.log('🔍 Transport created with URL:', url);
  }

  async start() {
    console.log('🔍 start() called');
    // Should NOT send initialize here - the client does that
  }

  async send(message) {
    console.log('🔍 send() called with:', JSON.stringify(message, null, 2));

    // The message already has an ID from the MCP client
    // We should NOT add or modify the ID
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message) // Send exactly what we received
    });

    // Handle notifications (204 No Content responses)
    if (response.status === 204) {
      console.log('🔍 Notification sent (no response expected)');
      return; // No response to process for notifications
    }

    const result = await response.json();
    console.log('🔍 Response received:', JSON.stringify(result, null, 2));

    // The MCP client expects us to call onmessage with the response
    if (this.onmessage) {
      this.onmessage(result);
    }

    // We should NOT return the result from send()
    // The client handles responses via the onmessage callback
  }

  async close() {
    console.log('🔍 close() called');
  }
}

async function test() {
  console.log('Testing MCP Transport Requirements\n');
  console.log('=' .repeat(50));

  try {
    const transport = new DebugTransport('http://localhost:3456/rpc');

    // The MCP client will set these handlers
    transport.onmessage = (msg) => console.log('📨 onmessage handler called');
    transport.onerror = (err) => console.log('❌ onerror handler called:', err);
    transport.onclose = () => console.log('🚪 onclose handler called');

    const mcpClient = await experimental_createMCPClient({ transport });

    console.log('\n✅ Client created successfully!');
    console.log('\nNow testing tools discovery...\n');

    const tools = await mcpClient.tools();
    console.log('\nDiscovered tools:', Object.keys(tools));

    await mcpClient.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

test();