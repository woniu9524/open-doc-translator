
function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-4">
          Hello World
        </h1>
        <p className="text-gray-600 text-center mb-6">
          欢迎使用 Electron + React + Tailwind CSS
        </p>
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
          开始使用
        </button>
      </div>
    </div>
  )
}

export default App
