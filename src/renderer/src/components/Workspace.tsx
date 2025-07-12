import { FC } from 'react'

interface WorkspaceProps {
  selectedFile: string
}

const Workspace: FC<WorkspaceProps> = ({ selectedFile }) => {
  const mockOriginalContent = `# Getting Started

Welcome to our documentation! This guide will help you get started with our platform.

## Installation

To install the package, run:

\`\`\`bash
npm install our-package
\`\`\`

## Basic Usage

Here's a simple example:

\`\`\`javascript
import { createApp } from 'our-package'

const app = createApp()
app.start()
\`\`\`

## Configuration

You can configure the app by passing options:

\`\`\`javascript
const app = createApp({
  port: 3000,
  debug: true
})
\`\`\``

  const mockTranslatedContent = `# 开始使用

欢迎来到我们的文档！本指南将帮助您开始使用我们的平台。

## 安装

要安装包，请运行：

\`\`\`bash
npm install our-package
\`\`\`

## 基本用法

这是一个简单的例子：

\`\`\`javascript
import { createApp } from 'our-package'

const app = createApp()
app.start()
\`\`\`

## 配置

您可以通过传递选项来配置应用：

\`\`\`javascript
const app = createApp({
  port: 3000,
  debug: true
})
\`\`\``

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">选择文件进行翻译</h3>
          <p className="text-sm">从左侧文件树中选择一个文件来查看和编辑翻译</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 顶部信息栏 */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium text-gray-700">
            {selectedFile}
          </div>
          <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
            已过时
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors">
            重新翻译
          </button>
          <button className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors">
            保存
          </button>
        </div>
      </div>

      {/* 双栏对比视图 */}
      <div className="flex-1 flex">
        {/* 左侧原文 */}
        <div className="flex-1 border-r border-gray-200">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">原文</h3>
          </div>
          <div className="p-4 h-full overflow-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {mockOriginalContent}
            </pre>
          </div>
        </div>

        {/* 右侧译文 */}
        <div className="flex-1">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">译文</h3>
          </div>
          <div className="p-4 h-full">
            <textarea
              className="w-full h-full resize-none border-none outline-none text-sm font-mono"
              value={mockTranslatedContent}
              onChange={() => {}}
              placeholder="翻译内容将显示在这里..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workspace 