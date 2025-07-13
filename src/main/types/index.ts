// 项目配置类型
export interface ProjectConfig {
  id: string
  name: string
  path: string
  remotes: {
    origin: string
    upstream: string
  }
  rules: {
    include_dirs: string
    file_exts: string
    special_files: string
  }
  prompt: string
  upstream_branch?: string  // 保存上次选择的上游分支
}

// LLM配置类型
export interface LLMSettings {
  api_key: string
  base_url: string
  model: string
  temperature: number
  concurrency: number
  max_tokens: number
}

// 提示词模板类型
export interface PromptTemplate {
  name: string
  content: string
}

// 全局配置类型
export interface GlobalConfig {
  projects: ProjectConfig[]
  llm_settings: LLMSettings
  prompt_templates: PromptTemplate[]
}

// 翻译状态类型
export interface TranslationState {
  [filePath: string]: {
    source_hash: string
    last_translated_at: string
    translator_version: string
  }
}

// 文件状态枚举
export enum FileStatus {
  UNTRANSLATED = 'untranslated',
  OUTDATED = 'outdated',
  UP_TO_DATE = 'up_to_date'
}

// 文件信息类型
export interface FileInfo {
  path: string
  status: FileStatus
  size: number
  lastModified: string
  extension: string
  sourceHash?: string
  recordedHash?: string
}

// Git状态类型
export interface GitStatus {
  modified: string[]
  added: string[]
  deleted: string[]
  renamed: string[]
  staged: string[]
  untracked: string[]
}

// 翻译任务类型
export interface TranslationTask {
  filePath: string
  content: string
  sourceHash: string
}

// 翻译结果类型
export interface TranslationResult {
  filePath: string
  translatedContent: string
  success: boolean
  error?: string
}

// 批量翻译进度类型
export interface BatchTranslationProgress {
  total: number
  completed: number
  failed: number
  current: string
  errors: Array<{
    filePath: string
    error: string
  }>
} 