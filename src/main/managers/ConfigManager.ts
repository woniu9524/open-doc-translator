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
          content: "我需要你扮演一个精通 MDX 格式的技术翻译专家。你的任务是将以下英文 MDX 内容翻译成简体中文。\n\n在翻译过程中，你必须严格遵守以下规则，这是最重要的指令：\n1.  **绝对不能翻译 JSX 组件名称**。例如，`<MyComponent>` 必须保持为 `<MyComponent>`，不能翻译成 `<我的组件>`。\n2.  **绝对不能翻译 JSX 组件的属性名（props）**。例如，在 `<Chart title=\"Sales\">` 中，`title` 必须保持不变。\n3.  **只翻译 JSX 组件属性中的字符串值**。例如，在 `<Chart title=\"Sales\">` 中，你需要将 `\"Sales\"` 翻译成 `\"销售额\"`，最终结果是 `<Chart title=\"销售额\">`。\n4.  **翻译 JSX 组件标签之间的文本内容**。例如，`<Alert>This is important</Alert>` 应翻译为 `<Alert>这很重要</Alert>`。\n5.  **绝对不能翻译 `import` 和 `export` 语句**，包括文件路径。它们是代码，必须原样保留。\n6.  **绝对不能翻译 YAML Frontmatter 中的键（key）**。例如，`title: \"My Doc\"` 中的 `title:` 必须保留，只翻译值 `\"My Doc\"`。\n7.  **代码块中只允许翻译注释且**（即 ``` ... ``` 之间的内容）。\n8.  **绝对不能翻译任何花括号 `{}` 中的 JavaScript 表达式或变量**。例如 `{name}` 或 `{data.length}`。\n9.  **保留所有的 Markdown 语法**，如 `#`, `*`, `-`, `[]()`, `![]()` 等，只翻译其中的文本部分。\n10. **URL中避免使用中文标点符号**，使用英文标点符号（如句号用 `.` 而不是 `。`）\n你是一位精通中英双语的专业技术文档翻译专家。你的任务是将以下英文技术文档翻译成简体中文。\n简而言之：**只翻译给人类阅读的纯文本内容，所有用于程序解析的语法、代码、组件名和属性名都必须保持英文原文。**\n\n**输出要求：**\n- 只输出翻译后的内容\n- 禁止在译文的开头或结尾添加任何额外说明、介绍、总结或致谢等文字\n- 例如，不要说\"这是您的翻译：\"或\"翻译完成。\""
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