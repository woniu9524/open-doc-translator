import axios, { AxiosInstance } from 'axios'
import { LLMSettings, TranslationTask, TranslationResult } from '../types'

export class LLMManager {
  private client: AxiosInstance
  private settings: LLMSettings

  constructor(settings: LLMSettings) {
    this.settings = settings
    this.client = axios.create({
      baseURL: settings.base_url,
      timeout: 60000, // 60秒超时
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * 更新LLM设置
   */
  updateSettings(settings: LLMSettings): void {
    this.settings = settings
    this.client.defaults.baseURL = settings.base_url
    this.client.defaults.headers['Authorization'] = `Bearer ${settings.api_key}`
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_tokens: 10,
        temperature: 0.1
      })
      
      return response.status === 200
    } catch (error) {
      console.error('LLM连接测试失败:', error)
      return false
    }
  }

  /**
   * 翻译单个文件
   */
  async translateFile(
    filePath: string,
    content: string,
    prompt: string,
    _sourceHash: string
  ): Promise<TranslationResult> {
    try {
      const fileExt = filePath.split('.').pop()?.toLowerCase()
      
      // 根据文件类型选择不同的翻译策略
      if (fileExt === 'ipynb') {
        return await this.translateJupyterNotebook(filePath, content, prompt, _sourceHash)
      } else {
        return await this.translateMarkdown(filePath, content, prompt, _sourceHash)
      }
    } catch (error) {
      return {
        filePath,
        translatedContent: '',
        success: false,
        error: error instanceof Error ? error.message : '翻译失败'
      }
    }
  }

  /**
   * 翻译Markdown文件
   */
  private async translateMarkdown(
    filePath: string,
    content: string,
    prompt: string,
    _sourceHash: string
  ): Promise<TranslationResult> {
    try {
      const messages = [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: `请翻译以下Markdown文档：\n\n${content}`
        }
      ]

      const response = await this.client.post('/chat/completions', {
        model: this.settings.model,
        messages,
        temperature: this.settings.temperature,
        max_tokens: Math.min(4000, content.length * 2) // 估算输出长度
      })

      const translatedContent = response.data.choices[0]?.message?.content || ''
      
      return {
        filePath,
        translatedContent,
        success: true
      }
    } catch (error) {
      throw new Error(`翻译Markdown文件失败: ${error}`)
    }
  }

  /**
   * 翻译Jupyter Notebook文件
   */
  private async translateJupyterNotebook(
    filePath: string,
    content: string,
    prompt: string,
    _sourceHash: string
  ): Promise<TranslationResult> {
    try {
      // 解析Jupyter Notebook JSON
      const notebook = JSON.parse(content)
      const translatedNotebook = { ...notebook }

      // 遍历所有cells
      for (let i = 0; i < translatedNotebook.cells.length; i++) {
        const cell = translatedNotebook.cells[i]
        
        // 只翻译markdown类型的cell
        if (cell.cell_type === 'markdown' && cell.source && cell.source.length > 0) {
          const cellContent = Array.isArray(cell.source) 
            ? cell.source.join('') 
            : cell.source

          // 如果内容不为空且包含非空白字符，则进行翻译
          if (cellContent.trim()) {
            const messages = [
              {
                role: 'system',
                content: `${prompt}\n\n特别注意：这是Jupyter Notebook中的Markdown单元格内容，请保持原有的格式和结构。`
              },
              {
                role: 'user',
                content: `请翻译以下Markdown内容：\n\n${cellContent}`
              }
            ]

            const response = await this.client.post('/chat/completions', {
              model: this.settings.model,
              messages,
              temperature: this.settings.temperature,
              max_tokens: Math.min(2000, cellContent.length * 2)
            })

            const translatedContent = response.data.choices[0]?.message?.content || cellContent
            
            // 更新cell内容，保持原有的格式（数组或字符串）
            if (Array.isArray(cell.source)) {
              translatedNotebook.cells[i].source = translatedContent.split('\n').map(line => line + '\n')
            } else {
              translatedNotebook.cells[i].source = translatedContent
            }
          }
        }
      }

      return {
        filePath,
        translatedContent: JSON.stringify(translatedNotebook, null, 2),
        success: true
      }
    } catch (error) {
      throw new Error(`翻译Jupyter Notebook文件失败: ${error}`)
    }
  }

  /**
   * 批量翻译文件
   */
  async translateBatch(
    tasks: TranslationTask[],
    prompt: string,
    onProgress?: (progress: { completed: number; total: number; current: string }) => void
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = []
    const concurrency = this.settings.concurrency
    
    // 分批处理任务
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency)
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (task) => {
        const result = await this.translateFile(
          task.filePath,
          task.content,
          prompt,
          task.sourceHash
        )
        
        // 更新进度
        if (onProgress) {
          onProgress({
            completed: results.length + 1,
            total: tasks.length,
            current: task.filePath
          })
        }
        
        return result
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 在批次之间添加短暂延迟，避免API限流
      if (i + concurrency < tasks.length) {
        await this.delay(1000) // 1秒延迟
      }
    }
    
    return results
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 估算token数量（粗略估算）
   */
  private estimateTokens(text: string): number {
    // 粗略估算：英文约4个字符一个token，中文约1.5个字符一个token
    const englishChars = text.match(/[a-zA-Z\s]/g)?.length || 0
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0
    const otherChars = text.length - englishChars - chineseChars
    
    return Math.ceil(englishChars / 4 + chineseChars / 1.5 + otherChars / 3)
  }

  /**
   * 获取模型列表（如果API支持）
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models')
      return response.data.data?.map((model: any) => model.id) || []
    } catch {
      // 如果API不支持获取模型列表，返回常见模型
      return [
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'claude-3-sonnet',
        'claude-3-haiku'
      ]
    }
  }
} 