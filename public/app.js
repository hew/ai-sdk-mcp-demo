// MCP Demo Frontend
// Direct RPC implementation without AI SDK for browser

class MCPClient {
  constructor(url) {
    this.url = url;
    this.messageId = 1;
    this.tools = {};
    this.initialized = false;
  }

  async sendRequest(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params
    };

    logMessage('request', message);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (response.status === 204) {
        // Notification - no response
        return null;
      }

      const result = await response.json();
      logMessage('response', result);

      if (result.error) {
        throw new Error(result.error.message || 'Server error');
      }

      return result.result;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async sendNotification(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    logMessage('request', message);

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Notification failed:', error);
    }
  }

  async initialize() {
    updateFlowStep('init', 'active');

    try {
      const result = await this.sendRequest('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'mcp-demo-web',
          version: '1.0.0'
        }
      });

      await this.sendNotification('notifications/initialized');

      this.initialized = true;
      updateFlowStep('init', 'complete');

      return result;
    } catch (error) {
      updateFlowStep('init', 'error');
      throw error;
    }
  }

  async discoverTools() {
    updateFlowStep('discover', 'active');

    try {
      const result = await this.sendRequest('tools/list');
      this.tools = {};

      if (result && result.tools) {
        result.tools.forEach(tool => {
          this.tools[tool.name] = tool;
        });
      }

      updateFlowStep('discover', 'complete');
      return this.tools;
    } catch (error) {
      updateFlowStep('discover', 'error');
      throw error;
    }
  }

  async executeTool(toolName, args) {
    updateFlowStep('execute', 'active');

    try {
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args
      });

      updateFlowStep('execute', 'complete');
      updateFlowStep('result', 'complete');

      return result;
    } catch (error) {
      updateFlowStep('execute', 'error');
      updateFlowStep('result', 'error');
      throw error;
    }
  }
}

// UI State
let mcpClient = null;
let selectedTool = null;

// DOM Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toolsList = document.getElementById('toolsList');
const toolSelect = document.getElementById('toolSelect');
const toolInputs = document.getElementById('toolInputs');
const executeBtn = document.getElementById('executeBtn');
const results = document.getElementById('results');
const resultContent = document.getElementById('resultContent');
const logs = document.getElementById('logs');
const clearLogs = document.getElementById('clearLogs');
const autoScroll = document.getElementById('autoScroll');

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
  await initializeClient();
});

async function initializeClient() {
  try {
    // Check server status
    updateStatus('connecting');

    // Use the MCP server URL (works whether frontend is served from same server or different port)
    const mcpServerUrl = 'http://localhost:3456/rpc';
    mcpClient = new MCPClient(mcpServerUrl);

    // Initialize MCP protocol
    await mcpClient.initialize();

    // Discover tools
    const tools = await mcpClient.discoverTools();

    updateStatus('online');
    displayTools(tools);
    populateToolSelector(tools);

  } catch (error) {
    console.error('Initialization failed:', error);
    updateStatus('offline');
    toolsList.innerHTML = '<div class="error">Failed to connect to MCP server. Make sure the server is running on port 3456.</div>';
  }
}

function updateStatus(status) {
  statusDot.className = 'status-dot ' + status;

  switch (status) {
    case 'connecting':
      statusText.textContent = 'Connecting...';
      break;
    case 'online':
      statusText.textContent = 'Connected';
      break;
    case 'offline':
      statusText.textContent = 'Offline - Start the server with: npm run server';
      break;
  }
}

function displayTools(tools) {
  if (!tools || Object.keys(tools).length === 0) {
    toolsList.innerHTML = '<div class="loading">No tools available</div>';
    return;
  }

  toolsList.innerHTML = Object.entries(tools)
    .map(([name, tool]) => `
      <div class="tool-card">
        <div class="tool-name">${name}</div>
        <div class="tool-description">${tool.description || 'No description'}</div>
      </div>
    `)
    .join('');
}

function populateToolSelector(tools) {
  toolSelect.innerHTML = '<option value="">Choose a tool...</option>';

  Object.entries(tools).forEach(([name, tool]) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    toolSelect.appendChild(option);
  });
}

toolSelect.addEventListener('change', (e) => {
  const toolName = e.target.value;

  if (!toolName) {
    selectedTool = null;
    toolInputs.classList.add('hidden');
    executeBtn.disabled = true;
    return;
  }

  selectedTool = mcpClient.tools[toolName];
  displayToolInputs(selectedTool);
  executeBtn.disabled = false;
});

function displayToolInputs(tool) {
  if (!tool.inputSchema || !tool.inputSchema.properties) {
    toolInputs.innerHTML = '<p>This tool requires no inputs</p>';
    toolInputs.classList.remove('hidden');
    return;
  }

  const properties = tool.inputSchema.properties;
  const required = tool.inputSchema.required || [];

  let html = '';

  Object.entries(properties).forEach(([key, schema]) => {
    const isRequired = required.includes(key);

    html += `<div class="input-group">`;
    html += `<label for="input-${key}">${key}${isRequired ? ' *' : ''}</label>`;

    if (schema.enum) {
      // Dropdown for enum values
      html += `<select id="input-${key}" data-param="${key}">`;
      schema.enum.forEach(value => {
        html += `<option value="${value}">${value}</option>`;
      });
      html += `</select>`;
    } else if (schema.type === 'boolean') {
      // Checkbox for boolean
      html += `<input type="checkbox" id="input-${key}" data-param="${key}">`;
    } else if (schema.type === 'number' || schema.type === 'integer') {
      // Number input
      html += `<input type="number" id="input-${key}" data-param="${key}"
                placeholder="${schema.description || ''}"
                ${schema.minimum !== undefined ? `min="${schema.minimum}"` : ''}
                ${schema.maximum !== undefined ? `max="${schema.maximum}"` : ''}>`;
    } else {
      // Text input for string and others
      html += `<input type="text" id="input-${key}" data-param="${key}"
                placeholder="${schema.description || ''}">`;
    }

    if (schema.description) {
      html += `<div class="input-hint">${schema.description}</div>`;
    }

    html += `</div>`;
  });

  toolInputs.innerHTML = html;
  toolInputs.classList.remove('hidden');
}

executeBtn.addEventListener('click', async () => {
  if (!selectedTool) return;

  // Gather input values
  const inputs = toolInputs.querySelectorAll('[data-param]');
  const args = {};

  inputs.forEach(input => {
    const param = input.dataset.param;

    if (input.type === 'checkbox') {
      args[param] = input.checked;
    } else if (input.type === 'number') {
      args[param] = input.value ? parseFloat(input.value) : undefined;
    } else {
      args[param] = input.value || undefined;
    }
  });

  // Execute tool
  executeBtn.disabled = true;
  executeBtn.classList.add('loading');
  executeBtn.textContent = 'Executing...';

  try {
    const result = await mcpClient.executeTool(selectedTool.name, args);
    displayResult(result);
  } catch (error) {
    displayError(error);
  } finally {
    executeBtn.disabled = false;
    executeBtn.classList.remove('loading');
    executeBtn.textContent = 'Execute Tool';
  }
});

function displayResult(result) {
  if (!result || !result.content || result.content.length === 0) {
    resultContent.textContent = 'No result returned';
  } else {
    const content = result.content[0];

    if (content.type === 'text') {
      try {
        // Try to parse as JSON for pretty display
        const parsed = JSON.parse(content.text);
        resultContent.textContent = JSON.stringify(parsed, null, 2);
      } catch {
        // Display as plain text if not JSON
        resultContent.textContent = content.text;
      }
    } else {
      resultContent.textContent = JSON.stringify(content, null, 2);
    }
  }

  results.classList.remove('hidden');
}

function displayError(error) {
  resultContent.textContent = `Error: ${error.message}`;
  results.classList.remove('hidden');
}

function updateFlowStep(step, status) {
  const element = document.getElementById('flow-' + step);
  if (!element) return;

  // Remove all status classes
  element.classList.remove('active', 'complete', 'error');

  // Add new status
  if (status !== 'idle') {
    element.classList.add(status);
  }
}

function logMessage(direction, message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const timestamp = new Date().toLocaleTimeString();

  entry.innerHTML = `
    <div class="log-timestamp">${timestamp}</div>
    <div class="log-direction ${direction}">${direction}</div>
    <div class="log-content">${JSON.stringify(message, null, 2)}</div>
  `;

  logs.appendChild(entry);

  // Auto-scroll if enabled
  if (autoScroll.checked) {
    logs.scrollTop = logs.scrollHeight;
  }

  // Limit log entries to 50
  while (logs.children.length > 50) {
    logs.removeChild(logs.firstChild);
  }
}

clearLogs.addEventListener('click', () => {
  logs.innerHTML = '';
});

// Add styles for error display
const style = document.createElement('style');
style.textContent = `
  .error {
    color: #f44336;
    text-align: center;
    padding: 20px;
    background: #ffebee;
    border-radius: 4px;
  }
`;
document.head.appendChild(style);