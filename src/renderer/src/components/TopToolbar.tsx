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
      const currentProj = await window.api.translation.getCurrentProject()
      if (currentProj) {
        setCurrentProject(currentProj.id)
        
        // 获取当前分支
        const currentWorkingBranch = await window.api.translation.getCurrentWorkingBranch()
        if (currentWorkingBranch) {
          setCurrentBranch(currentWorkingBranch)
        }
        
        const currentUpstream = await window.api.translation.getCurrentUpstreamBranch()
        if (currentUpstream) {
          setCurrentUpstreamBranch(currentUpstream)
        }
        
        // 加载分支数据
        await loadBranchData()
      }
    } catch (error) {
      console.error('初始化数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadBranchData = async () => {
    try {
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
        
        // 重置分支选择
        setCurrentBranch('')
        setCurrentUpstreamBranch('')
        
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

        {/* 刷新上游分支 */}
        <button 
          className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50"
          onClick={handleRefreshUpstream}
          disabled={!currentProject || isRefreshing || isLoading}
        >
          {isRefreshing ? '刷新中...' : '刷新上游'}
        </button>

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
      </div>

      {/* 右侧状态信息 */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-500">
          项目: {getCurrentProjectName()}
        </div>
        <div className="text-sm text-gray-500">
          分支: {currentBranch || '未选择分支'}
        </div>
        {isLoading && (
          <div className="text-sm text-blue-500">
            加载中...
          </div>
        )}
      </div>
    </div>
  )
}

export default TopToolbar 