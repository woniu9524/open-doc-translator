import { promises as fs } from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { GlobalConfig, ProjectConfig, LLMSettings, PromptTemplate } from '../types'

export class ConfigManager {
  private configPath: string
  private config: GlobalConfig | null = null

  constructor() {
    // 配置文件存储在用户数据目录下
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'opendoc-config.json')
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): GlobalConfig {
    return {
      projects: [],
      llm_settings: {
        api_key: '',
        base_url: 'https://api.openai.com/v1',
        model: 'gpt-4-turbo',
        temperature: 0.7,
        concurrency: 5
      },
      prompt_templates: [
        {
          name: 'Default Tech Doc',
          content: 'Translate the following Markdown document into Chinese. Keep the original formatting, code blocks, and links intact. Pay attention to technical terms.'
        }
      ]
    }
  }

  /**
   * 确保配置目录存在
   */
  private async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(this.configPath)
    try {
      await fs.access(configDir)
    } catch {
      await fs.mkdir(configDir, { recursive: true })
    }
  }

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<GlobalConfig> {
    try {
      await this.ensureConfigDir()
      const configContent = await fs.readFile(this.configPath, 'utf-8')
      this.config = JSON.parse(configContent)
      
      // 合并默认配置以确保所有必要字段都存在
      const defaultConfig = this.getDefaultConfig()
      this.config = {
        ...defaultConfig,
        ...this.config,
        llm_settings: {
          ...defaultConfig.llm_settings,
          ...(this.config?.llm_settings || {})
        }
      }
      
      return this.config
    } catch (error) {
      console.log('配置文件不存在或损坏，创建默认配置')
      this.config = this.getDefaultConfig()
      await this.saveConfig()
      return this.config
    }
  }

  /**
   * 保存配置文件
   */
  async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('配置未加载')
    }
    
    await this.ensureConfigDir()
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
  }

  /**
   * 获取当前配置
   */
  getConfig(): GlobalConfig {
    if (!this.config) {
      throw new Error('配置未加载，请先调用 loadConfig()')
    }
    return this.config
  }

  /**
   * 添加项目
   */
  async addProject(project: ProjectConfig): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    // 检查项目是否已存在
    const existingProject = this.config!.projects.find(p => p.id === project.id || p.path === project.path)
    if (existingProject) {
      throw new Error('项目已存在')
    }
    
    this.config!.projects.push(project)
    await this.saveConfig()
  }

  /**
   * 更新项目
   */
  async updateProject(projectId: string, updates: Partial<ProjectConfig>): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    const projectIndex = this.config!.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      throw new Error('项目不存在')
    }
    
    this.config!.projects[projectIndex] = {
      ...this.config!.projects[projectIndex],
      ...updates
    }
    await this.saveConfig()
  }

  /**
   * 删除项目
   */
  async removeProject(projectId: string): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    const projectIndex = this.config!.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      throw new Error('项目不存在')
    }
    
    this.config!.projects.splice(projectIndex, 1)
    await this.saveConfig()
  }

  /**
   * 获取项目列表
   */
  getProjects(): ProjectConfig[] {
    if (!this.config) {
      throw new Error('配置未加载')
    }
    return this.config.projects
  }

  /**
   * 根据ID获取项目
   */
  getProject(projectId: string): ProjectConfig | undefined {
    if (!this.config) {
      throw new Error('配置未加载')
    }
    return this.config.projects.find(p => p.id === projectId)
  }

  /**
   * 更新LLM设置
   */
  async updateLLMSettings(settings: Partial<LLMSettings>): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    this.config!.llm_settings = {
      ...this.config!.llm_settings,
      ...settings
    }
    await this.saveConfig()
  }

  /**
   * 获取LLM设置
   */
  getLLMSettings(): LLMSettings {
    if (!this.config) {
      throw new Error('配置未加载')
    }
    return this.config.llm_settings
  }

  /**
   * 添加提示词模板
   */
  async addPromptTemplate(template: PromptTemplate): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    // 检查模板名称是否已存在
    const existingTemplate = this.config!.prompt_templates.find(t => t.name === template.name)
    if (existingTemplate) {
      throw new Error('提示词模板名称已存在')
    }
    
    this.config!.prompt_templates.push(template)
    await this.saveConfig()
  }

  /**
   * 更新提示词模板
   */
  async updatePromptTemplate(templateName: string, updates: Partial<PromptTemplate>): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    const templateIndex = this.config!.prompt_templates.findIndex(t => t.name === templateName)
    if (templateIndex === -1) {
      throw new Error('提示词模板不存在')
    }
    
    this.config!.prompt_templates[templateIndex] = {
      ...this.config!.prompt_templates[templateIndex],
      ...updates
    }
    await this.saveConfig()
  }

  /**
   * 删除提示词模板
   */
  async removePromptTemplate(templateName: string): Promise<void> {
    if (!this.config) {
      await this.loadConfig()
    }
    
    const templateIndex = this.config!.prompt_templates.findIndex(t => t.name === templateName)
    if (templateIndex === -1) {
      throw new Error('提示词模板不存在')
    }
    
    this.config!.prompt_templates.splice(templateIndex, 1)
    await this.saveConfig()
  }

  /**
   * 获取提示词模板列表
   */
  getPromptTemplates(): PromptTemplate[] {
    if (!this.config) {
      throw new Error('配置未加载')
    }
    return this.config.prompt_templates
  }
} 