import { useState } from 'react'
import TopToolbar from './components/TopToolbar'
import SidePanel from './components/SidePanel'
import Workspace from './components/Workspace'

function App(): React.JSX.Element {
  const [currentProject, setCurrentProject] = useState<string>('')
  const [currentBranch, setCurrentBranch] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<string>('')

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部工具栏 */}
      <TopToolbar 
        currentProject={currentProject}
        setCurrentProject={setCurrentProject}
        currentBranch={currentBranch}
        setCurrentBranch={setCurrentBranch}
      />
      
      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 */}
        <SidePanel 
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
        
        {/* 右侧工作区 */}
        <Workspace 
          selectedFile={selectedFile}
        />
      </div>
    </div>
  )
}

export default App
