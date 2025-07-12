import { ipcMain, dialog } from 'electron'
import { TranslationService } from '../services/TranslationService'
import { FileStatus, LLMSettings, PromptTemplate } from '../types'

export class TranslationIPC {
  private translationService: TranslationService

  constructor(translationService: TranslationService) {
    this.translationService = translationService
    this.setupIpcHandlers()
  }

  private setupIpcHandlers(): void {
    // 初始化
    ipcMain.handle('translation:initialize', async () => {
      return await this.translationService.initialize()
    })

    // 项目管理
    ipcMain.handle('translation:getProjects', () => {
      return this.translationService.getProjects()
    })

    ipcMain.handle('translation:addProject', async (_, projectPath?: string) => {
      if (!projectPath) {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: '选择项目目录'
        })
        
        if (result.canceled || result.filePaths.length === 0) {
          throw new Error('用户取消选择')
        }
        
        projectPath = result.filePaths[0]
      }
      
      return await this.translationService.addProject(projectPath)
    })

    ipcMain.handle('translation:removeProject', async (_, projectId: string) => {
      return await this.translationService.removeProject(projectId)
    })

    ipcMain.handle('translation:selectProject', async (_, projectId: string) => {
      return await this.translationService.selectProject(projectId)
    })

    ipcMain.handle('translation:getCurrentProject', () => {
      return this.translationService.getCurrentProject()
    })

    ipcMain.handle('translation:updateProjectConfig', async (_, projectId: string, updates: any) => {
      return await this.translationService.updateProjectConfig(projectId, updates)
    })

    // 分支管理
    ipcMain.handle('translation:getUpstreamBranches', async () => {
      return await this.translationService.getUpstreamBranches()
    })

    ipcMain.handle('translation:getLocalBranches', async () => {
      return await this.translationService.getLocalBranches()
    })

    ipcMain.handle('translation:setUpstreamBranch', async (_, branch: string) => {
      return await this.translationService.setUpstreamBranch(branch)
    })

    ipcMain.handle('translation:switchWorkingBranch', async (_, branch: string) => {
      return await this.translationService.switchWorkingBranch(branch)
    })

    ipcMain.handle('translation:getCurrentUpstreamBranch', () => {
      return this.translationService.getCurrentUpstreamBranch()
    })

    ipcMain.handle('translation:getCurrentWorkingBranch', () => {
      return this.translationService.getCurrentWorkingBranch()
    })

    ipcMain.handle('translation:fetchUpstream', async () => {
      return await this.translationService.fetchUpstream()
    })

    // 文件管理
    ipcMain.handle('translation:getFileTree', async (_, filters?: {
      status?: FileStatus[]
      sizeMin?: number
      sizeMax?: number
      searchText?: string
    }) => {
      return await this.translationService.getFileTree(filters)
    })

    ipcMain.handle('translation:getFileStatusStats', async () => {
      return await this.translationService.getFileStatusStats()
    })

    ipcMain.handle('translation:getFileComparison', async (_, filePath: string) => {
      return await this.translationService.getFileComparison(filePath)
    })

    ipcMain.handle('translation:saveTranslationFile', async (_, filePath: string, content: string) => {
      return await this.translationService.saveTranslationFile(filePath, content)
    })

    // 翻译功能
    ipcMain.handle('translation:translateSingleFile', async (_, filePath: string, prompt?: string) => {
      return await this.translationService.translateSingleFile(filePath, prompt)
    })

    ipcMain.handle('translation:batchTranslateFiles', async (_, filePaths: string[], prompt?: string) => {
      return await this.translationService.batchTranslateFiles(filePaths, prompt)
    })

    // Git操作
    ipcMain.handle('translation:getGitStatus', async () => {
      return await this.translationService.getGitStatus()
    })

    ipcMain.handle('translation:commitChanges', async (_, message: string) => {
      return await this.translationService.commitChanges(message)
    })

    ipcMain.handle('translation:pushChanges', async () => {
      return await this.translationService.pushChanges()
    })

    // LLM设置
    ipcMain.handle('translation:getLLMSettings', () => {
      return this.translationService.getLLMSettings()
    })

    ipcMain.handle('translation:updateLLMSettings', async (_, settings: Partial<LLMSettings>) => {
      return await this.translationService.updateLLMSettings(settings)
    })

    ipcMain.handle('translation:testLLMConnection', async () => {
      return await this.translationService.testLLMConnection()
    })

    // 提示词模板
    ipcMain.handle('translation:getPromptTemplates', () => {
      return this.translationService.getPromptTemplates()
    })

    ipcMain.handle('translation:addPromptTemplate', async (_, template: PromptTemplate) => {
      return await this.translationService.addPromptTemplate(template)
    })

    ipcMain.handle('translation:updatePromptTemplate', async (_, templateName: string, updates: Partial<PromptTemplate>) => {
      return await this.translationService.updatePromptTemplate(templateName, updates)
    })

    ipcMain.handle('translation:removePromptTemplate', async (_, templateName: string) => {
      return await this.translationService.removePromptTemplate(templateName)
    })

    // 事件转发
    this.setupEventForwarding()
  }

  private setupEventForwarding(): void {
    // 将服务事件转发到渲染进程
    this.translationService.on('initialized', () => {
      this.sendToRenderer('translation:initialized')
    })

    this.translationService.on('project-added', (project) => {
      this.sendToRenderer('translation:project-added', project)
    })

    this.translationService.on('project-removed', (projectId) => {
      this.sendToRenderer('translation:project-removed', projectId)
    })

    this.translationService.on('project-selected', (project) => {
      this.sendToRenderer('translation:project-selected', project)
    })

    this.translationService.on('project-config-updated', (data) => {
      this.sendToRenderer('translation:project-config-updated', data)
    })

    this.translationService.on('upstream-branch-changed', (branch) => {
      this.sendToRenderer('translation:upstream-branch-changed', branch)
    })

    this.translationService.on('working-branch-changed', (branch) => {
      this.sendToRenderer('translation:working-branch-changed', branch)
    })

    this.translationService.on('upstream-fetched', () => {
      this.sendToRenderer('translation:upstream-fetched')
    })

    this.translationService.on('file-translated', (data) => {
      this.sendToRenderer('translation:file-translated', data)
    })

    this.translationService.on('batch-translation-progress', (progress) => {
      this.sendToRenderer('translation:batch-translation-progress', progress)
    })

    this.translationService.on('batch-translation-completed', (results) => {
      this.sendToRenderer('translation:batch-translation-completed', results)
    })

    this.translationService.on('translation-file-saved', (filePath) => {
      this.sendToRenderer('translation:translation-file-saved', filePath)
    })

    this.translationService.on('changes-committed', (message) => {
      this.sendToRenderer('translation:changes-committed', message)
    })

    this.translationService.on('changes-pushed', () => {
      this.sendToRenderer('translation:changes-pushed')
    })

    this.translationService.on('llm-settings-updated', (settings) => {
      this.sendToRenderer('translation:llm-settings-updated', settings)
    })

    this.translationService.on('prompt-template-added', (template) => {
      this.sendToRenderer('translation:prompt-template-added', template)
    })

    this.translationService.on('prompt-template-updated', (data) => {
      this.sendToRenderer('translation:prompt-template-updated', data)
    })

    this.translationService.on('prompt-template-removed', (templateName) => {
      this.sendToRenderer('translation:prompt-template-removed', templateName)
    })

    this.translationService.on('error', (error) => {
      this.sendToRenderer('translation:error', {
        message: error.message,
        stack: error.stack
      })
    })
  }

  private sendToRenderer(channel: string, data?: any): void {
    // 获取所有窗口并发送事件
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    })
  }
} 