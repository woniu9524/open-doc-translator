import { FC, useState, useEffect } from 'react'
import { LLMSettings, PromptTemplate, ProjectConfig } from '../../types'

const SettingsPanel: FC = () => {
  // LLM设置状态
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    api_key: '',
    base_url: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    concurrency: 5,
    max_tokens: 4000
  })

  // 项目设置状态
  const [projectSettings, setProjectSettings] = useState({
    includeDirs: 'docs',
    fileExts: 'md,mdx',
    specialFiles: ''
  })

  // 提示词模板状态
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

  // 当前项目状态
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // 加载配置
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      
      // 加载LLM设置
      const llmConfig = await window.api.translation.getLLMSettings()
      setLlmSettings(llmConfig)
      
      // 加载提示词模板
      const templates = await window.api.translation.getPromptTemplates()
      setPromptTemplates(templates)
      
      // 加载当前项目
      const project = await window.api.translation.getCurrentProject()
      if (project) {
        setCurrentProject(project)
        setProjectSettings({
          includeDirs: project.rules.include_dirs,
          fileExts: project.rules.file_exts,
          specialFiles: project.rules.special_files
        })
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 保存LLM设置
  const saveLLMSettings = async () => {
    try {
      setSaveStatus('saving')
      await window.api.translation.updateLLMSettings(llmSettings)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('保存LLM设置失败:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // 保存项目设置
  const saveProjectSettings = async () => {
    if (!currentProject) return
    
    try {
      setSaveStatus('saving')
      await window.api.translation.updateProjectConfig(currentProject.id, {
        rules: {
          include_dirs: projectSettings.includeDirs,
          file_exts: projectSettings.fileExts,
          special_files: projectSettings.specialFiles
        }
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('保存项目设置失败:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // 保存所有设置
  const saveAllSettings = async () => {
    await Promise.all([
      saveLLMSettings(),
      saveProjectSettings()
    ])
  }

  // 添加模板
  const handleAddTemplate = async () => {
    if (newTemplateName.trim() && newTemplateContent.trim()) {
      try {
        const newTemplate: PromptTemplate = {
          name: newTemplateName.trim(),
          content: newTemplateContent.trim()
        }
        
        await window.api.translation.addPromptTemplate(newTemplate)
        
        // 重新加载模板列表
        const templates = await window.api.translation.getPromptTemplates()
        setPromptTemplates(templates)
        
        setNewTemplateName('')
        setNewTemplateContent('')
        setShowTemplateDialog(false)
      } catch (error) {
        console.error('添加模板失败:', error)
        alert('添加模板失败: ' + (error as Error).message)
      }
    }
  }

  // 更新模板
  const handleUpdateTemplate = async (templateName: string, updates: Partial<PromptTemplate>) => {
    try {
      await window.api.translation.updatePromptTemplate(templateName, updates)
      
      // 重新加载模板列表
      const templates = await window.api.translation.getPromptTemplates()
      setPromptTemplates(templates)
    } catch (error) {
      console.error('更新模板失败:', error)
      alert('更新模板失败: ' + (error as Error).message)
    }
  }

  // 删除模板
  const handleRemoveTemplate = async (templateName: string) => {
    if (promptTemplates.length <= 1) {
      alert('至少需要保留一个模板')
      return
    }
    
    if (confirm(`确定要删除模板 "${templateName}" 吗？`)) {
      try {
        await window.api.translation.removePromptTemplate(templateName)
        
        // 重新加载模板列表
        const templates = await window.api.translation.getPromptTemplates()
        setPromptTemplates(templates)
        
        // 如果删除的是当前选中的模板，重置选择
        if (selectedTemplate >= templates.length) {
          setSelectedTemplate(0)
        }
      } catch (error) {
        console.error('删除模板失败:', error)
        alert('删除模板失败: ' + (error as Error).message)
      }
    }
  }

  // 测试LLM连接
  const testLLMConnection = async () => {
    try {
      const isConnected = await window.api.translation.testLLMConnection()
      if (isConnected) {
        alert('LLM连接测试成功！')
      } else {
        alert('LLM连接测试失败，请检查配置。')
      }
    } catch (error) {
      alert('LLM连接测试失败: ' + (error as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto bg-white">
        <div className="p-4">
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">加载设置中...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-white">
      <div className="p-4 space-y-6">
        {/* LLM 服务配置 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">LLM 服务配置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                API Key
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="sk-..."
                value={llmSettings.api_key}
                onChange={(e) => setLlmSettings({...llmSettings, api_key: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Base URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={llmSettings.base_url}
                onChange={(e) => setLlmSettings({...llmSettings, base_url: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                模型
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="gpt-4-turbo"
                value={llmSettings.model}
                onChange={(e) => setLlmSettings({...llmSettings, model: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={llmSettings.temperature}
                  onChange={(e) => setLlmSettings({...llmSettings, temperature: parseFloat(e.target.value)})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={llmSettings.max_tokens}
                  onChange={(e) => setLlmSettings({...llmSettings, max_tokens: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                并发数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={llmSettings.concurrency}
                onChange={(e) => setLlmSettings({...llmSettings, concurrency: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </div>

        {/* 翻译提示词模板 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">翻译提示词模板</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                选择模板
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
              >
                {promptTemplates.map((template, index) => (
                  <option key={index} value={index}>{template.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                提示词内容
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                value={promptTemplates[selectedTemplate]?.content || ''}
                onChange={(e) => {
                  const newTemplates = [...promptTemplates]
                  newTemplates[selectedTemplate].content = e.target.value
                  setPromptTemplates(newTemplates)
                }}
                onBlur={() => {
                  const template = promptTemplates[selectedTemplate]
                  if (template) {
                    handleUpdateTemplate(template.name, { content: template.content })
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                className="bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg transition-colors font-medium"
                onClick={() => setShowTemplateDialog(true)}
              >
                添加模板
              </button>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                disabled={promptTemplates.length <= 1}
                onClick={() => {
                  const template = promptTemplates[selectedTemplate]
                  if (template) {
                    handleRemoveTemplate(template.name)
                  }
                }}
              >
                删除模板
              </button>
            </div>
          </div>
        </div>

        {/* 项目特定配置 */}
        {currentProject && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-4">项目特定配置</h3>
            <p className="text-xs text-gray-500 mb-4">当前项目: {currentProject.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  监听目录
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="docs/, src/docs/"
                  value={projectSettings.includeDirs}
                  onChange={(e) => setProjectSettings({...projectSettings, includeDirs: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  文件扩展名
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="md, mdx, txt"
                  value={projectSettings.fileExts}
                  onChange={(e) => setProjectSettings({...projectSettings, fileExts: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  特殊文件
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="README.md, CHANGELOG.md"
                  value={projectSettings.specialFiles}
                  onChange={(e) => setProjectSettings({...projectSettings, specialFiles: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-2">总是监听的文件，不受监听目录和扩展名限制</p>
              </div>
            </div>
          </div>
        )}

        {/* 保存状态提示 */}
        {saveStatus === 'success' && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            设置保存成功！
          </div>
        )}
        
        {saveStatus === 'error' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            设置保存失败，请重试。
          </div>
        )}

        {/* 保存所有设置按钮 */}
        <div className="flex justify-center">
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-6 rounded-lg transition-colors font-medium"
            onClick={saveAllSettings}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? '保存中...' : '保存所有设置'}
          </button>
        </div>
      </div>

      {/* 添加模板对话框 */}
      {showTemplateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加新模板</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  模板名称
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="模板名称"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  提示词内容
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={6}
                  placeholder="提示词内容"
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                  onClick={() => {
                    setShowTemplateDialog(false)
                    setNewTemplateName('')
                    setNewTemplateContent('')
                  }}
                >
                  取消
                </button>
                <button
                  className="bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                  onClick={handleAddTemplate}
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPanel 