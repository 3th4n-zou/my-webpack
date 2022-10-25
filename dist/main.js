(function(graph){
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
      require('./src/index.js')
    })({"./src/index.js":{"dependencies":{"./age.js":"./src/age.js","./name.js":"./src/name.js"},"code":"\"use strict\";\n\nvar _age = require(\"./age.js\");\nvar _name = require(\"./name.js\");\nconsole.log(\"\".concat(_name.name, \"\\u4ECA\\u5E74\").concat(_age.age, \"\\u5C81\\u4E86\"));"},"./src/age.js":{"dependencies":{},"code":"\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.age = void 0;\nvar age = 22;\nexports.age = age;"},"./src/name.js":{"dependencies":{},"code":"\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.name = void 0;\nconsole.log('我来了');\nvar name = 'oneday';\nexports.name = name;"}})