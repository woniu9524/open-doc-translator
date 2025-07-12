import { FC, useState } from 'react'

const SettingsPanel: FC = () => {
  const [llmSettings, setLlmSettings] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo',
    temperature: 0.7,
    concurrency: 5
  })

  const [projectSettings, setProjectSettings] = useState({
    includeDirs: 'docs/',
    fileExts: ['md', 'mdx'],
    specialFiles: ''
  })

  const [promptTemplates, setPromptTemplates] = useState([
    {
      name: 'Default Tech Doc',
      content: 'Translate the following Markdown document into Chinese. Keep the original formatting, code blocks, and links intact. Pay attention to technical terms.'
    },
    {
      name: 'API Reference',
      content: 'Translate this API documentation to Chinese. Maintain all code examples, parameter names, and technical terminology in English.'
    }
  ])

  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

  const handleAddTemplate = () => {
    if (newTemplateName.trim() && newTemplateContent.trim()) {
      setPromptTemplates([...promptTemplates, {
        name: newTemplateName.trim(),
        content: newTemplateContent.trim()
      }])
      setNewTemplateName('')
      setNewTemplateContent('')
      setShowTemplateDialog(false)
    }
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
                value={llmSettings.apiKey}
                onChange={(e) => setLlmSettings({...llmSettings, apiKey: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Base URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={llmSettings.baseUrl}
                onChange={(e) => setLlmSettings({...llmSettings, baseUrl: e.target.value})}
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
              >
                删除模板
              </button>
            </div>
          </div>
        </div>

        {/* 项目特定配置 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">项目特定配置</h3>
          
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
                value={projectSettings.fileExts.join(', ')}
                onChange={(e) => {
                  const exts = e.target.value.split(',').map(ext => ext.trim()).filter(ext => ext)
                  setProjectSettings({...projectSettings, fileExts: exts})
                }}
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

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-6 rounded-lg transition-colors font-medium">
            保存所有设置
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