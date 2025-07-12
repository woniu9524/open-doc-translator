import { FC, useState } from 'react'
import FileTree from './SidePanel/FileTree'
import GitPanel from './SidePanel/GitPanel'
import SettingsPanel from './SidePanel/SettingsPanel'

interface SidePanelProps {
  selectedFile: string
  setSelectedFile: (file: string) => void
}

const SidePanel: FC<SidePanelProps> = ({ selectedFile, setSelectedFile }) => {
  const [activeTab, setActiveTab] = useState<'files' | 'git' | 'settings'>('files')

  const tabs = [
    { id: 'files', label: '文件', icon: '📁' },
    { id: 'git', label: 'Git', icon: '🔧' },
    { id: 'settings', label: '设置', icon: '⚙️' }
  ]

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* 标签页头部 */}
      <div className="flex border-b border-gray-100 bg-gray-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <div className="flex items-center justify-center">
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && (
          <FileTree 
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
          />
        )}
        {activeTab === 'git' && <GitPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}

export default SidePanel 