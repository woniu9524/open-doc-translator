# OpenDocTranslator

### 让语言不再是阅读的壁垒。

[![构建状态](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/YOUR_REPO/open-doc-translator)
[![版本](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/YOUR_REPO/open-doc-translator)
[![许可协议](https://img.shields.io/badge/license-MIT-yellow)](https://github.com/YOUR_REPO/open-doc-translator/blob/main/LICENSE)
[![欢迎PR](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/YOUR_REPO/open-doc-translator/pulls)

**一款开源文档翻译工具，结合 Git 版本控制与 AI 翻译，帮助您轻松、高效地翻译和同步多语言文档。**

---

## 💡 项目缘起：痛点与目标

你是否也曾因为啃英文文档而头疼？在快节奏的开源世界里，我们常常遇到这些窘境：

> *   **官方文档只有英文版**，阅读吃力，理解效率大打折扣。
> *   **社区翻译版本严重滞后**，关键的更新和修复说明遥遥无期。
> *   **跟着过时的中文文档操作**，结果踩了无数新版本已经修复的坑。

为了解决这些痛点，**OpenDocTranslator** 诞生了。它将 Git 精准的版本追踪能力与大语言模型（LLM）的翻译效率相结合，为所有文档翻译贡献者提供一个更简单、可靠的工作流。

我们的目标是：**帮助您摆脱繁琐的手动比对，轻松跟上上游更新，将宝贵的时间真正用在理解技术和贡献社区上。**

---

## ✨ 核心功能

*   **🗂️ 多项目管理**：在一个界面中轻松管理和切换多个 Git 翻译项目。
*   **🤖 变更自动追踪**：基于 Git Blob Hash 精确追踪上游文件变更，绝不遗漏任何更新。
*   **🚀 批量 AI 翻译**：集成您自己的 LLM API，一键批量翻译所有“未翻译”或“已过时”的文档。
*   **🖥️ 集成化 GUI**：在清晰的图形界面中完成状态监控、版本比对和人工校对，告别繁琐的命令行。
*   **🔄 深度 Git 集成**：内置 Git 工作流，从 `fetch` 上游变更到 `commit` 和 `push` 译文，一气呵成。
*   **🎯 精准状态管理**：通过 `translation_state.json` 文件，对每个文件的翻译状态（`未翻译`、`已过时`、`已翻译`）了如指掌。

---

## 🚀 快速上手

### 前期准备：配置你的 Git 环境
在开始前，请确保你的本地 Git 环境已准备就绪。

1.  **Fork 仓库**： 在 GitHub 等平台，Fork 您想翻译的目标项目到自己的账户下。
2.  **克隆到本地**：
    ```bash
    git clone <你的 Fork 仓库 URL>
    ```
3.  **进入目录**：
    ```bash
    cd <项目目录>
    ```
4.  **添加上游仓库**：
    ```bash
    git remote add upstream <上游官方仓库 URL>
    ```
5.  **创建翻译分支**：
    ```bash
    git checkout -b translation-zh # 或其他你喜欢的分支名
    ```

### 开始使用：三步完成翻译

1.  **添加项目**：
    *   打开 `OpenDocTranslator` 客户端。
    *   点击主界面的 **“添加项目 (Add Project)”** 按钮。
    *   选择您刚刚配置好的本地项目根目录。

2.  **配置与翻译**：
    *   从项目下拉框中选择您的项目。
    *   在 **“设置 (Settings)”** 面板中，配置您的 LLM API Key 和模型参数。
    *   点击 **“刷新 (Refresh)”** 按钮，工具将自动比对并标记所有文件的翻译状态。
    *   点击 **“批量翻译 (Batch Translate)”**，让 AI 完成翻译工作。

3.  **提交与推送**：
    *   翻译完成后，您可以在界面中直接校对和修改。
    *   前往 **“Git”** 面板，`Commit` 并 `Push` 您的成果！

---

## ⚙️ 工作原理：基于 Git 的精准追踪

本工具的核心是 **基于 Git Blob Hash 的内容状态追踪**。

当您刷新项目时，工具会：
1.  获取 **上游源分支** 中每个文件的唯一内容哈希值 (`source_hash`)。
2.  将这个 `source_hash` 与当前分支的状态文件 (`{branch}-translation_state.json`) 中记录的哈希值进行比对。
3.  根据比对结果，判定每个文件的状态：
    *   `未翻译 (Untranslated)`: 状态文件中不存在该文件的记录。
    *   `已过时 (Outdated)`: 状态文件中有记录，但 `source_hash` 与上游不一致，表示原文已更新。
    *   `已翻译 (Up-to-date)`: 状态文件中有记录，且 `source_hash` 与上游完全一致。

---



## 📄 许可协议

本项目采用 [MIT License](LICENSE) 授权。