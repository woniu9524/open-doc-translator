import { FC, useState } from 'react'

interface GitChange {
  path: string
  status: 'modified' | 'added' | 'deleted'
  staged: boolean
}

const GitPanel: FC = () => {
  const [commitMessage, setCommitMessage] = useState('')
  
  // Mock Git变更数据
  const mockChanges: GitChange[] = [
    {
      path: 'docs/getting_started.md',
      status: 'modified',
      staged: false
    },
    {
      path: 'docs/api_reference.md',
      status: 'modified',
      staged: false
    },
    {
      path: 'translation-zh-translation_state.json',
      status: 'modified',
      staged: false
    },
    {
      path: 'docs/core_docs/index.md',
      status: 'added',
      staged: false
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified': return 'M'
      case 'added': return 'A'
      case 'deleted': return 'D'
      default: return '?'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified': return 'text-blue-600 bg-blue-50'
      case 'added': return 'text-green-600 bg-green-50'
      case 'deleted': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Git状态信息 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Git 状态</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">translation-zh</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {mockChanges.length} 个文件有变更
        </div>
      </div>

      {/* 变更列表 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">变更文件</h4>
          <div className="space-y-2">
            {mockChanges.map((change, index) => (
              <div
                key={index}
                className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className={`mr-3 text-xs font-mono w-4 h-4 rounded flex items-center justify-center ${getStatusColor(change.status)}`}>
                  {getStatusIcon(change.status)}
                </span>
                <span className="flex-1 text-sm text-gray-700 truncate" title={change.path}>
                  {change.path}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 提交区域 */}
      <div className="border-t border-gray-100 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              提交信息
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="描述这次变更..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <button 
              className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={mockChanges.length === 0}
            >
              暂存所有
            </button>
            <button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              disabled={!commitMessage.trim() || mockChanges.length === 0}
            >
              提交变更
            </button>
            <button 
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={mockChanges.length === 0}
            >
              推送到远程
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitPanel 