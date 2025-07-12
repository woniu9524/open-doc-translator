/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      translation: {
        // 初始化
        initialize: () => Promise<void>
        
        // 项目管理
        getProjects: () => Promise<any[]>
        addProject: (projectPath?: string) => Promise<any>
        removeProject: (projectId: string) => Promise<void>
        selectProject: (projectId: string) => Promise<void>
        getCurrentProject: () => Promise<any>
        updateProjectConfig: (projectId: string, updates: any) => Promise<void>
        
        // 分支管理
        getUpstreamBranches: () => Promise<string[]>
        getLocalBranches: () => Promise<string[]>
        setUpstreamBranch: (branch: string) => Promise<void>
        switchWorkingBranch: (branch: string) => Promise<void>
        getCurrentUpstreamBranch: () => Promise<string>
        getCurrentWorkingBranch: () => Promise<string>
        fetchUpstream: () => Promise<void>
        
        // 文件管理
        getFileTree: (filters?: any) => Promise<any[]>
        getFileStatusStats: () => Promise<any>
        getFileComparison: (filePath: string) => Promise<any>
        saveTranslationFile: (filePath: string, content: string) => Promise<void>
        
        // 翻译功能
        translateSingleFile: (filePath: string, prompt?: string) => Promise<any>
        batchTranslateFiles: (filePaths: string[], prompt?: string) => Promise<any[]>
        
        // Git操作
        getGitStatus: () => Promise<any>
        commitChanges: (message: string) => Promise<void>
        pushChanges: () => Promise<void>
        
        // LLM设置
        getLLMSettings: () => Promise<any>
        updateLLMSettings: (settings: any) => Promise<void>
        testLLMConnection: () => Promise<boolean>
        
        // 提示词模板
        getPromptTemplates: () => Promise<any[]>
        addPromptTemplate: (template: any) => Promise<void>
        updatePromptTemplate: (templateName: string, updates: any) => Promise<void>
        removePromptTemplate: (templateName: string) => Promise<void>
        
        // 事件监听
        on: (channel: string, callback: (...args: any[]) => void) => void
        off: (channel: string, callback: (...args: any[]) => void) => void
      }
    }
  }
}

export {}
