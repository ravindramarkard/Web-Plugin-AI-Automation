# Web-to-Extension Connection Implementation

This document describes the hybrid architecture for connecting the web app (running at `localhost:3000`) with the Chrome extension for privileged browser operations.

## Architecture Overview

### Web App (Main UI)
- **Location**: `pages/web-app/` (runs at `http://localhost:3000`)
- **Purpose**: User interface, data storage, non-privileged logic
- **Technology**: React, TypeScript, Vite

### Companion Extension
- **Location**: `chrome-extension/` (loaded as unpacked extension)
- **Purpose**: Handles privileged operations (tab control, cross-origin access, script injection)
- **Technology**: Manifest V3, TypeScript, Service Worker

## Communication Pattern

### 1. External Messaging API

The extension uses Chrome's external messaging APIs to securely communicate with the web app:

#### Extension Side (`chrome-extension/src/background/index.ts`)

**For one-time messages:**
```typescript
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Validate sender origin
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];
  
  const senderOrigin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
  if (!allowedOrigins.includes(senderOrigin)) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return false;
  }

  // Handle message actions
  if (message.action === 'ping') {
    sendResponse({ success: true, data: { message: 'pong', extensionId: chrome.runtime.id } });
    return true; // Async response
  }
  // ... other actions
});
```

**For long-lived connections:**
```typescript
chrome.runtime.onConnectExternal.addListener(port => {
  // Validate sender origin
  const senderOrigin = port.sender?.origin || (port.sender?.url ? new URL(port.sender.url).origin : '');
  if (!allowedOrigins.includes(senderOrigin)) {
    port.disconnect();
    return;
  }

  // Handle web app connections
  if (port.name === 'web-app-connection' || !port.name) {
    port.onMessage.addListener(async message => {
      // Handle messages from web app
      if (message.action === 'ping') {
        port.postMessage({ success: true, data: { message: 'pong' } });
      }
      // ... other actions
    });
  }
});
```

#### Web App Side (`pages/web-app/src/lib/extensionBridge.ts`)

**For one-time messages:**
```typescript
// Try sendMessage first, fallback to port connection
chrome.runtime.sendMessage(extensionId, { action: 'ping' }, (response) => {
  if (chrome.runtime.lastError) {
    // Fallback to port connection
    usePortConnection();
  }
});
```

**For long-lived connections:**
```typescript
// Connect to extension using extension ID
const port = chrome.runtime.connect(extensionId, { name: 'web-app-connection' });

port.onMessage.addListener((response) => {
  console.log('Received:', response);
});

port.postMessage({ action: 'ping' });
```

### 2. Manifest Configuration

The extension manifest (`chrome-extension/manifest.js`) includes:

```javascript
externally_connectable: {
  matches: [
    'http://localhost:3000/*',
    'http://localhost:5173/*',
    'http://127.0.0.1:3000/*',
    'http://127.0.0.1:5173/*',
  ],
},
```

This allows the web app at these origins to communicate with the extension.

### 3. Extension Detection

The web app detects if the extension is available:

```typescript
// In ExtensionBridge.detectExtension()
// 1. Check if chrome.runtime is available
// 2. Verify extension ID is configured
// 3. Test connection via port (more reliable than sendMessage)
// 4. Return true if extension responds
```

## Supported Actions

The extension handles the following actions from the web app:

### Basic Operations
- `ping` - Test connection
- `get_current_tab` - Get current active tab info
- `get_page_state` - Get current page state (URL, title, clickable elements)
- `click_element` - Click element by index or xpath
- `input_text` - Type text into input field
- `navigate_to_url` - Navigate to URL

### Task Management
- `new_task` - Start a new automation task
- `follow_up_task` - Add follow-up task
- `cancel_task` - Cancel running task
- `pause_task` - Pause task
- `resume_task` - Resume paused task

### Configuration
- `sync_llm_provider` - Sync LLM provider config
- `sync_agent_model` - Sync agent model config
- `check_llm_configured` - Check if LLM is configured
- `open_options` - Open extension options page

## Security

### Origin Validation
- Extension validates sender origin against `externally_connectable` matches
- Messages from unauthorized origins are rejected
- Connection attempts from unauthorized origins are disconnected

### Message Validation
- All messages are validated before processing
- Error responses are sent for invalid messages
- Logging helps track security issues

## Error Handling

### Connection Failures
- Automatic retry mechanism (3 attempts)
- Fallback from `sendMessage` to port connection
- Clear error messages for debugging

### Service Worker Issues
- Detection handles inactive service workers
- Instructions provided for manual reload
- Timeout handling prevents hanging

## Development Workflow

### 1. Build Extension
```bash
pnpm -F chrome-extension build
```

### 2. Load Extension
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `dist/` directory

### 3. Get Extension ID
1. In `chrome://extensions`, find your extension
2. Copy the ID shown under the extension name
3. Enter it in web app Settings → Extension

### 4. Test Connection
1. Start web app: `cd pages/web-app && pnpm dev`
2. Go to `http://localhost:3000`
3. Navigate to Settings → Extension
4. Enter extension ID and click "Save & Check"
5. Should show "✅ Extension is connected and available"

## Troubleshooting

### Extension Not Detected
- Verify extension ID is correct (from `chrome://extensions`)
- Check extension is enabled and reloaded
- Verify service worker is running
- Check browser console for errors

### Connection Failures
- Ensure web app is at `http://localhost:3000` (not `file://`)
- Verify `externally_connectable` in manifest includes your origin
- Reload extension after manifest changes
- Check service worker console for errors

### Message Not Received
- Use port connection instead of `sendMessage` (more reliable)
- Check service worker is active
- Verify origin matches `externally_connectable`
- Check browser console for detailed errors

## Production Deployment

When deploying to production:

1. **Update Manifest**: Add production domain to `externally_connectable`:
   ```javascript
   externally_connectable: {
     matches: [
       'https://yourapp.com/*',
       'https://*.yourapp.com/*',
     ],
   },
   ```

2. **Rebuild Extension**: Run `pnpm -F chrome-extension build`

3. **Publish Extension**: 
   - Package as `.crx` or publish to Chrome Web Store
   - Update extension ID in web app settings

4. **Update Web App**: 
   - Update extension ID detection logic if needed
   - Test connection from production domain

## Best Practices

1. **Always validate origins** on extension side
2. **Use port connections** for long-lived communication
3. **Handle errors gracefully** with fallbacks
4. **Log communication** for debugging
5. **Test thoroughly** after changes
6. **Reload extension** after building
7. **Check service worker** status regularly

## References

- [Chrome Extension External Messaging](https://developer.chrome.com/docs/extensions/mv3/messaging/#external-webpage)
- [externally_connectable Manifest](https://developer.chrome.com/docs/extensions/reference/manifest/externally_connectable/)
- [Long-lived Connections](https://developer.chrome.com/docs/extensions/mv3/messaging/#connect)

