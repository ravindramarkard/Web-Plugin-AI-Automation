# Quick Fix: Extension Connection Error

## Error: "Could not establish connection. Receiving end does not exist"

This means the extension service worker is **not running** or the **extension ID is wrong**.

## ✅ Quick Fix (3 Steps)

### Step 1: Get the Correct Extension ID

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle top-right)
3. Find **AITestGen** extension
4. **Copy the ID** shown under the extension name
   - ⚠️ For **unpacked extensions**, this ID is **different** from the published ID!
   - It looks like: `abcdefghijklmnopqrstuvwxyz123456`

### Step 2: Reload the Extension

**⚠️ CRITICAL:** After building, you MUST reload the extension!

1. In `chrome://extensions`, find your AITestGen extension
2. Click the **🔄 Reload** button (circular arrow icon)
3. Wait for reload to complete
4. Click the **"service worker"** link (or "background page")
5. Verify it shows **"running"** (not "inactive")
6. Check console - you should see: `background loaded`

### Step 3: Test Connection

1. Go to: `http://localhost:3000/debug-extension.html`
2. Enter the extension ID from Step 1
3. Click "Test Connection"

## 🔍 Debug Tools

- **Debug Tool:** `http://localhost:3000/debug-extension.html`
- **Extension ID Helper:** `http://localhost:3000/get-extension-id-helper.html`

## 📋 Checklist

- [ ] Extension ID is correct (from `chrome://extensions`)
- [ ] Extension is enabled (toggle ON)
- [ ] Extension was reloaded after last build
- [ ] Service worker shows "running" (not "inactive")
- [ ] Web app is at `http://localhost:3000` (not `file://`)
- [ ] No errors in service worker console

## 🛠️ Build & Reload Process

```bash
# 1. Build the extension
pnpm -F chrome-extension build

# 2. Reload extension in chrome://extensions (IMPORTANT!)

# 3. Test connection
# Open: http://localhost:3000/debug-extension.html
```

## ❓ Still Not Working?

1. **Check service worker console** for errors
2. **Verify manifest** has `externally_connectable` configured (it should)
3. **Try a different extension ID** - unpacked extensions get new IDs
4. **Restart Chrome** if service worker won't activate
5. **Check web app origin** matches allowed origins in manifest

