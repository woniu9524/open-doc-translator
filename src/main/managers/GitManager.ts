import { simpleGit, SimpleGit, StatusResult } from 'simple-git'
import { promises as fs } from 'fs'
import * as path from 'path'
import { GitStatus, TranslationState } from '../types'

export class GitManager {
  private git: SimpleGit
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = projectPath
    this.git = simpleGit(projectPath)
  }

  /**
   * 验证是否为Git仓库
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status()
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取远程仓库信息
   */
  async getRemotes(): Promise<{ origin?: string; upstream?: string }> {
    try {
      const remotes = await this.git.getRemotes(true)
      const result: { origin?: string; upstream?: string } = {}
      
      for (const remote of remotes) {
        if (remote.name === 'origin') {
          result.origin = remote.refs.fetch
        } else if (remote.name === 'upstream') {
          result.upstream = remote.refs.fetch
        }
      }
      
      return result
    } catch (error) {
      throw new Error(`获取远程仓库信息失败: ${error}`)
    }
  }

  /**
   * 获取所有分支
   */
  async getBranches(): Promise<{ local: string[]; remote: string[] }> {
    try {
      const branches = await this.git.branch(['-a'])
      const local: string[] = []
      const remote: string[] = []
      
      for (const branch of branches.all) {
        if (branch.startsWith('remotes/')) {
          remote.push(branch.replace('remotes/', ''))
        } else {
          local.push(branch)
        }
      }
      
      return { local, remote }
    } catch (error) {
      throw new Error(`获取分支信息失败: ${error}`)
    }
  }

  /**
   * 获取上游分支列表
   */
  async getUpstreamBranches(): Promise<string[]> {
    try {
      const branches = await this.getBranches()
      return branches.remote.filter(branch => branch.startsWith('upstream/'))
    } catch (error) {
      throw new Error(`获取上游分支失败: ${error}`)
    }
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status()
      return status.current || 'unknown'
    } catch (error) {
      throw new Error(`获取当前分支失败: ${error}`)
    }
  }

  /**
   * 切换分支
   */
  async checkoutBranch(branchName: string): Promise<void> {
    try {
      // 检查是否有未提交的更改
      const status = await this.git.status()
      if (status.files.length > 0) {
        throw new Error('存在未提交的更改，请先提交或丢弃更改')
      }
      
      await this.git.checkout(branchName)
    } catch (error) {
      throw new Error(`切换分支失败: ${error}`)
    }
  }

  /**
   * 从上游拉取更新
   */
  async fetchUpstream(): Promise<void> {
    try {
      await this.git.fetch('upstream')
    } catch (error) {
      throw new Error(`拉取上游更新失败: ${error}`)
    }
  }

  /**
   * 获取默认的上游分支（通常是 main 或 master）
   */
  async getDefaultUpstreamBranch(): Promise<string> {
    try {
      const branches = await this.getUpstreamBranches()
      
      // 优先选择 main 分支
      if (branches.includes('upstream/main')) {
        return 'upstream/main'
      }
      
      // 如果没有 main，选择 master 分支
      if (branches.includes('upstream/master')) {
        return 'upstream/master'
      }
      
      // 如果都没有，返回第一个分支
      if (branches.length > 0) {
        return branches[0]
      }
      
      throw new Error('未找到任何上游分支')
    } catch (error) {
      throw new Error(`获取默认上游分支失败: ${error}`)
    }
  }

  /**
   * 获取文件的blob hash
   */
  async getFileHash(branch: string, filePath: string): Promise<string | null> {
    try {
      const hash = await this.git.revparse([`${branch}:${filePath}`])
      return hash.trim()
    } catch {
      // 文件不存在或其他错误
      return null
    }
  }

  /**
   * 获取文件内容
   */
  async getFileContent(branch: string, filePath: string): Promise<string> {
    try {
      const content = await this.git.show([`${branch}:${filePath}`])
      return content
    } catch (error) {
      throw new Error(`获取文件内容失败: ${error}`)
    }
  }

  /**
   * 获取Git状态
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const status: StatusResult = await this.git.status()
      
      return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        renamed: status.renamed.map(r => `${r.from} -> ${r.to}`),
        staged: status.staged,
        untracked: status.not_added
      }
    } catch (error) {
      throw new Error(`获取Git状态失败: ${error}`)
    }
  }

  /**
   * 暂存所有更改
   */
  async stageAll(): Promise<void> {
    try {
      await this.git.add('.')
    } catch (error) {
      throw new Error(`暂存文件失败: ${error}`)
    }
  }

  /**
   * 提交更改
   */
  async commit(message: string): Promise<void> {
    try {
      await this.git.commit(message)
    } catch (error) {
      throw new Error(`提交失败: ${error}`)
    }
  }

  /**
   * 推送到远程仓库
   */
  async push(remote: string = 'origin', branch?: string): Promise<void> {
    try {
      if (branch) {
        await this.git.push(remote, branch)
      } else {
        await this.git.push(remote)
      }
    } catch (error) {
      throw new Error(`推送失败: ${error}`)
    }
  }

  /**
   * 批量获取文件信息（优化版本）
   */
  async getBatchFileInfos(branch: string, filePaths: string[]): Promise<Map<string, { hash: string; size: number }>> {
    try {
      if (filePaths.length === 0) {
        return new Map()
      }

      // 使用 git ls-tree 批量获取文件信息
      const result = await this.git.raw(['ls-tree', '-r', '--long', branch])
      const lines = result.trim().split('\n').filter(line => line.length > 0)
      
      const fileInfoMap = new Map<string, { hash: string; size: number }>()
      
      for (const line of lines) {
        // git ls-tree 输出格式: 100644 blob a1b2c3d4e5f6... 1234 filename
        const match = line.match(/^\d+\s+blob\s+([a-f0-9]+)\s+(\d+)\s+(.+)$/)
        if (match) {
          const [, hash, sizeStr, filePath] = match
          const size = parseInt(sizeStr, 10)
          
          // 只返回请求的文件路径
          if (filePaths.includes(filePath)) {
            fileInfoMap.set(filePath, { hash, size })
          }
        }
      }
      
      return fileInfoMap
    } catch (error) {
      throw new Error(`批量获取文件信息失败: ${error}`)
    }
  }

  /**
   * 获取项目中符合条件的文件列表
   */
  async getProjectFiles(
    upstreamBranch: string,
    includeDirs: string,
    fileExts: string,
    excludePatterns: string = ''
  ): Promise<string[]> {
    try {
      // 获取上游分支的所有文件
      const files = await this.git.raw(['ls-tree', '-r', '--name-only', upstreamBranch])
      const fileList = files.trim().split('\n').filter(f => f.length > 0)
      
      // 将字符串参数转换为数组
      const includeDirArray = includeDirs.split(',').map(dir => dir.trim()).filter(dir => dir.length > 0)
      const fileExtArray = fileExts.split(',').map(ext => ext.trim()).filter(ext => ext.length > 0)
      const excludePatternArray = excludePatterns.split(',').map(pattern => pattern.trim()).filter(pattern => pattern.length > 0)
      
      return fileList.filter(filePath => {
        // 检查是否在包含目录中
        const inIncludeDir = includeDirArray.length === 0 || 
          includeDirArray.some(dir => filePath.startsWith(dir))
        
        if (!inIncludeDir) return false
        
        // 检查文件扩展名
        const ext = path.extname(filePath).slice(1).toLowerCase()
        const hasValidExt = fileExtArray.length === 0 || fileExtArray.includes(ext)
        
        if (!hasValidExt) return false
        
        // 检查排除模式
        const isExcluded = excludePatternArray.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(filePath)
        })
        
        return !isExcluded
      })
    } catch (error) {
      throw new Error(`获取项目文件列表失败: ${error}`)
    }
  }

  /**
   * 将分支名称转换为安全的文件名
   */
  private getSafeBranchName(branch: string): string {
    return branch.replace(/[\/\\:*?"<>|]/g, '_')
  }

  /**
   * 读取翻译状态文件
   */
  async readTranslationState(branch: string): Promise<TranslationState> {
    try {
      // 将分支名称中的斜杠替换为下划线，确保文件名安全
      const safeBranchName = this.getSafeBranchName(branch)
      const stateFilePath = path.join(this.projectPath, `${safeBranchName}-translation_state.json`)
      const content = await fs.readFile(stateFilePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // 文件不存在，返回空状态
      return {}
    }
  }

  /**
   * 写入翻译状态文件
   */
  async writeTranslationState(branch: string, state: TranslationState): Promise<void> {
    try {
      // 将分支名称中的斜杠替换为下划线，确保文件名安全
      const safeBranchName = this.getSafeBranchName(branch)
      const stateFilePath = path.join(this.projectPath, `${safeBranchName}-translation_state.json`)
      await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf-8')
    } catch (error) {
      throw new Error(`写入翻译状态文件失败: ${error}`)
    }
  }

  /**
   * 写入翻译文件
   */
  async writeTranslationFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(this.projectPath, filePath)
      const dir = path.dirname(fullPath)
      
      // 确保目录存在
      await fs.mkdir(dir, { recursive: true })
      
      // 写入文件
      await fs.writeFile(fullPath, content, 'utf-8')
    } catch (error) {
      throw new Error(`写入翻译文件失败: ${error}`)
    }
  }

  /**
   * 读取本地翻译文件
   */
  async readTranslationFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.projectPath, filePath)
      return await fs.readFile(fullPath, 'utf-8')
    } catch (error) {
      throw new Error(`读取翻译文件失败: ${error}`)
    }
  }

  /**
   * 检查本地翻译文件是否存在
   */
  async translationFileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.projectPath, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取文件大小
   */
  async getFileSize(branch: string, filePath: string): Promise<number> {
    try {
      const content = await this.getFileContent(branch, filePath)
      return Buffer.byteLength(content, 'utf-8')
    } catch {
      return 0
    }
  }
} 