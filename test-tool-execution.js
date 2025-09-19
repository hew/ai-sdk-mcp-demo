// Test how tools should be executed through MCP
import { experimental_createMCPClient } from 'ai';

class WorkingTransport {
  constructor(url) {
    this.url = url;
  }

  async start() {}

  async send(message) {
    console.log('📤 Sending:', JSON.stringify(message, null, 2));

    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (response.status === 204) return;

    const result = await response.json();
    console.log('📥 Received:', JSON.stringify(result, null, 2));

    if (this.onmessage) {
      this.onmessage(result);
    }
  }

  async close() {}
}

async function test() {
  const mcpClient = await experimental_createMCPClient({
    transport: new WorkingTransport('http://localhost:3456/rpc')
  });

  const tools = await mcpClient.tools();

  console.log('\n🔍 Tools structure:');
  console.log('Type of tools:', typeof tools);
  console.log('Tool names:', Object.keys(tools));

  // Check first tool
  const firstToolName = Object.keys(tools)[0];
  if (firstToolName) {
    const firstTool = tools[firstToolName];
    console.log(`\nFirst tool (${firstToolName}):`, typeof firstTool);
    console.log('Properties:', Object.keys(firstTool));

    // Try to execute if it's a function
    if (typeof firstTool === 'function') {
      try {
        console.log('\n🎯 Attempting tool execution...');
        const result = await firstTool({
          operation: 'add',
          a: 5,
          b: 3
        });
        console.log('Result:', result);
      } catch (error) {
        console.log('Execution error:', error.message);
      }
    } else if (typeof firstTool.execute === 'function') {
      try {
        console.log('\n🎯 Attempting tool.execute()...');
        const result = await firstTool.execute({
          operation: 'add',
          a: 5,
          b: 3
        });
        console.log('Result:', result);
      } catch (error) {
        console.log('Execution error:', error.message);
      }
    }
  }

  await mcpClient.close();
}

test().catch(console.error);