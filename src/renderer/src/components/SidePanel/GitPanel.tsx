import { FC, useState, useEffect } from 'react'

interface GitChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  staged: boolean
}

const GitPanel: FC = () => {
  const [commitMessage, setCommitMessage] = useState('')
  const [changes, setChanges] = useState<GitChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentBranch, setCurrentBranch] = useState<string>('')

  // 加载Git状态
  const loadGitStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [status, workingBranch] = await Promise.all([
        window.api.translation.getGitStatus(),
        window.api.translation.getCurrentWorkingBranch()
      ])
      
      setCurrentBranch(workingBranch)
      
      // 将Git状态转换为变更列表
      const allChanges: GitChange[] = []
      
      // 修改的文件
      status.modified.forEach(path => {
        allChanges.push({
          path,
          status: 'modified',
          staged: status.staged.includes(path)
        })
      })
      
      // 新增的文件
      status.added.forEach(path => {
        allChanges.push({
          path,
          status: 'added',
          staged: status.staged.includes(path)
        })
      })
      
      // 删除的文件
      status.deleted.forEach(path => {
        allChanges.push({
          path,
          status: 'deleted',
          staged: status.staged.includes(path)
        })
      })
      
      // 重命名的文件
      status.renamed.forEach(path => {
        allChanges.push({
          path,
          status: 'renamed',
          staged: status.staged.includes(path)
        })
      })
      
      // 未跟踪的文件
      status.untracked.forEach(path => {
        allChanges.push({
          path,
          status: 'added',
          staged: false
        })
      })
      
      setChanges(allChanges)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取Git状态失败')
    } finally {
      setLoading(false)
    }
  }

  // 暂存所有文件
  const handleStageAll = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await window.api.translation.stageAllFiles()
      await loadGitStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : '暂存文件失败')
    } finally {
      setLoading(false)
    }
  }

  // 提交更改
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('请输入提交信息')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await window.api.translation.commitChanges(commitMessage)
      setCommitMessage('')
      await loadGitStatus()
      
      // 显示成功消息
      console.log('提交成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败')
    } finally {
      setLoading(false)
    }
  }

  // 推送更改
  const handlePush = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await window.api.translation.pushChanges()
      
      // 显示成功消息
      console.log('推送成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '推送失败')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时加载Git状态
  useEffect(() => {
    loadGitStatus()
  }, [])

  // 监听项目选择和分支切换事件
  useEffect(() => {
    const handleProjectSelected = () => {
      loadGitStatus()
    }

    const handleBranchChanged = () => {
      loadGitStatus()
    }

    const handleChangesCommitted = () => {
      loadGitStatus()
    }

    const handleFileStaged = () => {
      loadGitStatus()
    }

    const handleChangesPushed = () => {
      loadGitStatus()
    }

    const handleTranslationFileSaved = () => {
      // 文件保存后刷新Git状态
      setTimeout(() => {
        loadGitStatus()
      }, 1000)
    }

    // 监听来自主进程的事件
    window.api.translation.on('translation:project-selected', handleProjectSelected)
    window.api.translation.on('translation:working-branch-changed', handleBranchChanged)
    window.api.translation.on('translation:files-staged', handleFileStaged)
    window.api.translation.on('translation:changes-committed', handleChangesCommitted)
    window.api.translation.on('translation:changes-pushed', handleChangesPushed)
    window.api.translation.on('translation:translation-file-saved', handleTranslationFileSaved)

    return () => {
      // 清理事件监听器
      window.api.translation.off('translation:project-selected', handleProjectSelected)
      window.api.translation.off('translation:working-branch-changed', handleBranchChanged)
      window.api.translation.off('translation:files-staged', handleFileStaged)
      window.api.translation.off('translation:changes-committed', handleChangesCommitted)
      window.api.translation.off('translation:changes-pushed', handleChangesPushed)
      window.api.translation.off('translation:translation-file-saved', handleTranslationFileSaved)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified': return 'M'
      case 'added': return 'A'
      case 'deleted': return 'D'
      case 'renamed': return 'R'
      default: return '?'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'modified': return 'text-blue-600 bg-blue-50'
      case 'added': return 'text-green-600 bg-green-50'
      case 'deleted': return 'text-red-600 bg-red-50'
      case 'renamed': return 'text-purple-600 bg-purple-50'
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
            <span className="text-xs text-gray-500">{currentBranch}</span>
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {changes.length} 个文件有变更
          </div>
          <button
            onClick={loadGitStatus}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <div className="text-sm text-red-600">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            关闭
          </button>
        </div>
      )}

      {/* 变更列表 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-3">变更文件</h4>
          {changes.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              {loading ? '加载中...' : '没有变更的文件'}
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map((change, index) => (
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
                  {change.staged && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      已暂存
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <button 
              onClick={handleStageAll}
              disabled={loading || changes.length === 0}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : '暂存所有'}
            </button>
            <button 
              onClick={handleCommit}
              disabled={loading || !commitMessage.trim() || changes.length === 0}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '提交中...' : '提交变更'}
            </button>
            <button 
              onClick={handlePush}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '推送中...' : '推送到远程'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitPanel 