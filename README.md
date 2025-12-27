# Vue3 Reissue

这是一个 Vue 3 核心功能的简化实现版本，完全从零编写，旨在学习和理解 Vue.js 的内部机制。本项目采用 pnpm workspaces 的 Monorepo 结构。

## 项目结构

项目在 `packages` 目录下分为几个包，镜像了官方 Vue 3 仓库的结构：

- **reactivity**: 核心响应式系统（实现了 `ref`、`reactive`、`computed`、`effect` 等）。
- **runtime-core**: 平台无关的运行时核心（虚拟 DOM、组件实现、调度器）。
- **runtime-dom**: 针对浏览器环境的运行时实现（DOM 节点操作、属性修补）。
- **compiler-core**: 核心编译器逻辑，用于解析和转换模板。
- **shared**: 跨包使用的共享工具函数。

## 环境要求

- [Node.js](https://nodejs.org/) (推荐最新的 LTS 版本)
- [pnpm](https://pnpm.io/)

## 快速开始

1.  **安装依赖：**

    ```bash
    pnpm install
    ```

2.  **开发构建：**

    项目使用 `esbuild` 进行快速打包。你可以使用 `dev` 脚本构建特定的包。

    **用法：**

    ```bash
    pnpm dev [target] -f [format]
    ```

    - `target`: 要构建的包名（例如：`reactivity`, `runtime-dom`, `compiler-core`）。默认为 `reactivity`。
    - `format`: 输出格式 (`esm`, `cjs`, 或 `iife`)。默认为 `iife`。

    **示例：**

    以 IIFE 格式构建 reactivity 包（用于浏览器 script 标签）：

    ```bash
    pnpm dev reactivity -f iife
    ```

    以 ESM 格式构建 compiler-core 包：

    ```bash
    pnpm dev compiler-core -f esm
    ```

    构建脚本默认在监听模式下运行，因此当你修改源文件时会自动重新构建。

## 许可证

ISC
