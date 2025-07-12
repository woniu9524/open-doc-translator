import { FC, useState, useMemo } from 'react'

interface FileTreeProps {
  selectedFile: string
  setSelectedFile: (file: string) => void
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  status: 'untranslated' | 'outdated' | 'translated'
  children?: FileNode[]
  size?: number
  extension?: string
}

const FileTree: FC<FileTreeProps> = ({ selectedFile, setSelectedFile }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'untranslated' | 'outdated' | 'translated'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minSize, setMinSize] = useState('')
  const [maxSize, setMaxSize] = useState('')
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set())
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['docs']))

  // Mock数据
  const mockFileTree: FileNode[] = [
    {
      name: 'docs',
      path: 'docs',
      type: 'directory',
      status: 'translated',
      children: [
        {
          name: 'getting_started.md',
          path: 'docs/getting_started.md',
          type: 'file',
          status: 'translated',
          size: 15,
          extension: 'md'
        },
        {
          name: 'api_reference.md',
          path: 'docs/api_reference.md',
          type: 'file',
          status: 'outdated',
          size: 45,
          extension: 'md'
        },
        {
          name: 'config.json',
          path: 'docs/config.json',
          type: 'file',
          status: 'untranslated',
          size: 5,
          extension: 'json'
        },
        {
          name: 'core_docs',
          path: 'docs/core_docs',
          type: 'directory',
          status: 'translated',
          children: [
            {
              name: 'index.md',
              path: 'docs/core_docs/index.md',
              type: 'file',
              status: 'untranslated',
              size: 8,
              extension: 'md'
            },
            {
              name: 'advanced.md',
              path: 'docs/core_docs/advanced.md',
              type: 'file',
              status: 'outdated',
              size: 32,
              extension: 'md'
            },
            {
              name: 'guide.txt',
              path: 'docs/core_docs/guide.txt',
              type: 'file',
              status: 'translated',
              size: 12,
              extension: 'txt'
            }
          ]
        }
      ]
    }
  ]

  // 从文件树中提取所有文件扩展名
  const availableExtensions = useMemo(() => {
    const extensions = new Set<string>()
    
    const extractExtensions = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file' && node.extension) {
          extensions.add(node.extension)
        }
        if (node.children) {
          extractExtensions(node.children)
        }
      })
    }
    
    extractExtensions(mockFileTree)
    return Array.from(extensions).sort()
  }, [mockFileTree])

  const handleExtensionToggle = (extension: string) => {
    const newSelected = new Set(selectedExtensions)
    if (newSelected.has(extension)) {
      newSelected.delete(extension)
    } else {
      newSelected.add(extension)
    }
    setSelectedExtensions(newSelected)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'untranslated': return 'text-gray-400'
      case 'outdated': return 'text-orange-500'
      case 'translated': return 'text-green-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'untranslated': return '○'
      case 'outdated': return '◐'
      case 'translated': return '●'
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
            if (node.type === 'directory') {
              toggleDirectory(node.path)
            } else {
              setSelectedFile(node.path)
            }
          }}
        >
          <span className="mr-3 text-gray-500">
            {node.type === 'directory' ? (isExpanded ? '📂' : '📁') : '📄'}
          </span>
          <span className={`mr-3 text-sm ${getStatusColor(node.status)}`}>
            {getStatusIcon(node.status)}
          </span>
          <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>
            {node.name}
          </span>
          {node.type === 'file' && node.size && (
            <span className="text-xs text-gray-400 ml-2">{node.size}kb</span>
          )}
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
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
              { value: 'outdated', label: '过时', color: 'bg-orange-100 text-orange-600' },
              { value: 'translated', label: '已译', color: 'bg-green-100 text-green-600' }
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

        {/* 文件扩展名筛选 - 并排布局 */}
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

        {/* 文件大小筛选器 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">大小 (kb)</label>
          <div className="flex gap-2">
            <input
              type="number"
              className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="最小"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
            />
            <input
              type="number"
              className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="最大"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
            />
          </div>
        </div>

        {/* 批量翻译按钮 */}
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-3 rounded-lg transition-colors font-medium">
          批量翻译
        </button>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-auto">
        {mockFileTree.map(node => renderFileNode(node))}
      </div>
    </div>
  )
}

export default FileTree 