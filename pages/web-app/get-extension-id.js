/**
 * Helper script to extract extension ID from chrome://extensions page
 *
 * Instructions:
 * 1. Go to chrome://extensions
 * 2. Open browser console (F12)
 * 3. Paste this entire script
 * 4. Run: getAITestGenExtensionId()
 * 5. Copy the ID that's displayed
 */

function getAITestGenExtensionId() {
  // Try to find the extension card
  const extensionCards = document.querySelectorAll('extensions-item');

  for (const card of extensionCards) {
    // Get the extension name
    const nameElement = card.shadowRoot?.querySelector('#name');
    const name = nameElement?.textContent?.trim();

    // Check if it's AITestGen
    if (name && (name.includes('AITestGen') || name.includes('AI Automation Agent'))) {
      // Try to get the ID from the card
      const idElement = card.shadowRoot?.querySelector('#extension-id');
      if (idElement) {
        const id = idElement.textContent?.trim();
        console.log('✅ Found AITestGen Extension ID:', id);
        console.log('📋 Copy this ID:', id);

        // Copy to clipboard if possible
        if (navigator.clipboard) {
          navigator.clipboard
            .writeText(id)
            .then(() => {
              console.log('✅ ID copied to clipboard!');
            })
            .catch(() => {
              console.log('⚠️ Could not copy to clipboard, please copy manually');
            });
        }

        return id;
      }
    }
  }

  // Alternative method: look for extension details
  const detailsButtons = document.querySelectorAll('extensions-item');
  for (const card of detailsButtons) {
    const nameElement = card.shadowRoot?.querySelector('#name');
    if (nameElement?.textContent?.includes('AITestGen')) {
      // Try to find ID in the card's data
      const cardElement = card.shadowRoot?.querySelector('#detailsButton');
      if (cardElement) {
        // The ID might be in a data attribute or we need to click details
        console.log('Found AITestGen extension card. Please:');
        console.log('1. Click "Details" on the AITestGen extension');
        console.log('2. Look for "ID:" in the details page');
        console.log('3. Copy the ID shown there');
      }
    }
  }

  console.error('❌ Could not find AITestGen extension ID automatically');
  console.log('Please manually:');
  console.log('1. Find "AITestGen" extension in the list');
  console.log('2. Look for the ID shown under the extension name');
  console.log('3. Copy it');

  return null;
}

// Auto-run if on extensions page
if (window.location.href.startsWith('chrome://extensions')) {
  console.log('🔍 AITestGen Extension ID Finder');
  console.log('Running auto-detection...');
  const id = getAITestGenExtensionId();
  if (id) {
    console.log('\n✅ Extension ID found:', id);
    console.log('Copy this ID and paste it in the web app settings page.');
  }
} else {
  console.log('This script should be run on chrome://extensions page');
  console.log('Go to chrome://extensions, open console, and run: getAITestGenExtensionId()');
}

// Export for manual use
window.getAITestGenExtensionId = getAITestGenExtensionId;
