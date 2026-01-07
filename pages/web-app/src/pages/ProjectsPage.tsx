import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiGrid, FiList, FiFolder, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { projectStorage, type Project } from '../lib/projectStorage';

type ViewMode = 'grid' | 'list' | 'card';

// Pre-defined icons for projects
export const PROJECT_ICONS = [
  { name: 'Folder', icon: '📁', value: 'folder' },
  { name: 'Rocket', icon: '🚀', value: 'rocket' },
  { name: 'Briefcase', icon: '💼', value: 'briefcase' },
  { name: 'Lightbulb', icon: '💡', value: 'lightbulb' },
  { name: 'Star', icon: '⭐', value: 'star' },
  { name: 'Heart', icon: '❤️', value: 'heart' },
  { name: 'Fire', icon: '🔥', value: 'fire' },
  { name: 'Gem', icon: '💎', value: 'gem' },
  { name: 'Trophy', icon: '🏆', value: 'trophy' },
  { name: 'Target', icon: '🎯', value: 'target' },
  { name: 'Globe', icon: '🌐', value: 'globe' },
  { name: 'Code', icon: '💻', value: 'code' },
  { name: 'Art', icon: '🎨', value: 'art' },
  { name: 'Music', icon: '🎵', value: 'music' },
  { name: 'Game', icon: '🎮', value: 'game' },
  { name: 'Book', icon: '📚', value: 'book' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    icon: 'folder',
  });
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

  const loadProjects = useCallback(async () => {
    try {
      const allProjects = await projectStorage.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingProject) {
        await projectStorage.updateProject(editingProject.id, formData);
      } else {
        await projectStorage.createProject(formData);
      }
      await loadProjects();
      setShowCreateModal(false);
      setEditingProject(null);
      setFormData({ name: '', team: '', icon: 'folder' });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      team: project.team,
      icon: project.icon,
    });
    setShowCreateModal(true);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectStorage.deleteProject(id);
      await loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getIconEmoji = (iconValue: string) => {
    const icon = PROJECT_ICONS.find(i => i.value === iconValue);
    return icon?.icon || '📁';
  };

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div
        className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Projects</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your projects and teams
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div
              className={`flex rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-1`}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <FiGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <FiList size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <FiFolder size={18} />
              </button>
            </div>
            {/* Create Button */}
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setFormData({ name: '', team: '', icon: 'folder' });
                setShowCreateModal(true);
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              <FiPlus size={18} />
              Create Project
            </button>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className={`flex h-full items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-center">
              <FiFolder size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No projects yet</p>
              <p className="mt-2 text-sm">Create your first project to get started</p>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : viewMode === 'list'
                  ? 'space-y-2'
                  : 'grid grid-cols-1 gap-6 sm:grid-cols-2'
            }>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                isDarkMode={isDarkMode}
                onEdit={() => handleEditProject(project)}
                onDelete={() => handleDeleteProject(project.id)}
                onClick={() => navigate(`/projects/${project.id}`)}
                getIconEmoji={getIconEmoji}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateProjectModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateProject}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProject(null);
            setFormData({ name: '', team: '', icon: 'folder' });
          }}
          editingProject={editingProject}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  viewMode: ViewMode;
  isDarkMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  getIconEmoji: (icon: string) => string;
}

function ProjectCard({ project, viewMode, isDarkMode, onEdit, onDelete, onClick, getIconEmoji }: ProjectCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on edit/delete buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onClick();
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors ${
          isDarkMode ? 'hover:bg-slate-750 border-slate-700 bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}>
        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 text-2xl dark:bg-blue-900">
          {getIconEmoji(project.icon)}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{project.name}</h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{project.team || 'No team'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={`rounded p-2 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiEdit2 size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`rounded p-2 transition-colors ${
              isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-gray-100'
            }`}>
            <FiTrash2 size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'card') {
    return (
      <div
        onClick={handleCardClick}
        className={`cursor-pointer rounded-lg border p-6 transition-colors ${
          isDarkMode ? 'hover:bg-slate-750 border-slate-700 bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex size-16 items-center justify-center rounded-xl bg-blue-100 text-4xl dark:bg-blue-900">
            {getIconEmoji(project.icon)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className={`rounded p-2 transition-colors ${
                isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <FiEdit2 size={18} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className={`rounded p-2 transition-colors ${
                isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-gray-100'
              }`}>
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>
        <h3 className={`mb-2 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{project.name}</h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {project.team || 'No team assigned'}
        </p>
        <p className={`mt-4 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      onClick={handleCardClick}
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        isDarkMode ? 'hover:bg-slate-750 border-slate-700 bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100 text-2xl dark:bg-blue-900">
          {getIconEmoji(project.icon)}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiEdit2 size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-gray-100'
            }`}>
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
      <h3 className={`mb-1 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{project.name}</h3>
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{project.team || 'No team'}</p>
    </div>
  );
}

interface CreateProjectModalProps {
  formData: { name: string; team: string; icon: string };
  setFormData: (data: { name: string; team: string; icon: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingProject: Project | null;
  isDarkMode: boolean;
}

function CreateProjectModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  editingProject,
  isDarkMode,
}: CreateProjectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-md rounded-lg border p-6 shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        <h2 className={`mb-4 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {editingProject ? 'Edit Project' : 'Create New Project'}
        </h2>
        <form onSubmit={onSubmit}>
          {/* Project Name */}
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter project name"
            />
          </div>

          {/* Team */}
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Team
            </label>
            <input
              type="text"
              value={formData.team}
              onChange={e => setFormData({ ...formData, team: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter team name"
            />
          </div>

          {/* Icon Selection */}
          <div className="mb-6">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Project Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PROJECT_ICONS.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: icon.value })}
                  className={`flex size-12 items-center justify-center rounded-lg border text-2xl transition-colors ${
                    formData.icon === icon.value
                      ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}>
                  {icon.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
              {editingProject ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
