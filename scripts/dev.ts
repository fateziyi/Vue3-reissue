
import minimist from 'minimist'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import esbuild from 'esbuild'

// node中的命令行参数通过process来获取
const args = minimist(process.argv.slice(2))

// esm 使用commonjs变量
const __filename = fileURLToPath(import.meta.url) // 获取当前文件的目录名 file: -> /user
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)
const target = args._[0] || 'reactivity' // 要打包的模块名称
const format = (args.f || 'iife') as esbuild.Format // 打包后的模块化规范

// 入口文件 根据命令行提供的路径进行解析
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
const pkg = require(`../packages/${target}/package.json`)

// 根据需要进行打包
esbuild.context({
  entryPoints: [entry], // 入口文件
  outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 打包后的文件名
  bundle: true, // reactivity -> shared 会打包在一起
  platform: 'browser', // 打包给浏览器使用
  format, // cjs esm iife
  sourcemap: true, // 可以调试源代码
  globalName: pkg.buildOptions?.name, // 全局变量名
}).then((ctx) => {
  console.log(`${target} done`)
  return ctx.watch() // 监控入口文件持续进行打包处理
})
