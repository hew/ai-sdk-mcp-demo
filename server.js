// Simple MCP Server Implementation
// This is a minimal server for demonstration purposes

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Tool definitions - kept simple for demo clarity
const TOOLS = {
  calculator: {
    name: 'calculator',
    description: 'Perform basic math operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The operation to perform'
        },
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['operation', 'a', 'b']
    }
  },
  get_weather: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or location'
        },
        units: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          default: 'celsius'
        }
      },
      required: ['location']
    }
  },
  echo: {
    name: 'echo',
    description: 'Echo back the input message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back'
        }
      },
      required: ['message']
    }
  }
};

// Tool execution logic
async function executeTool(toolName, args) {
  switch (toolName) {
    case 'calculator':
      const { operation, a, b } = args;
      let result;
      switch (operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide': result = b !== 0 ? a / b : 'Error: Division by zero'; break;
      }
      return { result, expression: `${a} ${operation} ${b} = ${result}` };

    case 'get_weather':
      // Mock weather data for demo
      const { location, units = 'celsius' } = args;
      const temp = Math.floor(Math.random() * 30) + 10;
      const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];

      return {
        location,
        temperature: units === 'fahrenheit' ? Math.floor(temp * 9/5 + 32) : temp,
        units,
        condition,
        humidity: Math.floor(Math.random() * 40) + 40,
        wind_speed: Math.floor(Math.random() * 20) + 5
      };

    case 'echo':
      return { echoed_message: args.message, timestamp: new Date().toISOString() };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// MCP Protocol Endpoints

// SSE endpoint for MCP communication
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection_established',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// JSON-RPC endpoint
app.post('/rpc', async (req, res) => {
  const { method, params, id } = req.body;

  // Notifications don't have IDs and don't get responses
  if (!id && method.startsWith('notifications/')) {
    console.log(`📨 Notification received: ${method}`);
    res.status(204).send(); // No content response for notifications
    return;
  }

  try {
    let result;

    switch (method) {
      case 'initialize':
        // MCP initialization handshake - match the client's protocol version
        result = {
          protocolVersion: params.protocolVersion || '2025-06-18',
          capabilities: {
            tools: {},  // Tools capability is an object, not boolean
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'demo-mcp-server',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        // Return available tools
        result = {
          tools: Object.values(TOOLS)
        };
        break;

      case 'tools/call':
        // Execute a tool
        const { name, arguments: args } = params;
        const toolResult = await executeTool(name, args);
        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(toolResult, null, 2)
            }
          ]
        };
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    res.json({
      jsonrpc: '2.0',
      id,
      result
    });
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'mcp-demo', timestamp: new Date().toISOString() });
});

const PORT = process.env.MCP_SERVER_PORT || 3456;
app.listen(PORT, () => {
  console.log(`🚀 MCP Demo Server running on http://localhost:${PORT}`);
  console.log(`\n📱 Web Interface: http://localhost:${PORT}`);
  console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`   RPC endpoint: http://localhost:${PORT}/rpc`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log('\nAvailable tools:');
  Object.values(TOOLS).forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });
});
