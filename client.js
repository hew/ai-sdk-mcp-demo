// AI SDK Client with MCP Integration
// Demonstrates the experimental MCP client functionality

import { experimental_createMCPClient, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

// Working MCP Transport implementation
class WorkingTransport {
  constructor(config) {
    this.url = config.url;
    this.rpcUrl = config.rpcUrl || config.url.replace('/sse', '/rpc');
  }

  async start() {
    console.log('🔌 Transport started');
    // Do NOT send initialize - the MCP client handles this
  }

  async send(message) {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    // Handle notifications (204 No Content)
    if (response.status === 204) {
      return; // No response for notifications
    }

    const result = await response.json();

    // Pass response back via callback
    if (this.onmessage) {
      this.onmessage(result);
    }
  }

  async close() {
    console.log('👋 Transport closed');
  }
}

async function main() {
  console.log('🚀 MCP Client Demo\n');

  try {
    // Create MCP client with working transport
    console.log('Creating MCP client...');
    const mcpClient = await experimental_createMCPClient({
      transport: new WorkingTransport({
        url: 'http://localhost:3456/sse',
        rpcUrl: 'http://localhost:3456/rpc'
      })
    });

    // Discover available tools
    console.log('\n📋 Discovering available tools...');
    const tools = await mcpClient.tools();

    console.log('Found tools:');
    Object.keys(tools).forEach(name => {
      console.log(`  - ${name}`);
    });

    // Example 1: Direct tool execution using .execute()
    console.log('\n📊 Example 1: Direct Tool Execution');
    console.log('Calculator: 25 * 4');

    const calcResult = await tools.calculator.execute({
      operation: 'multiply',
      a: 25,
      b: 4
    });
    console.log('Result:', JSON.parse(calcResult.content[0].text));

    // Example 2: Weather tool
    console.log('\n🌤️  Example 2: Weather Tool');
    const weatherResult = await tools.get_weather.execute({
      location: 'San Francisco',
      units: 'fahrenheit'
    });
    console.log('Weather:', JSON.parse(weatherResult.content[0].text));

    // Example 3: AI model with MCP tools
    if (process.env.OPENAI_API_KEY) {
      console.log('\n🤖 Example 3: AI Model with MCP Tools');

      const result = await generateText({
        model: openai('gpt-4-turbo'),
        tools,
        prompt: 'What is 156 divided by 12? Also, what\'s the weather like in New York?'
      });

      console.log('AI Response:', result.text);
      console.log('\nTool Calls Made:');
      result.toolCalls?.forEach(call => {
        console.log(`  - ${call.toolName}(${JSON.stringify(call.args)})`);
      });
    } else {
      console.log('\n⚠️  Skipping AI example (set OPENAI_API_KEY to enable)');
    }

    // Clean up
    await mcpClient.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nMake sure the MCP server is running: npm run server');
  }
}

// Run the demo
main();