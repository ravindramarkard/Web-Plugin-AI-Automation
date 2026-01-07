import { useState, useEffect } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTabClick = (tabId: TabTypes) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'firewall':
        return <FirewallSettings isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsSettings isDarkMode={isDarkMode} />;
      case 'extension':
        return <ExtensionSettings />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex h-full ${isDarkMode ? 'bg-slate-900' : "bg-[url('/bg.jpg')] bg-cover bg-center"} ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
      {/* Vertical Navigation Bar */}
      <nav
        className={`w-48 border-r ${isDarkMode ? 'border-slate-700 bg-slate-800/80' : 'border-white/20 bg-[#0EA5E9]/10'} backdrop-blur-sm`}>
        <div className="p-4">
          <div className="mb-4">
            <Link
              to="/chat"
              className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}>
              <FiArrowLeft className="size-4" />
              Back to Chat
            </Link>
          </div>
          <h1 className={`mb-6 text-xl font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {t('options_nav_header')}
          </h1>
          <ul className="space-y-2">
            {TABS.map(item => (
              <li key={item.id}>
                <Button
                  onClick={() => handleTabClick(item.id)}
                  className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left text-base 
                    ${
                      activeTab !== item.id
                        ? `${isDarkMode ? 'bg-slate-700/70 text-gray-300 hover:text-white' : 'bg-[#0EA5E9]/15 font-medium text-gray-700 hover:text-white'} backdrop-blur-sm`
                        : `${isDarkMode ? 'bg-sky-800/50' : ''} text-white backdrop-blur-sm`
                    }`}>
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${isDarkMode ? 'bg-slate-800/50' : 'bg-white/10'} p-8 backdrop-blur-sm`}>
        <div className="mx-auto min-w-[512px] max-w-screen-lg">
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
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
