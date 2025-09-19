// Interactive Demo Script
// Shows key MCP concepts step-by-step

import { experimental_createMCPClient } from 'ai';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForEnter(message = 'Press Enter to continue...') {
  return new Promise(resolve => {
    rl.question(`\n${message}`, () => resolve());
  });
}

// Minimal transport for clarity
class DemoTransport {
  constructor(url) {
    this.url = url;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async start() {
    // MCP client will handle initialization
    console.log('Transport started');
  }

  async send(message) {
    // Send the message and wait for response
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    // Handle notifications (204 No Content)
    if (res.status === 204) {
      return;
    }

    const result = await res.json();

    // Call onmessage handler for the AI SDK
    if (this.onmessage) {
      this.onmessage(result);
    }
  }

  async close() {
    console.log('Transport closed');
  }
}

async function demo() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           MCP + AI SDK Integration Demo                   ║');
  console.log('║                                                            ║');
  console.log('║  Demonstrating undocumented MCP functionality             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await waitForEnter('Start demo? Press Enter...');

  // Step 1: Show the concept
  console.log('\n📚 CONCEPT: Model Context Protocol (MCP)');
  console.log('├─ Universal protocol for AI tool integration');
  console.log('├─ Works with any AI model via AI SDK');
  console.log('└─ Hidden in AI SDK as experimental_createMCPClient\n');

  await sleep(2000);

  // Step 2: Connect to server
  console.log('🔌 STEP 1: Connect to MCP Server\n');
  console.log('Code:');
  console.log('```javascript');
  console.log('const mcpClient = await experimental_createMCPClient({');
  console.log('  transport: new DemoTransport("http://localhost:3456/rpc")');
  console.log('});');
  console.log('```\n');

  const mcpClient = await experimental_createMCPClient({
    transport: new DemoTransport('http://localhost:3456/rpc')
  });

  console.log('✅ Connected!\n');

  await waitForEnter();

  // Step 3: Discover tools
  console.log('🔍 STEP 2: Discover Available Tools\n');
  console.log('Code:');
  console.log('```javascript');
  console.log('const tools = await mcpClient.tools();');
  console.log('```\n');

  const tools = await mcpClient.tools();

  console.log('Discovered tools:');
  Object.entries(tools).forEach(([name, tool]) => {
    console.log(`  📦 ${name}`);
  });

  await waitForEnter();

  // Step 4: Execute a tool
  console.log('\n⚡ STEP 3: Execute a Tool\n');
  console.log('Code:');
  console.log('```javascript');
  console.log('const result = await tools.calculator.execute({');
  console.log('  operation: "multiply",');
  console.log('  a: 42,');
  console.log('  b: 3.14');
  console.log('});');
  console.log('```\n');

  const result = await tools.calculator.execute({
    operation: 'multiply',
    a: 42,
    b: 3.14
  });

  const parsedResult = JSON.parse(result.content[0].text);
  console.log('Result:', JSON.stringify(parsedResult, null, 2));

  await waitForEnter();

  // Step 5: Show protocol flow
  console.log('\n🔄 PROTOCOL FLOW:\n');
  console.log('Client                    Server');
  console.log('  │                         │');
  console.log('  ├──── initialize ────────▶│');
  console.log('  │◀──── capabilities ──────┤');
  console.log('  │                         │');
  console.log('  ├──── tools/list ────────▶│');
  console.log('  │◀──── tool schemas ──────┤');
  console.log('  │                         │');
  console.log('  ├──── tools/call ────────▶│');
  console.log('  │◀──── tool result ───────┤');
  console.log('  │                         │\n');

  await waitForEnter();

  // Step 6: Key benefits
  console.log('\n✨ KEY BENEFITS:\n');
  console.log('1. 🔗 Universal Integration');
  console.log('   └─ One protocol, any AI model\n');
  console.log('2. 🔧 Automatic Tool Conversion');
  console.log('   └─ MCP tools → AI SDK tools\n');
  console.log('3. 🚀 Multiple Transport Options');
  console.log('   └─ SSE, STDIO, Custom\n');
  console.log('4. 📦 Tool Aggregation');
  console.log('   └─ Combine tools from multiple servers\n');

  await waitForEnter();

  // Cleanup
  await mcpClient.close();

  console.log('\n✅ Demo Complete!\n');
  console.log('📖 Learn more in the blog post:');
  console.log('   "Exploring the Undocumented MCP Functionality in the AI-SDK"\n');

  rl.close();
}

// Run demo with error handling
demo().catch(error => {
  console.error('\n❌ Demo Error:', error.message);
  console.log('\n💡 Make sure the MCP server is running:');
  console.log('   npm run server\n');
  rl.close();
  process.exit(1);
});