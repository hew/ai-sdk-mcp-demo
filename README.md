# MCP Demo - Model Context Protocol with AI SDK

This demo showcases the `experimental_createMCPClient` functionality in Vercel's AI SDK, demonstrating how to build and interact with MCP servers.

## Features

- 🌐 **Web Interface** - Interactive browser-based demo
- 🛠️ **MCP Server** - Full JSON-RPC 2.0 implementation
- 🔧 **Multiple Tools** - Calculator, weather, and echo tools
- 📝 **Protocol Logging** - Real-time message visualization
- 🎯 **Command Line Demo** - Step-by-step CLI demonstration

## Running the Demo

### Option 1: Web Interface (NEW!)

#### Method A: All-in-one (server serves frontend)
```bash
npm run server
# Open http://localhost:3456
```

#### Method B: Separate frontend server
```bash
# Terminal 1 - Start MCP server
npm run server

# Terminal 2 - Start frontend (choose one):
npm run frontend        # Python 3
npm run frontend:py2    # Python 2
npm run frontend:npx    # Using npx serve

# Open http://localhost:8080
```

#### Method C: Development mode (both servers)
```bash
npm run dev
# Opens both servers - frontend on :8080, API on :3456
```

Use the web interface to:
- View server status
- Discover available tools
- Execute tools interactively
- See the protocol messages in real-time

### Option 2: Command Line Demo

1. Start the MCP server:
   ```bash
   npm run server
   ```

2. Run the interactive demo:
   ```bash
   npm run demo
   ```

3. Run tests to see the transport implementation:
   ```bash
   npm test
   ```

## Project Structure

```
mcp-demo/
├── public/
│   ├── index.html      # Web interface
│   ├── styles.css      # Styling
│   └── app.js          # Browser-side MCP client
├── server.js           # MCP server implementation
├── demo.js             # Interactive CLI demo
├── transport-test.js   # Transport implementation test
├── DISCOVERIES.md      # Key findings about MCP
└── package.json        # Dependencies and scripts
```

## Available Tools

1. **calculator** - Perform basic math operations (add, subtract, multiply, divide)
2. **get_weather** - Get mock weather data for any location
3. **echo** - Echo back messages with timestamp

## Key Discoveries

- Protocol version must be `"2025-06-18"`
- Capabilities are objects, not booleans
- Notifications require 204 No Content response
- Tools have `.execute()` method, not directly callable
- Transport must use callbacks, not return values

## Learn More

Read the full blog post: [Exploring the Undocumented MCP Functionality in the AI-SDK](/blog/exploring-mcp-with-ai-sdk)
