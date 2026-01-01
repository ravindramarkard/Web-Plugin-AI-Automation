# Extension Connection Debugging Guide

## Error: "Could not establish connection. Receiving end does not exist"

This error means the extension service worker is **not running** or the **extension ID is incorrect**.

## Step-by-Step Fix

### Step 1: Get the CORRECT Extension ID

**Important:** If you're using an **unpacked extension** (development), the ID is **different** from the published extension ID.

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Find **AITestGen** extension in the list
4. Look for the **ID** shown directly under the extension name
   - It looks like: `abcdefghijklmnopqrstuvwxyz123456`
   - **This is your actual extension ID** - copy it!
5. **Note:** If you reload the extension, the ID might change (for unpacked extensions)

### Step 2: Reload the Extension

1. In `chrome://extensions`, find your AITestGen extension
2. Click the **🔄 Reload** button (circular arrow icon)
3. Wait for it to reload
4. **Check the service worker status:**
   - Look for "service worker" link (or "background page")
   - Click it to open the service worker console
   - It should show as **"running"** (not "inactive")
   - If it shows errors, fix them first

### Step 3: Verify Extension is Enabled

1. Make sure the extension toggle is **ON** (blue/enabled)
2. If it's OFF, turn it ON

### Step 4: Check the Service Worker Console

1. In `chrome://extensions`, click the **"service worker"** link next to your extension
2. This opens the service worker console
3. Check for any errors (red text)
4. You should see: `background loaded` in the console
5. If you see errors, fix them and reload the extension

### Step 5: Test the Connection

1. Make sure your web app is running: `cd pages/web-app && pnpm dev`
2. Open: `http://localhost:3000/debug-extension.html`
3. Enter the **correct extension ID** (from Step 1)
4. Click "Test Connection"
5. Check the console output

### Step 6: Verify Manifest Configuration

The manifest should have `externally_connectable` configured. Check `chrome-extension/manifest.js`:

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

If you changed this, **rebuild the extension**:
```bash
pnpm -F chrome-extension build
```

Then **reload the extension** in Chrome.

## Common Issues

### Issue 1: Using Published Extension ID for Unpacked Extension
- **Symptom:** Connection fails with "Receiving end does not exist"
- **Fix:** Get the actual ID from `chrome://extensions` (it's different for unpacked extensions)

### Issue 2: Service Worker is Inactive
- **Symptom:** Extension shows as "inactive" in service worker console
- **Fix:** 
  1. Reload the extension
  2. Send a message to wake it up
  3. Check for errors in service worker console

### Issue 3: Extension Not Reloaded After Build
- **Symptom:** Changes not taking effect
- **Fix:** After building, **always reload the extension** in `chrome://extensions`

### Issue 4: Wrong Origin
- **Symptom:** Connection fails
- **Fix:** Make sure web app is served from `http://localhost:3000` (not `file://`)

## Quick Test Script

Run this in the browser console on `http://localhost:3000`:

```javascript
// Replace with your actual extension ID from chrome://extensions
const extId = 'YOUR_EXTENSION_ID_HERE';

chrome.runtime.sendMessage(extId, { action: 'ping' }, (response) => {
  const error = chrome.runtime.lastError;
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Extension ID used:', extId);
    console.error('Go to chrome://extensions and verify:');
    console.error('  1. Extension is enabled');
    console.error('  2. Extension ID matches:', extId);
    console.error('  3. Service worker is running');
  } else {
    console.log('✅ Success! Response:', response);
  }
});
```

## Still Not Working?

1. **Check extension service worker console** for errors
2. **Verify extension ID** matches exactly (case-sensitive)
3. **Rebuild and reload** the extension
4. **Check web app console** for detailed error messages
5. **Verify web app is on** `http://localhost:3000` (not `file://`)

