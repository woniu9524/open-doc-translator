# Open Doc Translator - 项目结构总览

## 项目概述
基于 Electron + Vite + React + TypeScript + Tailwind CSS 的自动化Git文档翻译工具

## 技术栈
- **桌面应用框架**: Electron
- **构建工具**: Vite (electron-vite)
- **前端框架**: React 19
- **类型检查**: TypeScript
- **样式框架**: Tailwind CSS
- **代码规范**: ESLint + Prettier

## 项目结构

```
open-doc-translator/
├── src/
│   ├── main/                    # Electron 主进程
│   ├── preload/                 # 预加载脚本
│   └── renderer/                # 渲染进程 (React 应用)
│       └── src/
│           ├── components/      # React 组件
│           │   ├── TopToolbar.tsx          # 顶部工具栏
│           │   ├── TopToolbar.vibe.md      # 组件文档
│           │   ├── SidePanel.tsx           # 左侧面板
│           │   ├── SidePanel.vibe.md       # 组件文档
│           │   ├── FileTree.tsx            # 文件树
│           │   ├── FileTree.vibe.md        # 组件文档
│           │   ├── GitPanel.tsx            # Git面板
│           │   ├── GitPanel.vibe.md        # 组件文档
│           │   ├── SettingsPanel.tsx       # 设置面板
│           │   ├── SettingsPanel.vibe.md   # 组件文档
│           │   ├── Workspace.tsx           # 工作区
│           │   └── Workspace.vibe.md       # 组件文档
│           ├── App.tsx          # 主应用组件
│           ├── main.tsx         # 应用入口
│           └── index.css        # 样式文件
├── package.json                 # 项目配置
├── electron.vite.config.ts      # Vite 配置
├── tailwind.config.js           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
└── README.md                    # 项目说明

```

## 应用架构

### 主要布局
```
┌─────────────────────────────────────────────────────────────┐
│                     TopToolbar                              │
│  [项目选择] [添加项目] [上游分支] [刷新] [工作分支]            │
├─────────────────────────┬───────────────────────────────────┤
│       SidePanel         │           Workspace               │
│  ┌─────────────────────┐│                                   │
│  │ [文件] [Git] [设置] ││                                   │
│  ├─────────────────────┤│   ┌─────────────┬─────────────┐   │
│  │                     ││   │             │             │   │
│  │    FileTree         ││   │   原文      │    译文     │   │
│  │      or             ││   │  (只读)     │   (可编辑)   │   │
│  │    GitPanel         ││   │             │             │   │
│  │      or             ││   │             │             │   │
│  │  SettingsPanel      ││   │             │             │   │
│  │                     ││   │             │             │   │
│  └─────────────────────┘│   └─────────────┴─────────────┘   │
└─────────────────────────┴───────────────────────────────────┘
```

### 组件职责

#### TopToolbar (顶部工具栏)
- 项目选择和管理
- 分支切换和同步
- 状态信息显示

#### SidePanel (左侧面板)
- 标签页导航 (文件/Git/设置)
- 集成子组件显示

#### FileTree (文件树)
- 文件目录结构展示
- 翻译状态筛选和搜索
- 批量翻译操作

#### GitPanel (Git面板)
- Git状态查看
- 提交和推送操作
- 快捷Git操作

#### SettingsPanel (设置面板)
- LLM服务配置
- 翻译提示词管理
- 项目特定配置

#### Workspace (工作区)
- 原文/译文对比显示
- 翻译内容编辑
- 单文件翻译操作

## 开发规范

### 组件文档规范
每个React组件都必须有对应的 `.vibe.md` 文档文件，包含：
- 用户需求描述
- 期望效果说明
- 实现功能清单
- 变更历史记录

### 文件命名规范
- 组件文件：`ComponentName.tsx`
- 组件文档：`ComponentName.vibe.md`
- 样式文件：`component-name.css` (如需要)

### 代码规范
- 使用 TypeScript 进行类型定义
- 组件 Props 必须有明确的类型注解
- 使用 React Hooks 而非 Class 组件
- 遵循 ESLint 和 Prettier 规则

## 开发命令

```bash
# 开发模式
npm run dev

# 构建应用
npm run build

# 类型检查
npm run typecheck

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 下一步开发计划

1. **后端集成**: 添加 Git 操作和 LLM API 调用的后端逻辑
2. **状态管理**: 集成 Redux 或 Zustand 进行全局状态管理
3. **文件系统**: 实现真实的文件读写和监听功能
4. **配置持久化**: 实现配置文件的读写和管理
5. **错误处理**: 添加完善的错误处理和用户反馈机制 