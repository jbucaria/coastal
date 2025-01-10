// store/projectStore.js

import { create } from 'zustand'

const useProjectStore = create(set => ({
  projects: [], // Array to hold project objects
  addProject: project =>
    set(state => ({ projects: [...state.projects, project] })),
  removeProject: projectId =>
    set(state => ({
      projects: state.projects.filter(p => p.id !== projectId),
    })),
  updateProject: (projectId, updatedData) =>
    set(state => ({
      projects: state.projects.map(p =>
        p.id === projectId ? { ...p, ...updatedData } : p
      ),
    })),
  setProjects: projects => set({ projects }), // To set all projects (useful for syncing with Firestore)
}))

export default useProjectStore
