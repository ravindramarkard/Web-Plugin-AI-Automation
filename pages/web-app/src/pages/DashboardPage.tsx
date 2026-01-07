import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiFolder,
  FiSettings,
  FiPlay,
} from 'react-icons/fi';
import { chatHistoryStore } from '@extension/storage';
import { projectStorage, type Project } from '../lib/projectStorage';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeProjects: number;
  averageExecutionTime: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: 'completed' | 'failed' | 'running';
  timestamp: number;
  duration?: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    activeProjects: 0,
    averageExecutionTime: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load chat sessions (tasks)
      const sessions = await chatHistoryStore.getSessionsMetadata();
      const totalTasks = sessions.length;

      // Calculate completed/failed (simplified - you can enhance this based on actual task status)
      const completedTasks = sessions.filter(s => s.messageCount > 0).length;
      const failedTasks = 0; // You can track this separately if needed

      // Load projects
      const projects = await projectStorage.getAllProjects();
      const activeProjects = projects.length;

      // Get recent tasks
      const recentSessions = sessions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          title: s.title,
          status: s.messageCount > 0 ? 'completed' : ('running' as const),
          timestamp: s.updatedAt,
        }));

      // Calculate average execution time (simplified)
      const averageExecutionTime =
        sessions.length > 0
          ? Math.round(sessions.reduce((acc, s) => acc + (s.updatedAt - s.createdAt), 0) / sessions.length / 1000)
          : 0;

      setStats({
        totalTasks,
        completedTasks,
        failedTasks,
        activeProjects,
        averageExecutionTime,
      });

      setRecentTasks(recentSessions);
      setRecentProjects(projects.slice(0, 4));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div
        className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Automation Dashboard
            </h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Overview of your automation framework
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
              isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            <FiPlay size={18} />
            New Task
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon={FiActivity}
            color="blue"
            isDarkMode={isDarkMode}
          />
          <StatCard
            title="Completed"
            value={stats.completedTasks}
            icon={FiCheckCircle}
            color="green"
            isDarkMode={isDarkMode}
          />
          <StatCard title="Failed" value={stats.failedTasks} icon={FiXCircle} color="red" isDarkMode={isDarkMode} />
          <StatCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={FiFolder}
            color="purple"
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Additional Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MetricCard
            title="Average Execution Time"
            value={`${stats.averageExecutionTime}s`}
            icon={FiClock}
            trend="+12%"
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title="Success Rate"
            value={stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%'}
            icon={FiTrendingUp}
            trend={stats.totalTasks > 0 ? `+${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%'}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Recent Activity & Projects */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <div
            className={`rounded-lg border p-6 ${
              isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Tasks</h2>
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                View All
              </button>
            </div>
            {recentTasks.length === 0 ? (
              <div className={`py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>No tasks yet</p>
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Create your first task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map(task => (
                  <TaskItem key={task.id} task={task} isDarkMode={isDarkMode} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div
            className={`rounded-lg border p-6 ${
              isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Recent Projects
              </h2>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className={`text-sm font-medium ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                View All
              </button>
            </div>
            {recentProjects.length === 0 ? (
              <div className={`py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>No projects yet</p>
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map(project => (
                  <ProjectItem key={project.id} project={project} isDarkMode={isDarkMode} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className={`mt-6 rounded-lg border p-6 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className={`mb-4 text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionButton
              icon={FiPlay}
              label="New Task"
              onClick={() => navigate('/chat')}
              isDarkMode={isDarkMode}
            />
            <QuickActionButton
              icon={FiFolder}
              label="New Project"
              onClick={() => navigate('/projects')}
              isDarkMode={isDarkMode}
            />
            <QuickActionButton
              icon={FiSettings}
              label="Settings"
              onClick={() => navigate('/settings')}
              isDarkMode={isDarkMode}
            />
            <QuickActionButton
              icon={FiActivity}
              label="View Tasks"
              onClick={() => navigate('/chat')}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: 'blue' | 'green' | 'red' | 'purple';
  isDarkMode: boolean;
}

function StatCard({ title, value, icon: Icon, color, isDarkMode }: StatCardProps) {
  const colorClasses = {
    blue: isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600',
    green: isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600',
    red: isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600',
    purple: isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600',
  };

  return (
    <div
      className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend: string;
  isDarkMode: boolean;
}

function MetricCard({ title, value, icon: Icon, trend, isDarkMode }: MetricCardProps) {
  return (
    <div
      className={`rounded-lg border p-6 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`mt-2 text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{trend} from last month</p>
        </div>
        <div
          className={`flex size-14 items-center justify-center rounded-lg ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: RecentTask;
  isDarkMode: boolean;
}

function TaskItem({ task, isDarkMode }: TaskItemProps) {
  const statusColors = {
    completed: isDarkMode ? 'text-green-400' : 'text-green-600',
    failed: isDarkMode ? 'text-red-400' : 'text-red-600',
    running: isDarkMode ? 'text-blue-400' : 'text-blue-600',
  };

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
        isDarkMode ? 'bg-slate-750 border-slate-700 hover:bg-slate-700' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
      }`}>
      <div className="flex-1">
        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {new Date(task.timestamp).toLocaleString()}
        </p>
      </div>
      <div className={`text-sm font-medium ${statusColors[task.status]}`}>
        {task.status === 'completed' ? 'Completed' : task.status === 'failed' ? 'Failed' : 'Running'}
      </div>
    </div>
  );
}

interface ProjectItemProps {
  project: Project;
  isDarkMode: boolean;
}

function ProjectItem({ project, isDarkMode }: ProjectItemProps) {
  const getIconEmoji = (iconValue: string) => {
    const icons: Record<string, string> = {
      folder: '📁',
      rocket: '🚀',
      briefcase: '💼',
      lightbulb: '💡',
      star: '⭐',
      heart: '❤️',
      fire: '🔥',
      gem: '💎',
      trophy: '🏆',
      target: '🎯',
      globe: '🌐',
      code: '💻',
      art: '🎨',
      music: '🎵',
      game: '🎮',
      book: '📚',
    };
    return icons[iconValue] || '📁';
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        isDarkMode ? 'bg-slate-750 border-slate-700 hover:bg-slate-700' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
      }`}>
      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-xl dark:bg-blue-900">
        {getIconEmoji(project.icon)}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{project.name}</p>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{project.team || 'No team'}</p>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  isDarkMode: boolean;
}

function QuickActionButton({ icon: Icon, label, onClick, isDarkMode }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
        isDarkMode ? 'bg-slate-750 border-slate-700 hover:bg-slate-700' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}>
      <div
        className={`flex size-10 items-center justify-center rounded-lg ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
        <Icon size={20} />
      </div>
      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{label}</span>
    </button>
  );
}
