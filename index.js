const fs = require('fs')
const path = require('path')
const options = require('./webpack.config.js')

// 分析内部的语法,包括 es6,返回一个 AST 抽象语法树
const parser = require('@babel/parser')
// 遍历维护 AST树 的整体状态，找出 依赖模块
const traverse = require('@babel/traverse').default
//将 AST 语法树转换为浏览器可执行代码
const { transformFromAst } = require('@babel/core')

const Parser = {
  getAst: (path) => {
    // 读取入口文件
    const content = fs.readFileSync(path, 'utf-8')
    // 将文件内容转化为 AST 抽象语法树
    return parser.parse(content, {
      sourceType: 'module',
    })
  },
  getDependencies: (ast, filename) => {
    const dependencies = {}
    // 遍历所有 import 的模块，存入 dependencies 中
    traverse(ast, {
      // 类型为 ImportDeclaration 的 AST 节点 (即 import 语句)
      ImportDeclaration({ node }) {
        const dirname = path.dirname(filename)
        // 保存依赖模块路径，后续生成依赖关系图需要用到
        const filepath = './' + path.join(dirname, node.source.value)
        dependencies[node.source.value] = filepath
      },
    })

    return dependencies
  },
  getCode: (ast) => {
    // 将 AST 转换为浏览器可执行代码
    const { code } = transformFromAst(ast, null, {
      presets: ['@babel/preset-env'],
    })

    return code
  },
}

class Compiler {
  constructor(options) {
    // webpack 配置
    const { entry, output } = options

    // 入口
    this.entry = entry
    //出口
    this.output = output
    // 模块
    this.modules = []
  }

  // 构建启动函数
  run() {
    // 解析入口文件
    const info = this.build(this.entry)
    this.modules.push(info)
    // 不能用 foreach，foreach获取的length内部固定了，会导致深层次的import不会被添加到编译列表中
    for (let i = 0; i < this.modules.length; i++) {
      // 判断有依赖对象，有则递归解析所有依赖项
      const deps = this.modules[i].dependencies
      if (deps) {
        for (const dependency in deps) {
          this.modules.push(this.build(deps[dependency]))
        }
      }
    }
    // this.modules.forEach(({ dependencies }) => {
    //   if (dependencies) {
    //     for (const dependency in dependencies) {
    //       this.modules.push(this.build(dependencies[dependency]))
    //     }
    //   }
    // })

    // 生成依赖关系图
    const dependencyGraph = this.modules.reduce(
      (graph, item) => ({
        ...graph,
        // 使用文件路径作为每个模块的唯一标识符,保存对应模块的依赖对象和文件内容
        [item.filename]: {
          dependencies: item.dependencies,
          code: item.code,
        },
      }),
      {}
    )
    this.generate(dependencyGraph)
  }

  build(filename) {
    const { getAst, getDependencies, getCode } = Parser
    const ast = getAst(filename)
    const dependencies = getDependencies(ast, filename)
    const code = getCode(ast)

    return {
      // 文件路径，可以作为每个文件的唯一标识符
      filename,
      // 依赖对象，保存着依赖模块路径
      dependencies,
      // 文件内容
      code,
    }
  }

  // 重写require函数(浏览器不能识别commonjs语法)，输出bundle
  generate(code) {
    // 输出文件路径
    const filePath = path.join(this.output.path, this.output.filename)
    const bundle = `(function(graph){
      function require(module){
        function localRequire(relativePath){
          return require(graph[module].dependencies[relativePath])
        }
        var exports = {};
        (function(require,exports,code){
          eval(code)
        })(localRequire,exports,graph[module].code);
        return exports;
      }
      require('${this.entry}')
    })(${JSON.stringify(code)})`

    // 把文件内容写进文件系统
    fs.writeFileSync(filePath, bundle, 'utf-8')
  }
}

new Compiler(options).run()
