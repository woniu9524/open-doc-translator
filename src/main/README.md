# 开放文档翻译工具 - 后端架构

## 概述

本项目实现了一个完整的后端架构，用于支持自动化Git文档翻译工具。后端采用模块化设计，包含以下核心组件：

## 核心模块

### 1. 类型定义 (`types/index.ts`)
- 定义了所有核心数据结构
- 包含项目配置、文件状态、Git状态、翻译任务等类型
- 为整个应用提供类型安全保障

### 2. 管理器模块 (`managers/`)

#### ConfigManager - 配置管理器
- 负责加载、保存和管理全局配置
- 支持项目管理、LLM设置、提示词模板管理
- 配置文件存储在用户数据目录

#### GitManager - Git管理器
- 封装所有Git操作
- 支持分支管理、文件内容获取、状态检查
- 处理翻译状态文件的读写

#### LLMManager - LLM管理器
- 与大语言模型API交互
- 支持单文件和批量翻译
- 支持Markdown和Jupyter Notebook文件
- 包含并发控制和错误处理

#### FileManager - 文件管理器
- 文件状态判定和管理
- 文件树构建和过滤
- 翻译状态统计和更新

### 3. 服务层 (`services/`)

#### TranslationService - 翻译服务
- 主要业务逻辑协调器
- 整合所有管理器功能
- 提供完整的翻译工作流
- 支持事件驱动架构

### 4. IPC通信 (`ipc/`)

#### TranslationIPC - IPC处理器
- 处理前端与后端通信
- 将服务方法暴露给渲染进程
- 事件转发和错误处理

## 主要功能

### 项目管理
- 添加/删除/选择项目
- 项目配置管理
- Git仓库验证

### 分支管理
- 上游分支和工作分支切换
- 从上游拉取更新
- 分支状态检查

### 文件管理
- 文件状态判定（未翻译/已过时/已翻译）
- 文件树构建和过滤
- 文件内容对比

### 翻译功能
- 单文件翻译
- 批量翻译
- 进度跟踪
- 错误处理

### Git操作
- 状态检查
- 提交和推送
- 变更管理

### 设置管理
- LLM API配置
- 提示词模板管理
- 项目规则配置

## 使用方式

### 在主进程中初始化
```typescript
import { TranslationService } from './services/TranslationService'
import { TranslationIPC } from './ipc/TranslationIPC'

const translationService = new TranslationService()
const translationIPC = new TranslationIPC(translationService)

await translationService.initialize()
```

### 在渲染进程中使用
```typescript
// 通过IPC调用后端功能
const projects = await window.electronAPI.invoke('translation:getProjects')
const result = await window.electronAPI.invoke('translation:translateSingleFile', filePath)

// 监听事件
window.electronAPI.on('translation:file-translated', (data) => {
  console.log('文件翻译完成:', data)
})
```

## 配置文件结构

### 全局配置 (`config.json`)
```json
{
  "projects": [
    {
      "id": "project-uuid",
      "name": "项目名称",
      "path": "/path/to/project",
      "remotes": {
        "origin": "git@github.com:user/repo.git",
        "upstream": "https://github.com/original/repo.git"
      },
      "rules": {
        "include_dirs": "docs",
        "file_exts": "md,mdx",
        "special_files": "README.md,CHANGELOG.md"
      },
      "prompt": "自定义翻译提示词"
    }
  ],
  "llm_settings": {
    "api_key": "your-api-key",
    "base_url": "https://api.openai.com/v1",
    "model": "gpt-4-turbo",
    "temperature": 0.7,
    "concurrency": 5
  },
  "prompt_templates": [
    {
      "name": "Default Tech Doc",
      "content": "翻译提示词内容..."
    }
  ]
}
```

### 翻译状态文件 (`{branch}-translation_state.json`)
```json
{
  "docs/getting_started.md": {
    "source_hash": "a1b2c3d4e5f6...",
    "last_translated_at": "2023-10-27T10:00:00Z",
    "translator_version": "1.0"
  }
}
```

## 事件系统

后端使用EventEmitter提供事件驱动架构：

- `initialized` - 服务初始化完成
- `project-added` - 项目添加
- `project-selected` - 项目选择
- `file-translated` - 文件翻译完成
- `batch-translation-progress` - 批量翻译进度
- `upstream-fetched` - 上游更新拉取完成
- `error` - 错误事件

## 错误处理

- 所有异步操作都包含错误处理
- 错误信息通过事件系统传递
- 支持详细的错误堆栈跟踪

## 扩展性

架构支持轻松扩展：
- 新的文件类型翻译策略
- 新的LLM提供商支持
- 新的Git操作
- 新的配置选项


```bash
# 运行测试
npm run test-backend
```

## 依赖项

- `simple-git` - Git操作
- `axios` - HTTP请求
- `uuid` - 唯一ID生成
- `fs-extra` - 文件系统操作增强 