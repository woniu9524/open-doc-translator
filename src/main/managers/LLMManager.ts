import axios, { AxiosInstance } from 'axios'
import { LLMSettings, TranslationTask, TranslationResult } from '../types'

export class LLMManager {
  private client: AxiosInstance
  private settings: LLMSettings
  private readonly MAX_CHUNK_TOKENS = 2000

  constructor(settings: LLMSettings) {
    this.settings = settings
    this.client = axios.create({
      baseURL: settings.base_url,
      timeout: 60000 * 10, // 10分钟超时
      headers: {
        Authorization: `Bearer ${settings.api_key}`,
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
        max_tokens: Math.min(10, this.settings.max_tokens),
        temperature: 0.1,
        stream: true // 开启流式响应
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
    _sourceHash: string,
    onChunk?: (chunk: string) => void
  ): Promise<TranslationResult> {
    try {
      const fileExt = filePath.split('.').pop()?.toLowerCase()

      // 根据文件类型选择不同的翻译策略
      if (fileExt === 'ipynb') {
        return await this.translateJupyterNotebook(filePath, content, prompt, _sourceHash, onChunk)
      } else {
        return await this.translateMarkdown(filePath, content, prompt, _sourceHash, onChunk)
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
    _sourceHash: string,
    onChunk?: (chunk: string) => void
  ): Promise<TranslationResult> {
    try {
      const chunks = this.splitMarkdownContent(content)
      let translatedContent = ''

      for (const chunk of chunks) {
        const translatedChunk = await this.translateTextStream(chunk, prompt, onChunk)
        translatedContent += translatedChunk
      }

      return {
        filePath,
        translatedContent,
        success: true
      }
    } catch (error) {
      console.log(error)
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
    _sourceHash: string,
    onChunk?: (chunk: string) => void
  ): Promise<TranslationResult> {
    try {
      // 解析Jupyter Notebook JSON
      const notebook = JSON.parse(content)
      const translatedNotebook = { ...notebook }

      // 收集所有需要翻译的markdown cells
      const markdownCells: Array<{
        index: number
        content: string
        isArray: boolean
      }> = []

      for (let i = 0; i < translatedNotebook.cells.length; i++) {
        const cell = translatedNotebook.cells[i]

        // 只处理markdown类型的cell
        if (cell.cell_type === 'markdown' && cell.source && cell.source.length > 0) {
          const isArray = Array.isArray(cell.source)
          const cellContent = isArray ? cell.source.join('') : cell.source

          // 如果内容不为空且包含非空白字符，则加入翻译队列
          if (cellContent.trim()) {
            markdownCells.push({
              index: i,
              content: cellContent,
              isArray
            })
          }
        }
      }

      // 如果没有需要翻译的内容，直接返回原文件
      if (markdownCells.length === 0) {
        return {
          filePath,
          translatedContent: JSON.stringify(translatedNotebook, null, 2),
          success: true
        }
      }

      // 批量翻译所有markdown cells
      // 注意：这里为了支持流式展示，我们还是按顺序翻译 cell，或者你可以考虑如何合并流
      // 为了简单起见，按顺序翻译并在每个 cell 完成时通知 chunk
      for (const cellData of markdownCells) {
        const chunks = this.splitMarkdownContent(cellData.content)
        let cellTranslatedContent = ''

        for (const chunk of chunks) {
          const translatedChunk = await this.translateTextStream(chunk, prompt, onChunk)
          cellTranslatedContent += translatedChunk
        }

        if (cellData.isArray) {
          translatedNotebook.cells[cellData.index].source = [cellTranslatedContent]
        } else {
          translatedNotebook.cells[cellData.index].source = cellTranslatedContent
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
    let completedCount = 0

    // 分批处理任务
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency)

      // 并发处理当前批次
      const batchPromises = batch.map(async (task) => {
        try {
          // 更新进度 - 开始处理当前文件
          if (onProgress) {
            onProgress({
              completed: completedCount,
              total: tasks.length,
              current: task.filePath
            })
          }

          const result = await this.translateFile(
            task.filePath,
            task.content,
            prompt,
            task.sourceHash
          )

          // 更新进度 - 完成当前文件
          completedCount++
          if (onProgress) {
            onProgress({
              completed: completedCount,
              total: tasks.length,
              current: task.filePath
            })
          }

          return result
        } catch (error) {
          completedCount++
          if (onProgress) {
            onProgress({
              completed: completedCount,
              total: tasks.length,
              current: task.filePath
            })
          }

          return {
            filePath: task.filePath,
            translatedContent: '',
            success: false,
            error: error instanceof Error ? error.message : '翻译失败'
          }
        }
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
    return new Promise((resolve) => setTimeout(resolve, ms))
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
   * 将 Markdown 内容拆分为更小的块，以避免超过 LLM 的输出限制
   */
  private splitMarkdownContent(
    content: string,
    maxTokens: number = this.MAX_CHUNK_TOKENS
  ): string[] {
    // 首先按标题拆分
    const sections = content.split(/(?=\n#+ )/)
    const chunks: string[] = []
    let currentChunk = ''

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section)

      // 如果单个 section 就超过了限制，需要进一步拆分
      if (sectionTokens > maxTokens) {
        // 如果 currentChunk 不为空，先存入 chunks
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }

        // 按段落拆分
        const paragraphs = section.split(/\n\n+/)
        let pChunk = ''
        for (const p of paragraphs) {
          const pTokens = this.estimateTokens(p)
          // 如果单个段落还是太大，只能按行拆分
          if (pTokens > maxTokens) {
            if (pChunk) {
              chunks.push(pChunk)
              pChunk = ''
            }
            const lines = p.split('\n')
            let lChunk = ''
            for (const l of lines) {
              if (this.estimateTokens(lChunk + '\n' + l) > maxTokens) {
                if (lChunk) chunks.push(lChunk)
                lChunk = l
              } else {
                lChunk = lChunk ? lChunk + '\n' + l : l
              }
            }
            if (lChunk) pChunk = lChunk
          } else if (this.estimateTokens(pChunk + '\n\n' + p) > maxTokens) {
            if (pChunk) chunks.push(pChunk)
            pChunk = p
          } else {
            pChunk = pChunk ? pChunk + '\n\n' + p : p
          }
        }
        if (pChunk) chunks.push(pChunk)
      } else if (this.estimateTokens(currentChunk + section) > maxTokens) {
        if (currentChunk) chunks.push(currentChunk)
        currentChunk = section
      } else {
        currentChunk += section
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * 通过流式 API 翻译文本内容
   */
  private async translateTextStream(
    text: string,
    prompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: text
      }
    ]

    const response = await this.client.post(
      '/chat/completions',
      {
        model: this.settings.model,
        messages,
        temperature: this.settings.temperature,
        max_tokens: Math.min(this.settings.max_tokens, this.estimateTokens(text) * 2),
        stream: true
      },
      {
        responseType: 'stream'
      }
    )

    let fullContent = ''
    const stream = response.data
    let buffer = ''

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine === '' || trimmedLine === 'data: [DONE]') continue
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.replace('data: ', ''))
              const delta = data.choices[0]?.delta?.content || ''
              if (delta) {
                fullContent += delta
                if (onChunk) {
                  onChunk(delta)
                }
              }
            } catch (e) {
              console.error('解析流数据失败:', e, trimmedLine)
            }
          }
        }
      })

      stream.on('end', () => resolve(fullContent))
      stream.on('error', (err: Error) => reject(err))
    })
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
      return ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku']
    }
  }
}
