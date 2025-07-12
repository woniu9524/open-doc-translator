import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 翻译服务API
  translation: {
    // 初始化
    initialize: () => ipcRenderer.invoke('translation:initialize'),
    
    // 项目管理
    getProjects: () => ipcRenderer.invoke('translation:getProjects'),
    addProject: (projectPath?: string) => ipcRenderer.invoke('translation:addProject', projectPath),
    removeProject: (projectId: string) => ipcRenderer.invoke('translation:removeProject', projectId),
    selectProject: (projectId: string) => ipcRenderer.invoke('translation:selectProject', projectId),
    getCurrentProject: () => ipcRenderer.invoke('translation:getCurrentProject'),
    updateProjectConfig: (projectId: string, updates: any) => ipcRenderer.invoke('translation:updateProjectConfig', projectId, updates),
    
    // 分支管理
    getUpstreamBranches: () => ipcRenderer.invoke('translation:getUpstreamBranches'),
    getLocalBranches: () => ipcRenderer.invoke('translation:getLocalBranches'),
    setUpstreamBranch: (branch: string) => ipcRenderer.invoke('translation:setUpstreamBranch', branch),
    switchWorkingBranch: (branch: string) => ipcRenderer.invoke('translation:switchWorkingBranch', branch),
    getCurrentUpstreamBranch: () => ipcRenderer.invoke('translation:getCurrentUpstreamBranch'),
    getCurrentWorkingBranch: () => ipcRenderer.invoke('translation:getCurrentWorkingBranch'),
    fetchUpstream: () => ipcRenderer.invoke('translation:fetchUpstream'),
    
    // 文件管理
    getFileTree: (filters?: any) => ipcRenderer.invoke('translation:getFileTree', filters),
    getFileStatusStats: () => ipcRenderer.invoke('translation:getFileStatusStats'),
    getFileComparison: (filePath: string) => ipcRenderer.invoke('translation:getFileComparison', filePath),
    saveTranslationFile: (filePath: string, content: string) => ipcRenderer.invoke('translation:saveTranslationFile', filePath, content),
    
    // 翻译功能
    translateSingleFile: (filePath: string, prompt?: string) => ipcRenderer.invoke('translation:translateSingleFile', filePath, prompt),
    batchTranslateFiles: (filePaths: string[], prompt?: string) => ipcRenderer.invoke('translation:batchTranslateFiles', filePaths, prompt),
    
    // Git操作
    getGitStatus: () => ipcRenderer.invoke('translation:getGitStatus'),
    commitChanges: (message: string) => ipcRenderer.invoke('translation:commitChanges', message),
    pushChanges: () => ipcRenderer.invoke('translation:pushChanges'),
    
    // LLM设置
    getLLMSettings: () => ipcRenderer.invoke('translation:getLLMSettings'),
    updateLLMSettings: (settings: any) => ipcRenderer.invoke('translation:updateLLMSettings', settings),
    testLLMConnection: () => ipcRenderer.invoke('translation:testLLMConnection'),
    
    // 提示词模板
    getPromptTemplates: () => ipcRenderer.invoke('translation:getPromptTemplates'),
    addPromptTemplate: (template: any) => ipcRenderer.invoke('translation:addPromptTemplate', template),
    updatePromptTemplate: (templateName: string, updates: any) => ipcRenderer.invoke('translation:updatePromptTemplate', templateName, updates),
    removePromptTemplate: (templateName: string) => ipcRenderer.invoke('translation:removePromptTemplate', templateName),
    
    // 事件监听
    on: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    },
    
    off: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.off(channel, callback)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
