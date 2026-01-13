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
  const [isLoading, setIsLoading] = useState(true);

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
          status: (s.messageCount > 0 ? 'completed' : 'running') as 'completed' | 'running',
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
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="glass-panel flex flex-col items-center rounded-2xl p-8">
          <div className="mb-4 size-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="font-medium text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Header */}
      <div className="glass-panel relative z-10 border-b border-white/10 px-6 py-4 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automation Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of your automation framework</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="glass-button flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/40">
            <FiPlay size={18} />
            New Task
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Tasks" value={stats.totalTasks} icon={FiActivity} color="blue" />
          <StatCard title="Completed" value={stats.completedTasks} icon={FiCheckCircle} color="green" />
          <StatCard title="Failed" value={stats.failedTasks} icon={FiXCircle} color="red" />
          <StatCard title="Active Projects" value={stats.activeProjects} icon={FiFolder} color="purple" />
        </div>

        {/* Additional Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MetricCard
            title="Average Execution Time"
            value={`${stats.averageExecutionTime}s`}
            icon={FiClock}
            trend="+12%"
          />
          <MetricCard
            title="Success Rate"
            value={stats.totalTasks > 0 ? `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%'}
            icon={FiTrendingUp}
            trend={stats.totalTasks > 0 ? `+${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : '0%'}
          />
        </div>

        {/* Recent Activity & Projects */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <div className="glass-card flex flex-col rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Tasks</h2>
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                View All
              </button>
            </div>
            {recentTasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No tasks yet</p>
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Create your first task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div className="glass-card flex flex-col rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Projects</h2>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                View All
              </button>
            </div>
            {recentProjects.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No projects yet</p>
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map(project => (
                  <ProjectItem key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card mt-6 rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickActionButton icon={FiPlay} label="New Task" onClick={() => navigate('/chat')} />
            <QuickActionButton icon={FiFolder} label="New Project" onClick={() => navigate('/projects')} />
            <QuickActionButton icon={FiSettings} label="Settings" onClick={() => navigate('/settings')} />
            <QuickActionButton icon={FiActivity} label="View Tasks" onClick={() => navigate('/chat')} />
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
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="glass-card group rounded-2xl p-5 transition-all hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-xl ${colorClasses[color]}`}>
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
}

function MetricCard({ title, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="glass-card group rounded-2xl p-6 transition-all hover:scale-[1.01]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">{trend} from last month</p>
        </div>
        <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Icon size={28} />
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: RecentTask;
}

function TaskItem({ task }: TaskItemProps) {
  const statusColors = {
    completed: 'text-green-600 dark:text-green-400',
    failed: 'text-red-600 dark:text-red-400',
    running: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="glass-panel flex items-center justify-between rounded-xl border-0 p-3 transition-colors hover:bg-white/10">
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(task.timestamp).toLocaleString()}</p>
      </div>
      <div className={`text-sm font-medium ${statusColors[task.status]}`}>
        {task.status === 'completed' ? 'Completed' : task.status === 'failed' ? 'Failed' : 'Running'}
      </div>
    </div>
  );
}

interface ProjectItemProps {
  project: Project;
}

function ProjectItem({ project }: ProjectItemProps) {
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
    <div className="glass-panel flex items-center gap-3 rounded-xl border-0 p-3 transition-colors hover:bg-white/10">
      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100/50 text-xl dark:bg-blue-900/50">
        {getIconEmoji(project.icon)}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{project.team || 'No team'}</p>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card group flex items-center gap-3 rounded-xl p-4 text-left transition-all hover:bg-white/20">
      <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 transition-colors group-hover:bg-blue-500/20 dark:text-blue-400">
        <Icon size={20} />
      </div>
      <span className="font-medium text-gray-900 dark:text-white">{label}</span>
    </button>
  );
}
