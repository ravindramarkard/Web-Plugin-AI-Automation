# Fix: Service Worker Not Running

## Quick Fix (Most Common Solution)

1. **Open `chrome://extensions`**
2. **Find your AITestGen extension**
3. **Click the 🔄 Reload button** (circular arrow icon)
4. **Click "service worker" link** (or "background page")
5. **Verify it shows "running"** and console shows `background loaded`

## Detailed Troubleshooting

### Step 1: Check Service Worker Status

1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Find **AITestGen** extension
4. Look for **"service worker"** link (or "background page")
5. Click it to open the service worker console
6. Check the status:
   - ✅ **"running"** = Service worker is active
   - ❌ **"inactive"** = Service worker is not running (needs fix)

### Step 2: Check for Errors

In the service worker console, look for:

- ✅ **`background loaded`** = Service worker started successfully
- ❌ **Red error messages** = These indicate the problem
- ❌ **No messages at all** = Service worker didn't start

### Step 3: Common Issues & Fixes

#### Issue 1: Service Worker is "Inactive"

**Symptoms:**
- Service worker shows "inactive" in chrome://extensions
- No console output when clicking "service worker"

**Fix:**
1. Click **🔄 Reload** button on the extension
2. Wait for reload to complete
3. Click "service worker" again
4. Should now show "running"

#### Issue 2: Build Errors

**Symptoms:**
- Error: "Failed to load service worker"
- Error: "Service worker registration failed"

**Fix:**
```bash
# 1. Rebuild the extension
pnpm -F chrome-extension build

# 2. Check for build errors
# If there are errors, fix them first

# 3. Reload extension in chrome://extensions
```

#### Issue 3: Syntax/Runtime Errors

**Symptoms:**
- Red errors in service worker console
- "Uncaught SyntaxError"
- "Failed to import module"

**Fix:**
```bash
# 1. Check TypeScript errors
pnpm -F chrome-extension type-check

# 2. Fix any errors shown

# 3. Rebuild
pnpm -F chrome-extension build

# 4. Reload extension
```

#### Issue 4: Missing Dependencies

**Symptoms:**
- "Cannot find module"
- "Failed to resolve import"

**Fix:**
```bash
# 1. Reinstall dependencies
pnpm install

# 2. Rebuild
pnpm -F chrome-extension build

# 3. Reload extension
```

#### Issue 5: Service Worker Crashes Immediately

**Symptoms:**
- Service worker starts then immediately goes inactive
- Errors in console about crashes

**Fix:**
1. Check service worker console for the error
2. Look for:
   - Infinite loops
   - Memory issues
   - Unhandled promise rejections
   - Missing error handling
3. Fix the error and reload

### Step 4: Verify Service Worker is Running

After fixing issues:

1. **Reload extension** (🔄 button)
2. **Click "service worker"** link
3. **Verify:**
   - Status shows **"running"**
   - Console shows **`background loaded`**
   - No red error messages
4. **Test connection:**
   - Go to `http://localhost:3000/debug-extension.html`
   - Enter extension ID
   - Click "Test Connection"
   - Should now work! ✅

## Debug Tools

- **Service Worker Debug Tool:** `http://localhost:3000/service-worker-debug.html`
- **Connection Debug Tool:** `http://localhost:3000/debug-extension.html`
- **Extension ID Helper:** `http://localhost:3000/get-extension-id-helper.html`

## Prevention

To prevent service worker issues:

1. **Always reload extension after building:**
   ```bash
   pnpm -F chrome-extension build
   # Then reload in chrome://extensions
   ```

2. **Check for errors before reloading:**
   ```bash
   pnpm -F chrome-extension type-check
   ```

3. **Keep service worker console open** while developing to catch errors early

4. **Handle all errors gracefully** in the background script

## Still Not Working?

If service worker still won't start:

1. **Check Chrome version** - Update Chrome if outdated
2. **Restart Chrome completely** - Close all windows and restart
3. **Remove and re-add extension:**
   - Remove extension in chrome://extensions
   - Load unpacked again from `dist/` folder
4. **Check for conflicting extensions** - Disable other extensions temporarily
5. **Check Chrome DevTools** - Look for additional error details

## Quick Reference

```bash
# Build extension
pnpm -F chrome-extension build

# Check for errors
pnpm -F chrome-extension type-check

# Then in Chrome:
# 1. Go to chrome://extensions
# 2. Click 🔄 Reload on extension
# 3. Click "service worker" to verify it's running
# 4. Test connection at http://localhost:3000/debug-extension.html
```

