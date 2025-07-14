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
        concurrency: 5,
        max_tokens: 4000
      },
      prompt_templates: [
        {
          name: 'mdx格式翻译',
          content:"你是一位精通 MDX 的技术翻译专家，请将英文 MDX 内容翻译为简体中文，要求符合中文阅读习惯，不要僵硬的翻译，我们的目标不仅是翻译更是方便读者阅读，所以适当修改是可以接受的，翻译不一定需要完全和原文一致。\n\n## 核心原则\n只翻译供人类阅读的文本，所有代码及程序语法部分（如组件名、属性名、变量、链接）必须保持英文原文。\n\n## 翻译准则\n\n### 需要翻译的内容：\n- Markdown 纯文本\n- JSX 标签间的文本：`<Alert>Translate this text.</Alert>`\n- JSX 属性的字符串值：`<Chart title=\"Translate this value\" />`\n- 代码中的常规注释：`// Translate this comment.`\n- YAML Frontmatter 的值：`title: \"Translate this\"`\n\n### 必须保持原文不变的内容：\n- JSX 组件名和属性名：`<MyComponent propName={...}>`\n- 花括号 `{}` 内的所有内容\n- 所有代码，包括 import/export 语句\n- URL 和文件路径\n- YAML Frontmatter 的键：`title:`\n\n### 格式要求：\n- URL 之后不能直接跟句号，可以用空格代替\n- 保持原文的所有格式、代码块、换行和缩进\n- 代码示例的注释和解释要翻译，但代码本身不变\n\n\n### 专业术语处理：\n- 技术概念首次出现时可以采用\"中文（English）\"的形式\n- 后续出现可以只用中文或保持英文，以阅读流畅为准\n\n## 输出要求\n- 直接返回翻译后的 MDX 内容\n- 严格保持原文的格式、代码和换行\n- 不要添加任何额外的说明或总结\n- 确保翻译后的内容在 MDX 解析器中不会产生语法错误"
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