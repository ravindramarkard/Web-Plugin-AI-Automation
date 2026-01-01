/**
 * Extension Connection Diagnostic Script
 *
 * Run this in the browser console on your web app page (http://localhost:3000)
 *
 * This will help diagnose why the extension connection is failing.
 */

async function diagnoseExtensionConnection() {
  console.log('🔍 Starting Extension Connection Diagnostics...\n');

  const results = {
    chromeRuntimeAvailable: false,
    extensionIdConfigured: false,
    extensionId: null,
    pingSuccessful: false,
    pingError: null,
    pingResponse: null,
    originCheck: false,
    serviceWorkerStatus: 'unknown',
  };

  // Step 1: Check if chrome.runtime is available
  console.log('Step 1: Checking chrome.runtime availability...');
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.error('❌ chrome.runtime is not available');
    console.error('   This means you are not using Chrome/Edge browser or the polyfill is not working');
    return results;
  }
  results.chromeRuntimeAvailable = true;
  console.log('✅ chrome.runtime is available\n');

  // Step 2: Check extension ID
  console.log('Step 2: Checking extension ID configuration...');
  const extensionId = localStorage.getItem('extension_id');
  if (!extensionId) {
    console.error('❌ No extension ID found in localStorage');
    console.error('   Please go to Settings → Extension and enter your extension ID');
    return results;
  }
  results.extensionIdConfigured = true;
  results.extensionId = extensionId;
  console.log('✅ Extension ID found:', extensionId);
  console.log('   (from localStorage key: extension_id)\n');

  // Step 3: Check current origin
  console.log('Step 3: Checking current origin...');
  const currentOrigin = window.location.origin;
  console.log('   Current origin:', currentOrigin);
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];
  if (allowedOrigins.includes(currentOrigin)) {
    results.originCheck = true;
    console.log('✅ Origin is in allowed list\n');
  } else {
    console.warn('⚠️  Origin not in standard allowed list');
    console.warn('   Allowed origins in manifest:', allowedOrigins);
    console.warn('   You may need to add this origin to externally_connectable in manifest.js\n');
  }

  // Step 4: Try to ping the extension
  console.log('Step 4: Attempting to ping extension...');
  console.log('   Extension ID:', extensionId);

  try {
    const pingResult = await new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Timeout after 5 seconds - service worker may be inactive',
        });
      }, 5000);

      chrome.runtime.sendMessage(extensionId, { action: 'ping' }, response => {
        clearTimeout(timeout);
        const lastError = chrome.runtime.lastError;

        if (lastError) {
          resolve({
            success: false,
            error: lastError.message,
            response: null,
          });
        } else {
          resolve({
            success: true,
            error: null,
            response: response,
          });
        }
      });
    });

    if (pingResult.success) {
      results.pingSuccessful = true;
      results.pingResponse = pingResult.response;
      console.log('✅ Ping successful!');
      console.log('   Response:', pingResult.response);
    } else {
      results.pingError = pingResult.error;
      console.error('❌ Ping failed:', pingResult.error);

      if (
        pingResult.error.includes('Could not establish connection') ||
        pingResult.error.includes('Receiving end does not exist')
      ) {
        console.error('\n🔧 Troubleshooting steps:');
        console.error('   1. Go to chrome://extensions');
        console.error('   2. Find extension with ID:', extensionId);
        console.error('   3. Click "Reload" button (circular arrow icon)');
        console.error('   4. Click on "service worker" link (if shown)');
        console.error('   5. Check if service worker shows as "running" (not "inactive")');
        console.error('   6. Verify extension is enabled (toggle should be ON)');
        console.error('   7. Check the service worker console for any errors');
      } else if (pingResult.error.includes('Extension context invalidated')) {
        console.error('\n⚠️  Extension was reloaded. Please reload this page and try again.');
      }
    }
  } catch (error) {
    results.pingError = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception during ping:', error);
  }

  console.log('\n📊 Diagnostic Summary:');
  console.log('   chrome.runtime available:', results.chromeRuntimeAvailable ? '✅' : '❌');
  console.log('   Extension ID configured:', results.extensionIdConfigured ? '✅' : '❌');
  console.log('   Extension ID:', results.extensionId || 'N/A');
  console.log('   Origin check:', results.originCheck ? '✅' : '⚠️');
  console.log('   Ping successful:', results.pingSuccessful ? '✅' : '❌');
  if (results.pingError) {
    console.log('   Ping error:', results.pingError);
  }
  if (results.pingResponse) {
    console.log('   Ping response:', results.pingResponse);
  }

  return results;
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('Extension Connection Diagnostic Tool');
  console.log('===================================');
  console.log('Run: diagnoseExtensionConnection()');
  console.log('Or just run the function directly in the console.\n');

  // Make it available globally
  window.diagnoseExtensionConnection = diagnoseExtensionConnection;
}
