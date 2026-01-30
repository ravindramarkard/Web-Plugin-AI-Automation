import { useState, useEffect, useCallback } from 'react';
import { firewallStore } from '@extension/storage';
import { Button } from '@extension/ui';
import { t } from '@extension/i18n';

interface FirewallSettingsProps {}

export const FirewallSettings = ({}: FirewallSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [activeList, setActiveList] = useState<'allow' | 'deny'>('allow');

  const loadFirewallSettings = useCallback(async () => {
    const settings = await firewallStore.getFirewall();
    setIsEnabled(settings.enabled);
    setAllowList(settings.allowList);
    setDenyList(settings.denyList);
  }, []);

  useEffect(() => {
    loadFirewallSettings();
  }, [loadFirewallSettings]);

  const handleToggleFirewall = async () => {
    await firewallStore.updateFirewall({ enabled: !isEnabled });
    await loadFirewallSettings();
  };

  const handleAddUrl = async () => {
    // Remove http:// or https:// prefixes
    const cleanUrl = newUrl.trim().replace(/^https?:\/\//, '');
    if (!cleanUrl) return;

    if (activeList === 'allow') {
      await firewallStore.addToAllowList(cleanUrl);
    } else {
      await firewallStore.addToDenyList(cleanUrl);
    }
    await loadFirewallSettings();
    setNewUrl('');
  };

  const handleRemoveUrl = async (url: string, listType: 'allow' | 'deny') => {
    if (listType === 'allow') {
      await firewallStore.removeFromAllowList(url);
    } else {
      await firewallStore.removeFromDenyList(url);
    }
    await loadFirewallSettings();
  };

  return (
    <section className="space-y-6">
      <div className="glass-card p-6 text-left">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">{t('options_firewall_header')}</h2>

        <div className="space-y-6">
          <div className="glass-panel my-6 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="toggle-firewall" className="text-base font-medium text-gray-900 dark:text-white">
                {t('options_firewall_enableToggle')}
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleToggleFirewall}
                  className="peer sr-only"
                  id="toggle-firewall"
                />
                <label
                  htmlFor="toggle-firewall"
                  className="block h-6 cursor-pointer overflow-hidden rounded-full bg-gray-200 peer-checked:bg-blue-500 dark:bg-gray-700">
                  <span className="sr-only">{t('options_firewall_toggleFirewall_a11y')}</span>
                  <span
                    className={`block size-6 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mb-6 mt-10 flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                onClick={() => setActiveList('allow')}
                className={`px-4 py-2 text-base transition-colors ${
                  activeList === 'allow'
                    ? 'glass-button bg-blue-600/90 text-white'
                    : 'glass-button bg-gray-200/50 text-gray-700 dark:bg-white/10 dark:text-gray-200'
                }`}>
                {t('options_firewall_allowList_header')}
              </Button>
              <Button
                onClick={() => setActiveList('deny')}
                className={`px-4 py-2 text-base transition-colors ${
                  activeList === 'deny'
                    ? 'glass-button bg-blue-600/90 text-white'
                    : 'glass-button bg-gray-200/50 text-gray-700 dark:bg-white/10 dark:text-gray-200'
                }`}>
                {t('options_firewall_denyList_header')}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex space-x-2">
            <input
              id="url-input"
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddUrl();
                }
              }}
              placeholder={t('options_firewall_placeholders_domainUrl')}
              className="glass-input flex-1 rounded-md px-3 py-2 text-sm"
            />
            <Button
              onClick={handleAddUrl}
              className="glass-button rounded-md bg-green-500/90 px-4 py-2 text-sm text-white hover:bg-green-600">
              {t('options_firewall_btnAdd')}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {activeList === 'allow' ? (
              allowList.length > 0 ? (
                <ul className="space-y-2">
                  {allowList.map(url => (
                    <li key={url} className="glass-panel flex items-center justify-between rounded-md p-2 pr-0">
                      <span className="text-sm text-gray-900 dark:text-white">{url}</span>
                      <Button
                        onClick={() => handleRemoveUrl(url, 'allow')}
                        className="rounded-l-none px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                        {t('options_firewall_btnRemove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('options_firewall_allowList_empty')}
                </p>
              )
            ) : denyList.length > 0 ? (
              <ul className="space-y-2">
                {denyList.map(url => (
                  <li key={url} className="glass-panel flex items-center justify-between rounded-md p-2 pr-0">
                    <span className="text-sm text-gray-900 dark:text-white">{url}</span>
                    <Button
                      onClick={() => handleRemoveUrl(url, 'deny')}
                      className="rounded-l-none px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('options_firewall_denyList_empty')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
