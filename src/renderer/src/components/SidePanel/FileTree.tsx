import { FC, useState, useMemo, useEffect, useCallback } from 'react'
import { FileStatus } from '../../types'
import BatchTranslationDialog from './BatchTranslationDialog'

interface FileTreeProps {
  selectedFile: string
  setSelectedFile: (file: string) => void
}

interface FileNode {
  name: string
  path: string
  isFile: boolean
  children?: FileNode[]
  fileInfo?: {
    status: FileStatus
    size: number
    extension: string
    lastModified: string
  }
}

const FileTree: FC<FileTreeProps> = ({ selectedFile, setSelectedFile }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'untranslated' | 'outdated' | 'up_to_date'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minSize, setMinSize] = useState('')
  const [maxSize, setMaxSize] = useState('')
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState<{
    completed: number
    total: number
    current: string
  } | null>(null)

  // 从文件树中提取所有文件扩展名
  const availableExtensions = useMemo(() => {
    const extensions = new Set<string>()
    
    const extractExtensions = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.isFile && node.fileInfo?.extension) {
          extensions.add(node.fileInfo.extension)
        }
        if (node.children) {
          extractExtensions(node.children)
        }
      })
    }
    
    extractExtensions(fileTree)
    return Array.from(extensions).sort()
  }, [fileTree])

  // 过滤后的文件树
  const filteredFileTree = useMemo(() => {
    if (!fileTree.length) return []

    const filterNode = (node: FileNode): FileNode | null => {
      if (node.isFile && node.fileInfo) {
        // 状态过滤
        if (statusFilter !== 'all' && node.fileInfo.status !== statusFilter) {
          return null
        }

        // 搜索过滤
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          const fileName = node.name.toLowerCase()
          const filePath = node.path.toLowerCase()
          if (!fileName.includes(query) && !filePath.includes(query)) {
            return null
          }
        }

        // 扩展名过滤
        if (selectedExtensions.size > 0 && !selectedExtensions.has(node.fileInfo.extension)) {
          return null
        }

        // 大小过滤
        const fileSizeKB = node.fileInfo.size / 1024
        if (minSize && fileSizeKB < parseFloat(minSize)) {
          return null
        }
        if (maxSize && fileSizeKB > parseFloat(maxSize)) {
          return null
        }

        return node
      }

      if (node.children) {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(child => child !== null) as FileNode[]

        if (filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren
          }
        }
      }

      return null
    }

    return fileTree
      .map(node => filterNode(node))
      .filter(node => node !== null) as FileNode[]
  }, [fileTree, statusFilter, searchQuery, selectedExtensions, minSize, maxSize])

  // 加载文件树
  const loadFileTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 首先检查是否有当前项目
      const currentProject = await window.api.translation.getCurrentProject()
      if (!currentProject) {
        // 没有项目时，清空文件树并显示提示
        setFileTree([])
        setError('请先选择一个项目')
        return
      }

      // 不传递过滤参数，让后端返回完整的文件树
      const treeData = await window.api.translation.getFileTree()
      setFileTree(treeData)
      
      // 默认展开第一级目录
      if (treeData.length > 0) {
        const firstLevelDirs = treeData
          .filter(node => !node.isFile)
          .map(node => node.path)
        setExpandedDirs(new Set(firstLevelDirs))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件树失败'
      
      // 如果是"未选择项目"错误，显示友好提示
      if (errorMessage.includes('未选择项目') || errorMessage.includes('鏈€夋嫨椤圭洰')) {
        setError('请先选择一个项目')
        setFileTree([])
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, []) // 移除依赖，因为我们不再传递过滤参数

  // 强制刷新文件树（清除缓存）
  const forceRefreshFileTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 首先检查是否有当前项目
      const currentProject = await window.api.translation.getCurrentProject()
      if (!currentProject) {
        setFileTree([])
        setError('请先选择一个项目')
        return
      }

      // 强制刷新：清除缓存并重新获取数据
      console.log('强制刷新文件树，清除缓存...')
      const treeData = await window.api.translation.getFileTree()
      setFileTree(treeData)
      
      // 默认展开第一级目录
      if (treeData.length > 0) {
        const firstLevelDirs = treeData
          .filter(node => !node.isFile)
          .map(node => node.path)
        setExpandedDirs(new Set(firstLevelDirs))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件树失败'
      
      if (errorMessage.includes('未选择项目') || errorMessage.includes('鏈€夋嫨椤圭洰')) {
        setError('请先选择一个项目')
        setFileTree([])
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载和刷新
  useEffect(() => {
    loadFileTree()
  }, [loadFileTree])

  // 监听翻译进度事件
  useEffect(() => {
    const handleProgress = (progress: any) => {
      setTranslationProgress(progress)
    }

    const handleCompleted = () => {
      setTranslating(false)
      setTranslationProgress(null)
      loadFileTree() // 重新加载文件树
    }

    const handleFileTranslated = (data: any) => {
      if (data.success) {
        loadFileTree() // 单个文件翻译完成后刷新文件树
      }
    }

    const handleError = (error: any) => {
      setError(error.message || '翻译过程中发生错误')
      setTranslating(false)
      setTranslationProgress(null)
    }

    const handleProjectSelected = () => {
      // 项目选择后刷新文件树
      loadFileTree()
    }

    const handleUpstreamFetched = () => {
      // 上游更新后刷新文件树
      loadFileTree()
    }

    // 监听来自主进程的事件
    window.api.translation.on('translation:batch-translation-progress', handleProgress)
    window.api.translation.on('translation:batch-translation-completed', handleCompleted)
    window.api.translation.on('translation:file-translated', handleFileTranslated)
    window.api.translation.on('translation:error', handleError)
    window.api.translation.on('translation:project-selected', handleProjectSelected)
    window.api.translation.on('translation:upstream-fetched', handleUpstreamFetched)

    return () => {
      // 清理事件监听器
      window.api.translation.off('translation:batch-translation-progress', handleProgress)
      window.api.translation.off('translation:batch-translation-completed', handleCompleted)
      window.api.translation.off('translation:file-translated', handleFileTranslated)
      window.api.translation.off('translation:error', handleError)
      window.api.translation.off('translation:project-selected', handleProjectSelected)
      window.api.translation.off('translation:upstream-fetched', handleUpstreamFetched)
    }
  }, [loadFileTree])

  const handleExtensionToggle = (extension: string) => {
    const newSelected = new Set(selectedExtensions)
    if (newSelected.has(extension)) {
      newSelected.delete(extension)
    } else {
      newSelected.add(extension)
    }
    setSelectedExtensions(newSelected)
  }

  const getStatusColor = (status: FileStatus) => {
    switch (status) {
      case FileStatus.UNTRANSLATED: return 'text-gray-400'
      case FileStatus.OUTDATED: return 'text-orange-500'
      case FileStatus.UP_TO_DATE: return 'text-green-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case FileStatus.UNTRANSLATED: return '○'
      case FileStatus.OUTDATED: return '◐'
      case FileStatus.UP_TO_DATE: return '●'
      default: return '○'
    }
  }

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const handleBatchTranslation = async (selectedFiles: string[]) => {
    if (selectedFiles.length === 0) return

    setTranslating(true)
    setTranslationProgress({ completed: 0, total: selectedFiles.length, current: '' })

    try {
      await window.api.translation.batchTranslateFiles(selectedFiles)
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量翻译失败')
      setTranslating(false)
      setTranslationProgress(null)
    }
  }

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path)
    const isSelected = selectedFile === node.path

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (node.isFile) {
              setSelectedFile(node.path)
            } else {
              toggleDirectory(node.path)
            }
          }}
        >
          <span className="mr-3 text-gray-500">
            {node.isFile ? '📄' : (isExpanded ? '📂' : '📁')}
          </span>
          {node.fileInfo && (
            <span className={`mr-3 text-sm ${getStatusColor(node.fileInfo.status)}`}>
              {getStatusIcon(node.fileInfo.status)}
            </span>
          )}
          <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
            {node.name}
          </span>
          {node.fileInfo?.size && (
            <span className="text-xs text-gray-400 ml-2">
              {Math.round(node.fileInfo.size / 1024)}kb
            </span>
          )}
        </div>
        {!node.isFile && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 筛选器区域 */}
      <div className="p-4 border-b border-gray-100 space-y-4">
        {/* 搜索框 */}
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="relative">
              <button
                onClick={loadFileTree}
                onContextMenu={(e) => {
                  e.preventDefault()
                  forceRefreshFileTree()
                }}
                disabled={loading}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="左键：普通刷新，右键：强制刷新（清除缓存）"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* 状态筛选器 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">状态</label>
          <div className="flex gap-1">
            {[
              { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
              { value: 'untranslated', label: '未译', color: 'bg-gray-100 text-gray-600' },
              { value: 'outdated', label: '过时', color: 'bg-orange-100 text-orange-600' },
              { value: 'up_to_date', label: '已译', color: 'bg-green-100 text-green-600' }
            ].map(option => (
              <button
                key={option.value}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  statusFilter === option.value
                    ? 'bg-blue-500 text-white'
                    : `${option.color} hover:bg-opacity-70`
                }`}
                onClick={() => setStatusFilter(option.value as any)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 文件扩展名筛选 */}
        {availableExtensions.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">扩展名</label>
            <div className="flex flex-wrap gap-2">
              {availableExtensions.map(ext => (
                <label key={ext} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={selectedExtensions.has(ext)}
                    onChange={() => handleExtensionToggle(ext)}
                  />
                  <span className="text-xs text-gray-600">.{ext}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 文件大小筛选器 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">大小 (kb)</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="最小"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
            />
            <input
              type="number"
              className="w-20 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="最大"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
            />
          </div>
        </div>

        {/* 批量翻译按钮 */}
        <button
          onClick={() => setBatchDialogOpen(true)}
          disabled={loading || translating}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {translating ? '翻译中...' : '批量翻译'}
        </button>

        {/* 翻译进度 */}
        {translationProgress && (
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>进度: {translationProgress.completed}/{translationProgress.total}</span>
              <span>{Math.round((translationProgress.completed / translationProgress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(translationProgress.completed / translationProgress.total) * 100}%` }}
              />
            </div>
            {translationProgress.current && (
              <div className="mt-1 text-xs text-gray-500 truncate">
                当前: {translationProgress.current}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">加载中...</div>
          </div>
        )}
        
        {error && (
          <div className={`p-4 text-sm rounded-lg m-4 ${
            error.includes('请先选择项目') 
              ? 'text-blue-600 bg-blue-50 border border-blue-200' 
              : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {error.includes('请先选择项目') ? '💡' : '❌'}
              </span>
              <span>{error}</span>
            </div>
            {!error.includes('请先选择项目') && (
              <button
                onClick={loadFileTree}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                重试
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredFileTree.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">没有找到匹配的文件</div>
          </div>
        )}

        {!loading && !error && filteredFileTree.length > 0 && (
          <div>
            {filteredFileTree.map(node => renderFileNode(node))}
          </div>
        )}
      </div>

      {/* 批量翻译对话框 */}
      <BatchTranslationDialog
        isOpen={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        onConfirm={handleBatchTranslation}
        files={fileTree}
      />
    </div>
  )
}

export default FileTree 