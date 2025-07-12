import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { ConfigManager } from '../managers/ConfigManager'
import { GitManager } from '../managers/GitManager'
import { LLMManager } from '../managers/LLMManager'
import { FileManager, FileTreeNode } from '../managers/FileManager'
import {
  ProjectConfig,
  FileStatus,
  GitStatus,
  TranslationTask,
  TranslationResult,
  LLMSettings,
  PromptTemplate
} from '../types'

export class TranslationService extends EventEmitter {
  private configManager: ConfigManager
  private gitManagers: Map<string, GitManager> = new Map()
  private fileManagers: Map<string, FileManager> = new Map()
  private llmManager: LLMManager | null = null
  private currentProjectId: string | null = null
  private currentUpstreamBranch: string = 'upstream/main'
  private currentWorkingBranch: string = 'main'

  constructor() {
    super()
    this.configManager = new ConfigManager()
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    try {
      // 加载配置
      await this.configManager.loadConfig()
      
      // 初始化LLM管理器
      const llmSettings = this.configManager.getLLMSettings()
      this.llmManager = new LLMManager(llmSettings)
      
      this.emit('initialized')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 获取项目列表
   */
  getProjects(): ProjectConfig[] {
    return this.configManager.getProjects()
  }

  /**
   * 添加项目
   */
  async addProject(projectPath: string): Promise<ProjectConfig> {
    try {
      // 验证是否为Git仓库
      const gitManager = new GitManager(projectPath)
      const isGitRepo = await gitManager.isGitRepository()
      if (!isGitRepo) {
        throw new Error('所选目录不是Git仓库')
      }

      // 获取远程仓库信息
      const remotes = await gitManager.getRemotes()
      if (!remotes.origin) {
        throw new Error('未找到origin远程仓库')
      }
      if (!remotes.upstream) {
        throw new Error('未找到upstream远程仓库')
      }

      // 创建项目配置
      const projectId = uuidv4()
      const projectName = projectPath.split(/[/\\]/).pop() || 'Unknown Project'
      
      const projectConfig: ProjectConfig = {
        id: projectId,
        name: projectName,
        path: projectPath,
        remotes: {
          origin: remotes.origin,
          upstream: remotes.upstream
        },
        rules: {
          include_dirs: 'docs',
          file_exts: 'md,mdx',
          special_files: ''
        },
        prompt: '',
        upstream_branch: 'upstream/main'  // 设置默认上游分支
      }

      // 保存项目配置
      await this.configManager.addProject(projectConfig)
      
      this.emit('project-added', projectConfig)
      return projectConfig
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 删除项目
   */
  async removeProject(projectId: string): Promise<void> {
    try {
      await this.configManager.removeProject(projectId)
      
      // 清理相关资源
      this.gitManagers.delete(projectId)
      this.fileManagers.delete(projectId)
      
      if (this.currentProjectId === projectId) {
        this.currentProjectId = null
      }
      
      this.emit('project-removed', projectId)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 选择当前项目
   */
  async selectProject(projectId: string): Promise<void> {
    try {
      const project = this.configManager.getProject(projectId)
      if (!project) {
        throw new Error('项目不存在')
      }

      this.currentProjectId = projectId
      
      // 初始化或获取Git管理器
      if (!this.gitManagers.has(projectId)) {
        const gitManager = new GitManager(project.path)
        this.gitManagers.set(projectId, gitManager)
        
        const fileManager = new FileManager(gitManager, project)
        this.fileManagers.set(projectId, fileManager)
      }

      // 获取当前工作分支（从Git仓库获取）
      const gitManager = this.gitManagers.get(projectId)!
      this.currentWorkingBranch = await gitManager.getCurrentBranch()
      
      // 从项目配置中恢复上游分支设置
      if (project.upstream_branch) {
        this.currentUpstreamBranch = project.upstream_branch
      } else {
        // 如果没有保存的上游分支，使用默认值
        this.currentUpstreamBranch = 'upstream/main'
      }
      
      this.emit('project-selected', project)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 获取当前项目
   */
  getCurrentProject(): ProjectConfig | null {
    if (!this.currentProjectId) {
      return null
    }
    return this.configManager.getProject(this.currentProjectId) || null
  }

  /**
   * 获取上游分支列表
   */
  async getUpstreamBranches(): Promise<string[]> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const gitManager = this.gitManagers.get(this.currentProjectId)!
    return await gitManager.getUpstreamBranches()
  }

  /**
   * 获取本地分支列表
   */
  async getLocalBranches(): Promise<string[]> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const gitManager = this.gitManagers.get(this.currentProjectId)!
    const branches = await gitManager.getBranches()
    return branches.local
  }

  /**
   * 切换上游分支
   */
  async setUpstreamBranch(branch: string): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    try {
      this.currentUpstreamBranch = branch
      
      // 保存上游分支到项目配置
      await this.configManager.updateProject(this.currentProjectId, {
        upstream_branch: branch
      })
      
      this.emit('upstream-branch-changed', branch)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 切换工作分支
   */
  async switchWorkingBranch(branch: string): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      await gitManager.checkoutBranch(branch)
      this.currentWorkingBranch = branch
      
      this.emit('working-branch-changed', branch)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 从上游拉取更新
   */
  async fetchUpstream(): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      await gitManager.fetchUpstream()
      
      this.emit('upstream-fetched')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 获取文件树
   */
  async getFileTree(filters?: {
    status?: FileStatus[]
    sizeMin?: number
    sizeMax?: number
    searchText?: string
  }): Promise<FileTreeNode[]> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const fileManager = this.fileManagers.get(this.currentProjectId)!
    return await fileManager.getFileTree(
      this.currentUpstreamBranch,
      this.currentWorkingBranch,
      filters
    )
  }

  /**
   * 获取文件状态统计
   */
  async getFileStatusStats(): Promise<{
    total: number
    untranslated: number
    outdated: number
    upToDate: number
  }> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const fileManager = this.fileManagers.get(this.currentProjectId)!
    return await fileManager.getFileStatusStats(
      this.currentUpstreamBranch,
      this.currentWorkingBranch
    )
  }

  /**
   * 获取Git状态
   */
  async getGitStatus(): Promise<GitStatus> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const gitManager = this.gitManagers.get(this.currentProjectId)!
    return await gitManager.getStatus()
  }

  /**
   * 获取文件内容对比
   */
  async getFileComparison(filePath: string): Promise<{
    original: string
    translated: string
    exists: boolean
  }> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const gitManager = this.gitManagers.get(this.currentProjectId)!
    
    try {
      const original = await gitManager.getFileContent(this.currentUpstreamBranch, filePath)
      const exists = await gitManager.translationFileExists(filePath)
      const translated = exists ? await gitManager.readTranslationFile(filePath) : ''
      
      return { original, translated, exists }
    } catch (error) {
      throw new Error(`获取文件对比失败: ${error}`)
    }
  }

  /**
   * 保存翻译文件
   */
  async saveTranslationFile(filePath: string, content: string): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    const gitManager = this.gitManagers.get(this.currentProjectId)!
    await gitManager.writeTranslationFile(filePath, content)
    
    this.emit('translation-file-saved', filePath)
  }

  /**
   * 翻译单个文件
   */
  async translateSingleFile(filePath: string, prompt?: string): Promise<TranslationResult> {
    if (!this.currentProjectId || !this.llmManager) {
      throw new Error('未选择项目或LLM未初始化')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      const fileManager = this.fileManagers.get(this.currentProjectId)!
      
      // 获取文件内容和hash
      const content = await gitManager.getFileContent(this.currentUpstreamBranch, filePath)
      const sourceHash = await gitManager.getFileHash(this.currentUpstreamBranch, filePath)
      
      if (!sourceHash) {
        throw new Error('无法获取文件hash')
      }
      
      // 使用项目配置的prompt或传入的prompt
      const project = this.getCurrentProject()!
      const translationPrompt = prompt || project.prompt || this.getDefaultPrompt()
      
      // 执行翻译
      const result = await this.llmManager.translateFile(filePath, content, translationPrompt, sourceHash)
      
      if (result.success) {
        // 保存翻译结果
        await gitManager.writeTranslationFile(filePath, result.translatedContent)
        
        // 更新翻译状态
        await fileManager.updateTranslationState(this.currentWorkingBranch, filePath, sourceHash)
        
        this.emit('file-translated', { filePath, success: true })
      } else {
        this.emit('file-translated', { filePath, success: false, error: result.error })
      }
      
      return result
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 批量翻译文件
   */
  async batchTranslateFiles(
    filePaths: string[],
    prompt?: string
  ): Promise<TranslationResult[]> {
    if (!this.currentProjectId || !this.llmManager) {
      throw new Error('未选择项目或LLM未初始化')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      const fileManager = this.fileManagers.get(this.currentProjectId)!
      
      // 准备翻译任务
      const tasks: TranslationTask[] = []
      
      for (const filePath of filePaths) {
        const content = await gitManager.getFileContent(this.currentUpstreamBranch, filePath)
        const sourceHash = await gitManager.getFileHash(this.currentUpstreamBranch, filePath)
        
        if (sourceHash) {
          tasks.push({
            filePath,
            content,
            sourceHash
          })
        }
      }
      
      // 使用项目配置的prompt或传入的prompt
      const project = this.getCurrentProject()!
      const translationPrompt = prompt || project.prompt || this.getDefaultPrompt()
      
      // 执行批量翻译
      const results = await this.llmManager.translateBatch(
        tasks,
        translationPrompt,
        (progress) => {
          this.emit('batch-translation-progress', progress)
        }
      )
      
      // 保存成功的翻译结果并更新状态
      const updates: Array<{ filePath: string; sourceHash: string }> = []
      
      for (const result of results) {
        if (result.success) {
          await gitManager.writeTranslationFile(result.filePath, result.translatedContent)
          
          const task = tasks.find(t => t.filePath === result.filePath)
          if (task) {
            updates.push({
              filePath: result.filePath,
              sourceHash: task.sourceHash
            })
          }
        }
      }
      
      // 批量更新翻译状态
      if (updates.length > 0) {
        await fileManager.batchUpdateTranslationState(this.currentWorkingBranch, updates)
      }
      
      this.emit('batch-translation-completed', results)
      return results
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 提交更改
   */
  async commitChanges(message: string): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      await gitManager.stageAll()
      await gitManager.commit(message)
      
      this.emit('changes-committed', message)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 推送更改
   */
  async pushChanges(): Promise<void> {
    if (!this.currentProjectId) {
      throw new Error('未选择项目')
    }
    
    try {
      const gitManager = this.gitManagers.get(this.currentProjectId)!
      await gitManager.push('origin', this.currentWorkingBranch)
      
      this.emit('changes-pushed')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 更新LLM设置
   */
  async updateLLMSettings(settings: Partial<LLMSettings>): Promise<void> {
    try {
      await this.configManager.updateLLMSettings(settings)
      
      if (this.llmManager) {
        this.llmManager.updateSettings(this.configManager.getLLMSettings())
      }
      
      this.emit('llm-settings-updated', settings)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 获取LLM设置
   */
  getLLMSettings(): LLMSettings {
    return this.configManager.getLLMSettings()
  }

  /**
   * 测试LLM连接
   */
  async testLLMConnection(): Promise<boolean> {
    if (!this.llmManager) {
      throw new Error('LLM未初始化')
    }
    
    return await this.llmManager.testConnection()
  }

  /**
   * 获取提示词模板列表
   */
  getPromptTemplates(): PromptTemplate[] {
    return this.configManager.getPromptTemplates()
  }

  /**
   * 添加提示词模板
   */
  async addPromptTemplate(template: PromptTemplate): Promise<void> {
    try {
      await this.configManager.addPromptTemplate(template)
      this.emit('prompt-template-added', template)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 更新提示词模板
   */
  async updatePromptTemplate(templateName: string, updates: Partial<PromptTemplate>): Promise<void> {
    try {
      await this.configManager.updatePromptTemplate(templateName, updates)
      this.emit('prompt-template-updated', { templateName, updates })
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 删除提示词模板
   */
  async removePromptTemplate(templateName: string): Promise<void> {
    try {
      await this.configManager.removePromptTemplate(templateName)
      this.emit('prompt-template-removed', templateName)
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 更新项目配置
   */
  async updateProjectConfig(projectId: string, updates: Partial<ProjectConfig>): Promise<void> {
    try {
      await this.configManager.updateProject(projectId, updates)
      
      // 如果是当前项目，更新文件管理器
      if (projectId === this.currentProjectId) {
        const project = this.configManager.getProject(projectId)!
        const gitManager = this.gitManagers.get(projectId)!
        const fileManager = new FileManager(gitManager, project)
        this.fileManagers.set(projectId, fileManager)
      }
      
      this.emit('project-config-updated', { projectId, updates })
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 获取默认提示词
   */
  private getDefaultPrompt(): string {
    const templates = this.getPromptTemplates()
    return templates[0]?.content || 'Translate the following document into Chinese.'
  }

  /**
   * 获取当前上游分支
   */
  getCurrentUpstreamBranch(): string {
    return this.currentUpstreamBranch
  }

  /**
   * 获取当前工作分支
   */
  getCurrentWorkingBranch(): string {
    return this.currentWorkingBranch
  }
} 