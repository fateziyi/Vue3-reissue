# Vue3 Reissue

这是一个 Vue 3 核心功能的简化实现版本，完全从零编写，旨在学习和理解 Vue.js 的内部机制。本项目采用 pnpm workspaces 的 Monorepo 结构。

## 项目结构

项目在 `packages` 目录下分为几个包，镜像了官方 Vue 3 仓库的结构：

- **reactivity**: 核心响应式系统（实现了 `ref`、`reactive`、`computed`、`effect` 等）。
- **runtime-core**: 平台无关的运行时核心（虚拟 DOM、组件实现、调度器）。
- **runtime-dom**: 针对浏览器环境的运行时实现（DOM 节点操作、属性修补）。
- **compiler-core**: 核心编译器逻辑，用于解析和转换模板。
- **shared**: 跨包使用的共享工具函数。

## 核心实现

- **响应式系统**：基于 `Proxy / Reflect` 完成属性级依赖收集，并实现 `effect`、`ref`、`computed`、`watch`。`computed` 使用 `NotDirty / MaybeDirty / Dirty` 分级传播：依赖变化时先标记“可能脏”，真正读取时再计算并比较结果，结果未变化则跳过下游 effect。
- **运行时渲染器**：`createRenderer` 通过 host operations 与平台解耦；Keyed Diff 先做双端预处理，再建立 key → newIndex 映射，最后对乱序节点使用最长递增子序列（LIS）减少移动。
- **异步调度器**：同一微任务内对 job 去重，按 id 保证父组件优先，并支持 flush 期间继续追加任务；`nextTick` 可等待当前批次完成。
- **模板编译器**：递归下降解析元素、属性、文本和插值，生成带位置信息的 AST；transform 支持自定义 node plugin，codegen 输出可执行的 render function。

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

3. **验证核心行为：**

    ```bash
    pnpm test
    pnpm type-check
    pnpm build
    ```

    测试覆盖 computed 缓存与 dirtyLevel、循环引用 watch、Scheduler 批处理、LIS、Keyed Diff，以及 `parse → transform → codegen → render` 编译链路。
