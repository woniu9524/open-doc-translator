import { FC, useState, useMemo, useEffect } from 'react'
import { FileStatus } from '../../types'

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

interface BatchTranslationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedFiles: string[]) => void
  files: FileNode[]
}

const BatchTranslationDialog: FC<BatchTranslationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  files
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'untranslated' | 'outdated'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set())
  const [minSize, setMinSize] = useState('')
  const [maxSize, setMaxSize] = useState('')

  // 获取所有可翻译的文件（未翻译和已过时）
  const translatableFiles = useMemo(() => {
    const collect = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = []
      for (const node of nodes) {
        if (node.isFile && node.fileInfo) {
          if (node.fileInfo.status === FileStatus.UNTRANSLATED || 
              node.fileInfo.status === FileStatus.OUTDATED) {
            result.push(node)
          }
        }
        if (node.children) {
          result.push(...collect(node.children))
        }
      }
      return result
    }
    return collect(files)
  }, [files])

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
    
    extractExtensions(files)
    return Array.from(extensions).sort()
  }, [files])

  // 过滤后的文件树
  const filteredFileTree = useMemo(() => {
    if (!files.length) return []

    const filterNode = (node: FileNode): FileNode | null => {
      if (node.isFile && node.fileInfo) {
        // 只显示可翻译的文件
        if (node.fileInfo.status !== FileStatus.UNTRANSLATED && 
            node.fileInfo.status !== FileStatus.OUTDATED) {
          return null
        }

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

    return files
      .map(node => filterNode(node))
      .filter(node => node !== null) as FileNode[]
  }, [files, statusFilter, searchQuery, selectedExtensions, minSize, maxSize])

  // 重置选择状态当对话框打开时
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles(new Set())
      setSelectAll(false)
      // 默认展开第一级目录
      if (files.length > 0) {
        const firstLevelDirs = files
          .filter(node => !node.isFile)
          .map(node => node.path)
        setExpandedDirs(new Set(firstLevelDirs))
      }
    }
  }, [isOpen, files])

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(translatableFiles.map(f => f.path)))
    }
    setSelectAll(!selectAll)
  }

  const handleFileToggle = (filePath: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath)
    } else {
      newSelected.add(filePath)
    }
    setSelectedFiles(newSelected)
    setSelectAll(newSelected.size === translatableFiles.length)
  }

  const handleExtensionToggle = (extension: string) => {
    const newSelected = new Set(selectedExtensions)
    if (newSelected.has(extension)) {
      newSelected.delete(extension)
    } else {
      newSelected.add(extension)
    }
    setSelectedExtensions(newSelected)
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

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path)
    const isSelected = selectedFiles.has(node.path)

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (node.isFile) {
              handleFileToggle(node.path)
            } else {
              toggleDirectory(node.path)
            }
          }}
        >
          {node.isFile && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleFileToggle(node.path)}
              className="w-4 h-4 mr-3"
              onClick={(e) => e.stopPropagation()}
            />
          )}
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

  const handleConfirm = () => {
    onConfirm(Array.from(selectedFiles))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-lg font-semibold mb-4">批量翻译</h2>
        
        {/* 筛选器区域 */}
        <div className="space-y-4 mb-4">
          {/* 搜索框 */}
          <div>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 状态筛选器 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">状态</label>
            <div className="flex gap-1">
              {[
                { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
                { value: 'untranslated', label: '未译', color: 'bg-gray-100 text-gray-600' },
                { value: 'outdated', label: '过时', color: 'bg-orange-100 text-orange-600' }
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
        </div>

        {/* 全选和统计信息 */}
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm">全选 ({translatableFiles.length} 个文件)</span>
          </label>
          <span className="text-sm text-gray-500">
            已选择 {selectedFiles.size} 个文件
          </span>
        </div>

        {/* 文件树 */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
          {filteredFileTree.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">没有找到匹配的文件</div>
            </div>
          ) : (
            <div>
              {filteredFileTree.map(node => renderFileNode(node))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedFiles.size === 0}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            开始翻译 ({selectedFiles.size})
          </button>
        </div>
      </div>
    </div>
  )
}

export default BatchTranslationDialog 