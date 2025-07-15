import { FC, useEffect, useState } from 'react'

interface TopToolbarProps {
  currentProject: string
  setCurrentProject: (project: string) => void
  currentBranch: string
  setCurrentBranch: (branch: string) => void
}

interface Project {
  id: string
  name: string
  path: string
}

const TopToolbar: FC<TopToolbarProps> = ({
  currentProject,
  setCurrentProject,
  currentBranch,
  setCurrentBranch
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [upstreamBranches, setUpstreamBranches] = useState<string[]>([])
  const [workingBranches, setWorkingBranches] = useState<string[]>([])
  const [currentUpstreamBranch, setCurrentUpstreamBranch] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 初始化和加载数据
  useEffect(() => {
    loadInitialData()
  }, [])

  // 当项目改变时，重新加载分支信息
  useEffect(() => {
    if (currentProject) {
      loadBranchData()
    }
  }, [currentProject])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      
      // 初始化翻译服务
      await window.api.translation.initialize()
      
      // 加载项目列表
      const projectList = await window.api.translation.getProjects()
      setProjects(projectList)
      
      // 获取当前项目
      let currentProj = await window.api.translation.getCurrentProject()
      
      // 如果没有当前项目但有项目列表，自动选择第一个项目
      if (!currentProj && projectList.length > 0) {
        const firstProject = projectList[0]
        await window.api.translation.selectProject(firstProject.id)
        currentProj = firstProject
      }
      
      if (currentProj) {
        // 先设置当前项目状态
        setCurrentProject(currentProj.id)
        
        // 获取当前工作分支（从Git仓库获取）
        const currentWorkingBranch = await window.api.translation.getCurrentWorkingBranch()
        if (currentWorkingBranch) {
          setCurrentBranch(currentWorkingBranch)
        }
        
        // 获取上游分支（从项目配置中恢复）
        const currentUpstream = await window.api.translation.getCurrentUpstreamBranch()
        if (currentUpstream) {
          setCurrentUpstreamBranch(currentUpstream)
        }
        
        // 等待状态更新后再加载分支数据
        setTimeout(async () => {
          try {
            await loadBranchData()
          } catch (error) {
            console.error('加载分支数据失败:', error)
          }
        }, 100)
      }
    } catch (error) {
      console.error('初始化数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBranchData = async () => {
    try {
      // 检查是否有当前项目
      if (!currentProject) {
        console.log('没有选择项目，跳过分支数据加载')
        return
      }
      
      // 加载上游分支
      const upstreamBranchList = await window.api.translation.getUpstreamBranches()
      setUpstreamBranches(upstreamBranchList)
      
      // 加载工作分支
      const workingBranchList = await window.api.translation.getLocalBranches()
      setWorkingBranches(workingBranchList)
    } catch (error) {
      console.error('加载分支数据失败:', error)
    }
  }

  const handleProjectChange = async (projectId: string) => {
    try {
      setIsLoading(true)
      
      if (projectId) {
        // 选择项目
        await window.api.translation.selectProject(projectId)
        setCurrentProject(projectId)
        
        // 获取当前工作分支（从Git仓库获取）
        const currentWorkingBranch = await window.api.translation.getCurrentWorkingBranch()
        if (currentWorkingBranch) {
          setCurrentBranch(currentWorkingBranch)
        }
        
        // 获取上游分支（从项目配置中恢复）
        const currentUpstream = await window.api.translation.getCurrentUpstreamBranch()
        if (currentUpstream) {
          setCurrentUpstreamBranch(currentUpstream)
        }
        
        // 重新加载分支数据
        await loadBranchData()
      } else {
        setCurrentProject('')
        setCurrentBranch('')
        setCurrentUpstreamBranch('')
        setUpstreamBranches([])
        setWorkingBranches([])
      }
    } catch (error) {
      console.error('切换项目失败:', error)
      alert(`切换项目失败: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProject = async () => {
    try {
      setIsLoading(true)
      
      // 调用添加项目API，会弹出文件选择器
      const newProject = await window.api.translation.addProject()
      
      // 重新加载项目列表
      const projectList = await window.api.translation.getProjects()
      setProjects(projectList)
      
      // 自动选择新添加的项目
      if (newProject) {
        // 先调用后端selectProject方法设置当前项目
        await window.api.translation.selectProject(newProject.id)
        setCurrentProject(newProject.id)
        
        // 获取当前工作分支（从Git仓库获取）
        const currentWorkingBranch = await window.api.translation.getCurrentWorkingBranch()
        if (currentWorkingBranch) {
          setCurrentBranch(currentWorkingBranch)
        }
        
        // 获取上游分支（从项目配置中恢复）
        const currentUpstream = await window.api.translation.getCurrentUpstreamBranch()
        if (currentUpstream) {
          setCurrentUpstreamBranch(currentUpstream)
        }
        
        // 重新加载分支数据
        await loadBranchData()
      }
      
      alert('项目添加成功!')
    } catch (error: any) {
      console.error('添加项目失败:', error)
      if (error.message !== '用户取消选择') {
        alert(`添加项目失败: ${error}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpstreamBranchChange = async (branch: string) => {
    try {
      if (branch) {
        await window.api.translation.setUpstreamBranch(branch)
        setCurrentUpstreamBranch(branch)
      }
    } catch (error) {
      console.error('设置上游分支失败:', error)
      alert(`设置上游分支失败: ${error}`)
    }
  }

  const handleWorkingBranchChange = async (branch: string) => {
    try {
      if (branch) {
        await window.api.translation.switchWorkingBranch(branch)
        setCurrentBranch(branch)
      }
    } catch (error) {
      console.error('切换工作分支失败:', error)
      alert(`切换工作分支失败: ${error}`)
    }
  }

  const handleRefreshUpstream = async () => {
    try {
      setIsRefreshing(true)
      
      // 拉取上游更新
      await window.api.translation.fetchUpstream()
      
      // 重新加载分支数据
      await loadBranchData()
      
      alert('上游分支刷新成功!')
    } catch (error) {
      console.error('刷新上游分支失败:', error)
      alert(`刷新上游分支失败: ${error}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleGitHubClick = () => {
    window.open('https://github.com/woniu9524/open-doc-translator', '_blank')
  }

  const getCurrentProjectName = () => {
    const project = projects.find(p => p.id === currentProject)
    return project ? project.name : '未选择项目'
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* 项目选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">项目:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentProject}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={isLoading}
          >
            <option value="">选择项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        {/* 添加项目按钮 */}
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50"
          onClick={handleAddProject}
          disabled={isLoading}
        >
          {isLoading ? '添加中...' : '添加项目'}
        </button>

        {/* 上游分支选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">上游分支:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            value={currentUpstreamBranch}
            onChange={(e) => handleUpstreamBranchChange(e.target.value)}
            disabled={!currentProject || isLoading}
          >
            <option value="">选择上游分支</option>
            {upstreamBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        {/* 工作分支选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">工作分支:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            value={currentBranch}
            onChange={(e) => handleWorkingBranchChange(e.target.value)}
            disabled={!currentProject || isLoading}
          >
            <option value="">选择工作分支</option>
            {workingBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        {/* 刷新上游分支 */}
        <button 
          className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50"
          onClick={handleRefreshUpstream}
          disabled={!currentProject || isRefreshing || isLoading}
        >
          {isRefreshing ? '刷新中...' : '刷新上游'}
        </button>
      </div>

      {/* GitHub 图标 */}
      <div className="flex items-center">
        <button
          onClick={handleGitHubClick}
          className="text-gray-600 hover:text-gray-800 transition-colors p-2 rounded-full hover:bg-gray-100"
          title="查看 GitHub 仓库"
        >
          <svg 
            className="w-6 h-6" 
            fill="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TopToolbar 