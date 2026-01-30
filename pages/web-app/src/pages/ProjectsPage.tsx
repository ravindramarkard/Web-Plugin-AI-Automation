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
    <div className="flex h-full flex-col bg-transparent">
      {/* Header */}
      <div className="glass sticky top-0 z-10 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your projects and teams</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="glass-panel flex rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-500/80 text-white shadow-sm backdrop-blur-sm'
                    : 'text-gray-600 hover:bg-white/10 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}>
                <FiGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500/80 text-white shadow-sm backdrop-blur-sm'
                    : 'text-gray-600 hover:bg-white/10 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}>
                <FiList size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`rounded px-3 py-1.5 transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-500/80 text-white shadow-sm backdrop-blur-sm'
                    : 'text-gray-600 hover:bg-white/10 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
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
              className="glass-button flex items-center gap-2 rounded-lg bg-blue-600/90 px-4 py-2 font-medium text-white hover:bg-blue-600">
              <FiPlus size={18} />
              Create Project
            </button>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="glass-card rounded-xl p-8 text-center">
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
        />
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  getIconEmoji: (icon: string) => string;
}

function ProjectCard({ project, viewMode, onEdit, onDelete, onClick, getIconEmoji }: ProjectCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on edit/delete buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onClick();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className="glass-card flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-colors hover:bg-white/10 dark:hover:bg-white/5">
        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100/50 text-2xl dark:bg-blue-900/50">
          {getIconEmoji(project.icon)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{project.team || 'No team'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-2 text-gray-600 transition-colors hover:bg-white/20 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            <FiEdit2 size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-2 text-red-600 transition-colors hover:bg-red-100/20 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            <FiTrash2 size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'card') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className="glass-card cursor-pointer rounded-lg p-6 transition-colors hover:bg-white/10 dark:hover:bg-white/5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex size-16 items-center justify-center rounded-xl bg-blue-100/50 text-4xl dark:bg-blue-900/50">
            {getIconEmoji(project.icon)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-2 text-gray-600 transition-colors hover:bg-white/20 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
              <FiEdit2 size={18} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-2 text-red-600 transition-colors hover:bg-red-100/20 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{project.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{project.team || 'No team assigned'}</p>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="glass-card cursor-pointer rounded-lg p-4 transition-colors hover:bg-white/10 dark:hover:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded-lg bg-blue-100/50 text-2xl dark:bg-blue-900/50">
          {getIconEmoji(project.icon)}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-gray-600 transition-colors hover:bg-white/20 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">
            <FiEdit2 size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-100/20 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">{project.name}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{project.team || 'No team'}</p>
    </div>
  );
}

interface CreateProjectModalProps {
  formData: { name: string; team: string; icon: string };
  setFormData: (data: { name: string; team: string; icon: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingProject: Project | null;
}

function CreateProjectModal({ formData, setFormData, onSubmit, onClose, editingProject }: CreateProjectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
      <div className="glass-panel w-full max-w-md scale-100 rounded-2xl p-6 shadow-2xl transition-all">
        <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
          {editingProject ? 'Edit Project' : 'Create New Project'}
        </h2>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Name *
            </label>
            <input
              type="text"
              id="project-name"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="glass-input w-full rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="project-team" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team
            </label>
            <input
              type="text"
              id="project-team"
              value={formData.team}
              onChange={e => setFormData({ ...formData, team: e.target.value })}
              className="glass-input w-full rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter team name"
            />
          </div>

          <div className="mb-6">
            <p className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Project Icon</p>
            <div className="grid grid-cols-8 gap-2">
              {PROJECT_ICONS.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: icon.value })}
                  className={`glass flex size-12 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-white/20 dark:hover:bg-white/10 ${
                    formData.icon === icon.value ? 'bg-blue-100/50 ring-2 ring-blue-500 dark:bg-blue-900/50' : ''
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
              className="glass-button rounded-lg px-4 py-2 font-medium text-gray-700 dark:text-gray-300">
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button rounded-lg bg-blue-600/90 px-4 py-2 font-medium text-white hover:bg-blue-600">
              {editingProject ? 'Update' : 'Create'} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
