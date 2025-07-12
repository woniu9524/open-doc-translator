import { FC, useState, useEffect, useCallback } from 'react'
import { FileStatus } from '../types'

interface WorkspaceProps {
  selectedFile: string
}

interface FileData {
  original: string
  translated: string
  exists: boolean
  status?: FileStatus
  lastModified?: string
}

const Workspace: FC<WorkspaceProps> = ({ selectedFile }) => {
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translatedContent, setTranslatedContent] = useState('')

  // 加载文件内容
  const loadFileContent = useCallback(async (filePath: string) => {
    if (!filePath) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 获取文件对比内容
      const comparison = await window.api.translation.getFileComparison(filePath)
      
      // 获取文件树来获取文件状态信息
      const fileTree = await window.api.translation.getFileTree()
      
      // 递归查找文件状态
      const findFileStatus = (nodes: any[], targetPath: string): any => {
        for (const node of nodes) {
          if (node.path === targetPath && node.isFile) {
            return node.fileInfo
          }
          if (node.children) {
            const found = findFileStatus(node.children, targetPath)
            if (found) return found
          }
        }
        return null
      }
      
      const fileInfo = findFileStatus(fileTree, filePath)
      
      const data: FileData = {
        original: comparison.original,
        translated: comparison.translated,
        exists: comparison.exists,
        status: fileInfo?.status || FileStatus.UNTRANSLATED,
        lastModified: fileInfo?.lastModified
      }
      
      setFileData(data)
      setTranslatedContent(comparison.translated)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文件内容失败'
      setError(errorMessage)
      console.error('加载文件内容失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 当选择的文件改变时，加载内容
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile)
    } else {
      setFileData(null)
      setTranslatedContent('')
      setError(null)
    }
  }, [selectedFile, loadFileContent])

  // 保存翻译内容
  const handleSave = async () => {
    if (!selectedFile || !translatedContent) return
    
    setSaving(true)
    
    try {
      await window.api.translation.saveTranslationFile(selectedFile, translatedContent)
      
      // 重新加载文件内容以更新状态
      await loadFileContent(selectedFile)
      
      console.log('文件保存成功')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存文件失败'
      setError(errorMessage)
      console.error('保存文件失败:', err)
    } finally {
      setSaving(false)
    }
  }

  // 重新翻译
  const handleRetranslate = async () => {
    if (!selectedFile) return
    
    setTranslating(true)
    setError(null)
    
    try {
      const result = await window.api.translation.translateSingleFile(selectedFile)
      
      if (result.success) {
        // 重新加载文件内容
        await loadFileContent(selectedFile)
        console.log('文件重新翻译成功')
      } else {
        setError(result.error || '翻译失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '翻译失败'
      setError(errorMessage)
      console.error('翻译失败:', err)
    } finally {
      setTranslating(false)
    }
  }

  // 获取状态显示信息
  const getStatusInfo = (status: FileStatus) => {
    switch (status) {
      case FileStatus.UNTRANSLATED:
        return { text: '未翻译', color: 'bg-gray-100 text-gray-800' }
      case FileStatus.OUTDATED:
        return { text: '已过时', color: 'bg-yellow-100 text-yellow-800' }
      case FileStatus.UP_TO_DATE:
        return { text: '已翻译', color: 'bg-green-100 text-green-800' }
      default:
        return { text: '未知', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // 骨架屏组件
  const SkeletonLoader = () => (
    <div className="flex-1 flex flex-col bg-white">
      {/* 顶部信息栏骨架屏 */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>

      {/* 双栏骨架屏 */}
      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-gray-200 flex flex-col min-w-0">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="h-4 bg-gray-200 rounded animate-pulse" 
                style={{width: `${60 + Math.random() * 40}%`}}
              ></div>
            ))}
          </div>
        </div>
        <div className="w-1/2 flex flex-col min-w-0">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div>
          </div>
          <div className="flex-1 p-4 space-y-2">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className="h-4 bg-gray-200 rounded animate-pulse" 
                style={{width: `${50 + Math.random() * 50}%`}}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // 如果没有选择文件，显示空状态
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

  // 加载状态 - 使用骨架屏
  if (loading) {
    return <SkeletonLoader />
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500 max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium mb-2">加载失败</h3>
          <p className="text-sm mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => loadFileContent(selectedFile)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 如果没有文件数据，显示空状态
  if (!fileData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">文件不存在</h3>
          <p className="text-sm">所选文件可能已被删除或移动</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(fileData.status!)

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0">
      {/* 顶部信息栏 */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-700 truncate" title={selectedFile}>
            {selectedFile}
          </div>
          <div className={`px-2 py-1 text-xs rounded flex-shrink-0 ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
          {fileData.lastModified && (
            <div className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
              最后更新: {new Date(fileData.lastModified).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleRetranslate}
            disabled={translating}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {translating ? '翻译中...' : '重新翻译'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !translatedContent.trim()}
            className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 双栏对比视图 - 响应式布局 */}
      <div className="flex-1 flex lg:flex-row flex-col min-h-0">
        {/* 左侧原文 */}
        <div className="lg:w-1/2 w-full lg:border-r lg:border-b-0 border-b border-gray-200 flex flex-col min-w-0">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-700">原文</h3>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {/* 
              修改点：
              在下面的 <pre> 标签中添加了 `break-all` 类。
              这个类会强制在长单词（没有空格的字符串）内部换行，
              从而防止它撑开父容器，保持布局的稳定。
            */}
            <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all font-mono leading-relaxed">
              {fileData.original}
            </pre>
          </div>
        </div>

        {/* 右侧译文 */}
        <div className="lg:w-1/2 w-full flex flex-col min-w-0">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-sm font-medium text-gray-700">译文</h3>
          </div>
          <div className="flex-1 p-4">
            <textarea
              className="w-full h-full resize-none border-none outline-none text-sm font-mono bg-transparent leading-relaxed focus:ring-0"
              value={translatedContent}
              onChange={(e) => setTranslatedContent(e.target.value)}
              placeholder={fileData.exists ? "翻译内容将显示在这里..." : "此文件尚未翻译，点击'重新翻译'按钮开始翻译"}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Workspace