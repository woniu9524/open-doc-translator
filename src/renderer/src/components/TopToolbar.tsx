import { FC } from 'react'

interface TopToolbarProps {
  currentProject: string
  setCurrentProject: (project: string) => void
  currentBranch: string
  setCurrentBranch: (branch: string) => void
}

const TopToolbar: FC<TopToolbarProps> = ({
  currentProject,
  setCurrentProject,
  currentBranch,
  setCurrentBranch
}) => {
  const mockProjects = ['LangChain Docs', 'React Docs', 'Vue Docs']
  const mockUpstreamBranches = ['main', 'develop', 'release']
  const mockWorkingBranches = ['translation-zh', 'translation-en', 'main']

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {/* 项目选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">项目:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentProject}
            onChange={(e) => setCurrentProject(e.target.value)}
          >
            <option value="">选择项目</option>
            {mockProjects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>

        {/* 添加项目按钮 */}
        <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors">
          添加项目
        </button>

        {/* 上游分支选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">上游分支:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!currentProject}
          >
            <option value="">选择上游分支</option>
            {mockUpstreamBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>

        {/* 刷新上游分支 */}
        <button 
          className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors disabled:opacity-50"
          disabled={!currentProject}
        >
          刷新上游
        </button>

        {/* 工作分支选择 */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">工作分支:</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentBranch}
            onChange={(e) => setCurrentBranch(e.target.value)}
            disabled={!currentProject}
          >
            <option value="">选择工作分支</option>
            {mockWorkingBranches.map(branch => (
              <option key={branch} value={branch}>{branch}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 右侧状态信息 */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-500">
          {currentProject ? `项目: ${currentProject}` : '未选择项目'}
        </div>
        <div className="text-sm text-gray-500">
          {currentBranch ? `分支: ${currentBranch}` : '未选择分支'}
        </div>
      </div>
    </div>
  )
}

export default TopToolbar 