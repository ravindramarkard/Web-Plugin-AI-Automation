import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@extension/ui';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiShield, FiTrendingUp, FiArrowLeft, FiLink } from 'react-icons/fi';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { ModelSettings } from '../components/settings/ModelSettings';
import { FirewallSettings } from '../components/settings/FirewallSettings';
import { AnalyticsSettings } from '../components/settings/AnalyticsSettings';
import ExtensionSettings from '../components/settings/ExtensionSettings';
import '../Settings.css';

type TabTypes = 'general' | 'models' | 'firewall' | 'analytics' | 'extension';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'firewall', icon: FiShield, label: t('options_tabs_firewall') },
  { id: 'analytics', icon: FiTrendingUp, label: 'Analytics' },
  { id: 'extension', icon: FiLink, label: 'Extension' },
];

interface SettingsPageProps {
  projectId?: string;
}

const SettingsPage = ({ projectId }: SettingsPageProps = {}) => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');

  const handleTabClick = (tabId: TabTypes) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'models':
        return <ModelSettings projectId={projectId} />;
      case 'firewall':
        return <FirewallSettings />;
      case 'analytics':
        return <AnalyticsSettings />;
      case 'extension':
        return <ExtensionSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-transparent text-gray-900 dark:text-gray-200">
      {/* Vertical Navigation Bar */}
      <nav className="glass-panel w-56 border-y-0 border-l-0 border-r border-white/10">
        <div className="p-4">
          <div className="mb-6">
            <Link
              to="/chat"
              className="group flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/20">
                <FiArrowLeft className="size-4" />
              </div>
              <span className="font-medium">Back to Chat</span>
            </Link>
          </div>
          <h1 className="mb-6 px-2 text-xl font-bold text-gray-900 dark:text-white">{t('options_nav_header')}</h1>
          <ul className="space-y-2">
            {TABS.map(item => (
              <li key={item.id}>
                <Button
                  onClick={() => handleTabClick(item.id)}
                  className={`flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all
                    ${
                      activeTab === item.id
                        ? 'glass-button bg-blue-600/90 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-600 hover:bg-white/10 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}>
                  <item.icon className="size-5" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto min-w-[512px] max-w-screen-lg">
          <div className="glass-card mb-6 rounded-lg border-l-4 border-l-yellow-400 bg-yellow-50/30 p-4 dark:bg-yellow-900/10">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Browser automation features require the Chrome extension. The web app provides the
              chat interface and can work with LLM providers, but full automation capabilities are available in the
              extension.
            </p>
          </div>
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SettingsPage, <div>Loading...</div>), <div>Error Occurred</div>);
