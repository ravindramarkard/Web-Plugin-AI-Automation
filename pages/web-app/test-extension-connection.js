/**
 * E2E Test Script for Web App to Extension Connection
 *
 * To use this script:
 * 1. Open the web app at http://localhost:3000
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Or run: await testExtensionConnection('obdjgoklifihgkklclbcjkpejipfjhkm')
 */

async function testExtensionConnection(extensionId = 'obdjgoklifihgkklclbcjkpejipfjhkm') {
  console.log('🧪 Starting E2E Extension Connection Test...\n');
  console.log('Extension ID:', extensionId);
  console.log('Current URL:', window.location.href);
  console.log('');

  const results = {
    ping: false,
    checkLLMConfigured: false,
    syncProvider: false,
    syncAgentModel: false,
    overall: false,
  };

  // Test 1: Ping Extension
  console.log('📡 Test 1: Ping Extension');
  try {
    const pingResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(extensionId, { action: 'ping' }, response => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (pingResponse && pingResponse.success) {
      console.log('✅ Ping successful:', pingResponse);
      results.ping = true;
    } else {
      console.error('❌ Ping failed:', pingResponse);
    }
  } catch (error) {
    console.error('❌ Ping error:', error.message);
    console.error('   Make sure:');
    console.error('   1. Extension is installed and enabled');
    console.error('   2. Extension ID is correct');
    console.error('   3. Extension has been reloaded');
    console.error('   4. Web app URL matches allowed origins in manifest');
  }
  console.log('');

  // Test 2: Check LLM Configuration
  console.log('🔍 Test 2: Check LLM Configuration');
  try {
    const checkResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(extensionId, { action: 'check_llm_configured' }, response => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (checkResponse && checkResponse.success) {
      console.log('✅ LLM check successful:', checkResponse.data);
      results.checkLLMConfigured = true;
    } else {
      console.error('❌ LLM check failed:', checkResponse);
    }
  } catch (error) {
    console.error('❌ LLM check error:', error.message);
  }
  console.log('');

  // Test 3: Sync LLM Provider (mock data)
  console.log('🔄 Test 3: Sync LLM Provider');
  try {
    const mockProvider = {
      type: 'openai',
      apiKey: 'test-key-12345',
      baseUrl: 'https://api.openai.com/v1',
    };

    const syncProviderResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        extensionId,
        {
          action: 'sync_llm_provider',
          data: {
            providerId: 'test_provider',
            providerConfig: mockProvider,
          },
        },
        response => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
          } else {
            resolve(response);
          }
        },
      );
    });

    if (syncProviderResponse && syncProviderResponse.success) {
      console.log('✅ Provider sync successful:', syncProviderResponse);
      results.syncProvider = true;
    } else {
      console.error('❌ Provider sync failed:', syncProviderResponse);
    }
  } catch (error) {
    console.error('❌ Provider sync error:', error.message);
  }
  console.log('');

  // Test 4: Sync Agent Model (mock data)
  console.log('🤖 Test 4: Sync Agent Model');
  try {
    const mockModelConfig = {
      provider: 'test_provider',
      modelName: 'gpt-4',
      parameters: {
        temperature: 0.1,
        topP: 0.1,
      },
    };

    const syncModelResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        extensionId,
        {
          action: 'sync_agent_model',
          data: {
            agentName: 'navigator',
            modelConfig: mockModelConfig,
          },
        },
        response => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
          } else {
            resolve(response);
          }
        },
      );
    });

    if (syncModelResponse && syncModelResponse.success) {
      console.log('✅ Agent model sync successful:', syncModelResponse);
      results.syncAgentModel = true;
    } else {
      console.error('❌ Agent model sync failed:', syncModelResponse);
    }
  } catch (error) {
    console.error('❌ Agent model sync error:', error.message);
  }
  console.log('');

  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  console.log(`Ping: ${results.ping ? '✅' : '❌'}`);
  console.log(`Check LLM Configured: ${results.checkLLMConfigured ? '✅' : '❌'}`);
  console.log(`Sync Provider: ${results.syncProvider ? '✅' : '❌'}`);
  console.log(`Sync Agent Model: ${results.syncAgentModel ? '✅' : '❌'}`);

  results.overall = results.ping && results.checkLLMConfigured && results.syncProvider && results.syncAgentModel;
  console.log(`\n${results.overall ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);

  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testExtensionConnection = testExtensionConnection;
  console.log('✅ Test function loaded. Run: await testExtensionConnection()');
}
