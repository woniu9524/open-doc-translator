import * as path from 'path'
import { FileInfo, FileStatus, ProjectConfig, TranslationState } from '../types'
import { GitManager } from './GitManager'

export class FileManager {
  private gitManager: GitManager
  private projectConfig: ProjectConfig

  constructor(gitManager: GitManager, projectConfig: ProjectConfig) {
    this.gitManager = gitManager
    this.projectConfig = projectConfig
  }

  /**
   * 获取项目中所有符合条件的文件信息
   */
  async getProjectFileInfos(
    upstreamBranch: string,
    workingBranch: string,
    filters?: {
      status?: FileStatus[]
      sizeMin?: number
      sizeMax?: number
      searchText?: string
    }
  ): Promise<FileInfo[]> {
    try {
      // 获取符合条件的文件列表
      const files = await this.gitManager.getProjectFiles(
        upstreamBranch,
        this.projectConfig.rules.include_dirs,
        this.projectConfig.rules.file_exts,
        this.projectConfig.rules.special_files
      )

      // 读取翻译状态
      const translationState = await this.gitManager.readTranslationState(workingBranch)

      // 获取每个文件的详细信息
      const fileInfos: FileInfo[] = []
      
      for (const filePath of files) {
        try {
          const fileInfo = await this.getFileInfo(filePath, upstreamBranch, translationState)
          fileInfos.push(fileInfo)
        } catch (error) {
          console.warn(`获取文件信息失败: ${filePath}`, error)
          // 继续处理其他文件
        }
      }

      // 应用过滤器
      return this.applyFilters(fileInfos, filters)
    } catch (error) {
      throw new Error(`获取项目文件信息失败: ${error}`)
    }
  }

  /**
   * 获取单个文件的信息
   */
  async getFileInfo(
    filePath: string,
    upstreamBranch: string,
    translationState: TranslationState
  ): Promise<FileInfo> {
    // 获取上游文件的hash
    const sourceHash = await this.gitManager.getFileHash(upstreamBranch, filePath)
    if (!sourceHash) {
      throw new Error(`无法获取文件hash: ${filePath}`)
    }

    // 获取文件大小
    const size = await this.gitManager.getFileSize(upstreamBranch, filePath)

    // 获取记录的hash
    const recordedHash = translationState[filePath]?.source_hash

    // 判断文件状态
    const status = this.determineFileStatus(sourceHash, recordedHash)

    // 获取最后修改时间（使用翻译状态中的时间）
    const lastModified = translationState[filePath]?.last_translated_at || ''

    // 获取文件扩展名
    const extension = path.extname(filePath).slice(1).toLowerCase()

    return {
      path: filePath,
      status,
      size,
      lastModified,
      extension,
      sourceHash,
      recordedHash
    }
  }

  /**
   * 判断文件状态
   */
  private determineFileStatus(sourceHash: string, recordedHash?: string): FileStatus {
    if (!recordedHash) {
      return FileStatus.UNTRANSLATED
    }
    
    if (sourceHash !== recordedHash) {
      return FileStatus.OUTDATED
    }
    
    return FileStatus.UP_TO_DATE
  }

  /**
   * 应用过滤器
   */
  private applyFilters(fileInfos: FileInfo[], filters?: {
    status?: FileStatus[]
    sizeMin?: number
    sizeMax?: number
    searchText?: string
  }): FileInfo[] {
    if (!filters) {
      return fileInfos
    }

    return fileInfos.filter(fileInfo => {
      // 状态过滤
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(fileInfo.status)) {
          return false
        }
      }

      // 大小过滤
      if (filters.sizeMin !== undefined && fileInfo.size < filters.sizeMin * 1024) {
        return false
      }
      if (filters.sizeMax !== undefined && fileInfo.size > filters.sizeMax * 1024) {
        return false
      }

      // 文本搜索过滤
      if (filters.searchText && filters.searchText.trim()) {
        const searchText = filters.searchText.toLowerCase()
        const fileName = path.basename(fileInfo.path).toLowerCase()
        const filePath = fileInfo.path.toLowerCase()
        
        if (!fileName.includes(searchText) && !filePath.includes(searchText)) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 获取文件树结构
   */
  async getFileTree(
    upstreamBranch: string,
    workingBranch: string,
    filters?: {
      status?: FileStatus[]
      sizeMin?: number
      sizeMax?: number
      searchText?: string
    }
  ): Promise<FileTreeNode[]> {
    const fileInfos = await this.getProjectFileInfos(upstreamBranch, workingBranch, filters)
    return this.buildFileTree(fileInfos)
  }

  /**
   * 构建文件树结构
   */
  private buildFileTree(fileInfos: FileInfo[]): FileTreeNode[] {
    const tree: FileTreeNode[] = []
    const nodeMap = new Map<string, FileTreeNode>()

    // 为每个文件创建节点
    for (const fileInfo of fileInfos) {
      const pathParts = fileInfo.path.split('/')
      let currentPath = ''

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        const parentPath = currentPath
        currentPath = currentPath ? `${currentPath}/${part}` : part

        if (!nodeMap.has(currentPath)) {
          const isFile = i === pathParts.length - 1
          const node: FileTreeNode = {
            name: part,
            path: currentPath,
            isFile,
            children: isFile ? undefined : [],
            fileInfo: isFile ? fileInfo : undefined
          }

          nodeMap.set(currentPath, node)

          // 添加到父节点或根节点
          if (parentPath && nodeMap.has(parentPath)) {
            const parentNode = nodeMap.get(parentPath)!
            parentNode.children!.push(node)
          } else if (!parentPath) {
            tree.push(node)
          }
        }
      }
    }

    // 排序：目录在前，文件在后，同类型按名称排序
    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.isFile !== b.isFile) {
          return a.isFile ? 1 : -1
        }
        return a.name.localeCompare(b.name)
      })

      // 递归排序子节点
      for (const node of nodes) {
        if (node.children) {
          sortNodes(node.children)
        }
      }
    }

    sortNodes(tree)
    return tree
  }

  /**
   * 获取文件状态统计
   */
  async getFileStatusStats(
    upstreamBranch: string,
    workingBranch: string
  ): Promise<{
    total: number
    untranslated: number
    outdated: number
    upToDate: number
  }> {
    const fileInfos = await this.getProjectFileInfos(upstreamBranch, workingBranch)
    
    const stats = {
      total: fileInfos.length,
      untranslated: 0,
      outdated: 0,
      upToDate: 0
    }

    for (const fileInfo of fileInfos) {
      switch (fileInfo.status) {
        case FileStatus.UNTRANSLATED:
          stats.untranslated++
          break
        case FileStatus.OUTDATED:
          stats.outdated++
          break
        case FileStatus.UP_TO_DATE:
          stats.upToDate++
          break
      }
    }

    return stats
  }

  /**
   * 获取需要翻译的文件列表
   */
  async getFilesToTranslate(
    upstreamBranch: string,
    workingBranch: string,
    includeOutdated: boolean = true
  ): Promise<FileInfo[]> {
    const fileInfos = await this.getProjectFileInfos(upstreamBranch, workingBranch)
    
    return fileInfos.filter(fileInfo => {
      if (fileInfo.status === FileStatus.UNTRANSLATED) {
        return true
      }
      if (includeOutdated && fileInfo.status === FileStatus.OUTDATED) {
        return true
      }
      return false
    })
  }

  /**
   * 更新翻译状态
   */
  async updateTranslationState(
    workingBranch: string,
    filePath: string,
    sourceHash: string
  ): Promise<void> {
    const translationState = await this.gitManager.readTranslationState(workingBranch)
    
    translationState[filePath] = {
      source_hash: sourceHash,
      last_translated_at: new Date().toISOString(),
      translator_version: '1.0'
    }
    
    await this.gitManager.writeTranslationState(workingBranch, translationState)
  }

  /**
   * 批量更新翻译状态
   */
  async batchUpdateTranslationState(
    workingBranch: string,
    updates: Array<{ filePath: string; sourceHash: string }>
  ): Promise<void> {
    const translationState = await this.gitManager.readTranslationState(workingBranch)
    
    for (const update of updates) {
      translationState[update.filePath] = {
        source_hash: update.sourceHash,
        last_translated_at: new Date().toISOString(),
        translator_version: '1.0'
      }
    }
    
    await this.gitManager.writeTranslationState(workingBranch, translationState)
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 获取文件扩展名对应的类型
   */
  static getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.md':
        return 'markdown'
      case '.mdx':
        return 'mdx'
      case '.ipynb':
        return 'jupyter'
      case '.txt':
        return 'text'
      case '.rst':
        return 'restructuredtext'
      default:
        return 'unknown'
    }
  }
}

// 文件树节点类型
export interface FileTreeNode {
  name: string
  path: string
  isFile: boolean
  children?: FileTreeNode[]
  fileInfo?: FileInfo
} 