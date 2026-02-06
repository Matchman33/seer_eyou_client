# 📋 开发指南与TODO清单

> 基于seer_eyou_client项目的完整开发指南

---

## 🎯 当前项目状态

### ✅ 已完成的部分
- [x] Electron主程序框架
- [x] 窗口管理系统
- [x] IPC通信机制（客户端/服务端）
- [x] 文件管理工具
- [x] 预加载脚本API暴露
- [x] 数据包解析器
- [x] TypeScript配置

### ⚠️ 缺失的部分
- [ ] 前端Vue界面（当前仅有URL占位符）
- [ ] 插件市场功能
- [ ] 用户配置管理
- [ ] 自动更新机制
- [ ] 错误日志系统
- [ ] 单元测试
- [ ] 打包配置

---

## 🚀 快速开始指南

### 第一步：环境准备

#### 1.1 安装Node.js
```bash
# 检查Node.js版本（建议v18+）
node --version
npm --version
```

#### 1.2 安装项目依赖
```bash
cd e:/seer/seer_eyou_client
npm install
```

#### 1.3 安装赛尔号游戏
- 下载地址：https://newseer.61.com/apk/installer/SeerLauncher_setup.exe
- 默认安装路径：`D:\SeerLauncher\`

#### 1.4 部署DLL文件
```bash
# 将release目录下的DLL文件复制到游戏目录
# 需要手动创建目标目录（如不存在）

# 方法1：手动复制
复制 release/CrashSight64.dll → D:\SeerLauncher\games\NewSeer\Seer_Data\Plugins\x86_64\
复制 release/seerHacker.dll → D:\SeerLauncher\games\NewSeer\

# 方法2：使用脚本（推荐添加到项目中）
# 见下文"需要添加的脚本"部分
```

---

## 📝 必须完成的任务

### 🔴 优先级1：核心功能开发

#### 1. 创建前端界面（Vue项目）

**当前问题**：
- `index.ts` 中硬编码了 `http://localhost:5173`
- 项目中没有Vue前端代码

**需要做的**：

**方案A：创建独立的Vue项目（推荐）**
```bash
# 在项目外创建Vue前端
cd e:/seer
npm create vue@latest seer_eyou_web

# 选择配置
✔ Project name: seer_eyou_web
✔ Add TypeScript? Yes
✔ Add Vue Router? Yes
✔ Add Pinia? Yes (状态管理)
✔ Add Vitest? Yes (单元测试)

cd seer_eyou_web
npm install
npm run dev  # 启动开发服务器（默认5173端口）
```

**方案B：集成到当前项目**
```bash
# 在项目根目录创建web目录
mkdir web
cd web
npm create vite@latest . -- --template vue-ts
npm install
```

**前端需要实现的页面**：
- [ ] 主界面布局
- [ ] 插件列表展示
- [ ] 插件安装/卸载界面
- [ ] 封包监控面板
- [ ] 游戏连接状态显示
- [ ] 设置页面
- [ ] 日志查看器

**前端需要调用的API**：
```typescript
// 文件操作
window.$win.saveSeerjsFile(fileName, content)
window.$win.readSeerjsFile(fileName)
window.$win.readSeerjsFiles()
window.$win.deleteSeerjsFile(fileName)
window.$win.renameSeerjsFile(oldName, newName)
window.$win.runScript(modulePath, args, options)

// 游戏通信
const gameClient = window.$game.newGameClient(3000, '127.0.0.1')
gameClient.on('_onLoginCallback', callback)
gameClient.on('_onRecvCallback', callback)
gameClient.on('_onSendCallback', callback)
gameClient.emit('_fresh', {})
gameClient.emit('_is_login', {})
gameClient.emit('_send_packet', { packet: '...' })
```

---

#### 2. 添加TypeScript类型定义

**创建文件**：`src/types/global.d.ts`

```typescript
// src/types/global.d.ts
export interface GameClientAPI {
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  emit: (eventName: string, params: any, callback?: (...args: any[]) => void) => void;
  stop: () => void;
}

export interface WindowAPI {
  saveSeerjsFile: (fileName: string, content: string) => Promise<void>;
  readSeerjsFile: (fileName: string) => Promise<string>;
  readSeerjsFiles: () => Promise<any[]>;
  deleteSeerjsFile: (fileName: string) => Promise<void>;
  renameSeerjsFile: (oldName: string, newName: string) => Promise<void>;
  openNewWindow: (url: string, options?: Electron.BrowserWindowConstructorOptions) => any;
  runScript: (modulePath: string, args?: readonly string[], options?: any) => {
    child: any;
    exit: () => void;
    addListener: (eventName: string, callback: (...args: any[]) => void) => void;
  };
}

declare global {
  interface Window {
    $game: {
      newGameClient: (port?: number, ip?: string) => GameClientAPI;
    };
    $win: WindowAPI;
  }
}

export {};
```

**TODO**：
- [ ] 创建 `src/types/global.d.ts`
- [ ] 在Vue项目中引入此类型文件
- [ ] 完善所有API的类型定义

---

#### 3. 添加配置管理系统

**当前问题**：
- 端口号（3000）硬编码
- 文件路径硬编码
- 游戏路径需要手动配置

**创建文件**：`config.json`

```json
{
  "game": {
    "serverPort": 3000,
    "serverHost": "127.0.0.1",
    "installPath": "D:\\SeerLauncher\\games\\NewSeer",
    "autoConnect": true
  },
  "app": {
    "windowWidth": 975,
    "windowHeight": 640,
    "devServerUrl": "http://localhost:5173",
    "productionIndex": "./dist-web/index.html"
  },
  "plugin": {
    "storePath": "./seer_magic",
    "autoLoad": true,
    "allowedExtensions": [".mjs"]
  },
  "security": {
    "enableDevTools": true,
    "enableWebSecurity": true,
    "enableSandbox": false
  }
}
```

**创建文件**：`src/utils/config.ts`

```typescript
import fs from 'fs';
import path from 'path';

interface AppConfig {
  game: {
    serverPort: number;
    serverHost: string;
    installPath: string;
    autoConnect: boolean;
  };
  app: {
    windowWidth: number;
    windowHeight: number;
    devServerUrl: string;
    productionIndex: string;
  };
  plugin: {
    storePath: string;
    autoLoad: boolean;
    allowedExtensions: string[];
  };
  security: {
    enableDevTools: boolean;
    enableWebSecurity: boolean;
    enableSandbox: boolean;
  };
}

class ConfigManager {
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('配置文件不存在，使用默认配置');
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AppConfig {
    // 返回上面JSON中的默认值
    return {
      game: { serverPort: 3000, serverHost: '127.0.0.1', installPath: 'D:\\SeerLauncher\\games\\NewSeer', autoConnect: true },
      app: { windowWidth: 975, windowHeight: 640, devServerUrl: 'http://localhost:5173', productionIndex: './dist-web/index.html' },
      plugin: { storePath: './seer_magic', autoLoad: true, allowedExtensions: ['.mjs'] },
      security: { enableDevTools: true, enableWebSecurity: true, enableSandbox: false }
    };
  }

  public get(key: keyof AppConfig): any {
    return this.config[key];
  }

  public save(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }
}

export const configManager = new ConfigManager();
```

**TODO**：
- [ ] 创建 `config.json`
- [ ] 创建 `src/utils/config.ts`
- [ ] 修改 `index.ts` 使用配置文件
- [ ] 修改 `fileUtils.ts` 使用配置路径

---

#### 4. 添加日志系统

**安装依赖**：
```bash
npm install winston
npm install --save-dev @types/winston
```

**创建文件**：`src/utils/logger.ts`

```typescript
import winston from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    // 错误日志
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 所有日志
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

**TODO**：
- [ ] 安装winston
- [ ] 创建 `src/utils/logger.ts`
- [ ] 在各模块中替换 `console.log` 为 `logger.info`
- [ ] 在各模块中替换 `console.error` 为 `logger.error`

---

### 🟡 优先级2：功能增强

#### 5. 添加错误处理机制

**需要修改的文件**：

**`src/utils/ipcClient.ts`**
```typescript
// 添加超时机制
public acquire(eventName: string, data: any, timeout: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout: ${eventName}`));
    }, timeout);

    this.emit(eventName, data, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

// 添加重连机制
private reconnect(): void {
  if (this.status === 'closed' && this.reconnectAttempts < this.maxReconnectAttempts) {
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay);
  }
}
```

**TODO**：
- [ ] 为IPC客户端添加超时处理
- [ ] 添加自动重连机制
- [ ] 为文件操作添加try-catch包装
- [ ] 统一错误码定义

---

#### 6. 添加自动部署DLL脚本

**创建文件**：`scripts/deploy-dll.js`

```javascript
const fs = require('fs');
const path = require('path');

const config = require('../config.json');

function deployDLL() {
  const gameBasePath = config.game.installPath;
  
  const deployments = [
    {
      source: './release/CrashSight64.dll',
      target: path.join(gameBasePath, 'Seer_Data/Plugins/x86_64/CrashSight64.dll')
    },
    {
      source: './release/seerHacker.dll',
      target: path.join(gameBasePath, 'seerHacker.dll')
    }
  ];

  deployments.forEach(({ source, target }) => {
    try {
      // 创建目标目录
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`✓ 创建目录: ${targetDir}`);
      }

      // 复制文件
      fs.copyFileSync(source, target);
      console.log(`✓ 部署成功: ${path.basename(source)} → ${target}`);
    } catch (error) {
      console.error(`✗ 部署失败: ${source}`, error.message);
    }
  });
}

deployDLL();
```

**添加到package.json**：
```json
{
  "scripts": {
    "start": "tsc && electron .",
    "deploy:dll": "node scripts/deploy-dll.js",
    "dev": "tsc && npm run deploy:dll && electron .",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

**TODO**：
- [ ] 创建 `scripts/deploy-dll.js`
- [ ] 修改 `package.json` 添加新脚本
- [ ] 测试自动部署功能

---

#### 7. 添加打包配置

**安装electron-builder**：
```bash
npm install --save-dev electron-builder
```

**添加到package.json**：
```json
{
  "scripts": {
    "build": "tsc",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.seer.eyou.client",
    "productName": "赛尔号易游插件管理器",
    "directories": {
      "output": "build"
    },
    "files": [
      "dist/**/*",
      "release/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "release/",
        "to": "release/"
      }
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

**TODO**：
- [ ] 安装electron-builder
- [ ] 配置package.json的build字段
- [ ] 准备应用图标（assets/icon.ico）
- [ ] 测试打包流程

---

### 🟢 优先级3：优化改进

#### 8. 添加单元测试

**安装测试框架**：
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @jest/globals
```

**创建配置**：`jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**创建测试文件**：`src/utils/__tests__/fileUtils.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { saveSeerjsFile, readSeerjsFile, deleteSeerjsFile } from '../fileUtils';

describe('fileUtils', () => {
  const testDir = path.join(process.cwd(), 'test_seer_magic');
  const testFileName = 'test.mjs';

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should save and read file correctly', async () => {
    const content = 'console.log("test")';
    await saveSeerjsFile(testFileName, content, testDir);
    const readContent = await readSeerjsFile(testFileName, testDir);
    expect(readContent).toBe(content);
  });

  it('should delete file correctly', async () => {
    const content = 'test content';
    await saveSeerjsFile(testFileName, content, testDir);
    await deleteSeerjsFile(testFileName, testDir);
    await expect(readSeerjsFile(testFileName, testDir)).rejects.toThrow();
  });
});
```

**TODO**：
- [ ] 安装Jest
- [ ] 创建jest.config.js
- [ ] 为每个工具模块编写测试
- [ ] 添加测试脚本到package.json

---

#### 9. 改进项目结构

**建议的完整项目结构**：
```
seer_eyou_client/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.ts            # 主入口
│   │   ├── window.ts           # 窗口管理
│   │   └── menu.ts             # 菜单配置
│   ├── preload/                # 预加载脚本
│   │   └── index.ts
│   ├── utils/                  # 工具函数
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── fileUtils.ts
│   │   ├── ipcClient.ts
│   │   ├── ipcServer.ts
│   │   ├── packet.ts
│   │   └── __tests__/          # 测试文件
│   ├── types/                  # 类型定义
│   │   └── global.d.ts
│   └── constants/              # 常量定义
│       └── events.ts           # 事件名常量
├── web/                        # 前端Vue项目
│   ├── src/
│   ├── public/
│   └── package.json
├── release/                    # DLL文件
├── scripts/                    # 脚本工具
│   └── deploy-dll.js
├── assets/                     # 静态资源
│   └── icon.ico
├── logs/                       # 日志目录
├── config.json                 # 配置文件
├── package.json
└── tsconfig.json
```

**TODO**：
- [ ] 重构目录结构
- [ ] 移动文件到新目录
- [ ] 更新import路径

---

#### 10. 文档完善

**需要创建的文档**：

- [ ] `API.md` - API接口文档
- [ ] `CONTRIBUTING.md` - 贡献指南
- [ ] `CHANGELOG.md` - 变更日志
- [ ] `开发环境搭建.md` - 详细的环境配置指南
- [ ] `插件开发指南.md` - 如何开发.mjs插件
- [ ] `故障排除.md` - 常见问题解决方案

---

## 📅 开发时间线建议

### 第一周：基础设施
- [ ] 创建Vue前端项目
- [ ] 添加TypeScript类型定义
- [ ] 添加配置管理系统
- [ ] 添加日志系统

### 第二周：核心功能
- [ ] 开发前端主界面
- [ ] 实现插件列表功能
- [ ] 实现文件管理界面
- [ ] 测试IPC通信

### 第三周：高级功能
- [ ] 封包监控面板
- [ ] 游戏连接状态显示
- [ ] 设置页面
- [ ] 错误处理优化

### 第四周：测试与部署
- [ ] 编写单元测试
- [ ] 集成测试
- [ ] 打包配置
- [ ] 文档完善

---

## 🔍 调试技巧

### 调试Electron主进程
```bash
# 启动时添加inspect参数
electron --inspect=5858 .
```

### 调试渲染进程
- 按F12打开开发者工具
- 在Sources面板查看代码
- 设置断点调试

### 调试IPC通信
```typescript
// 在ipcClient.ts中添加调试日志
private handlePacket(packet: Packet): void {
  console.log('[IPC] Received packet:', packet);
  // ... 其他代码
}
```

---

## ⚡ 快速命令参考

```bash
# 开发模式
npm run start

# 部署DLL
npm run deploy:dll

# 开发+部署
npm run dev

# 编译TypeScript
npm run build

# 运行测试
npm test

# 打包应用
npm run dist

# 清理编译产物
rm -rf dist/ build/
```

---

## 🎓 学习资源

### Electron相关
- [Electron官方文档](https://www.electronjs.org/docs)
- [Electron最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)

### Vue相关
- [Vue 3官方文档](https://cn.vuejs.org/)
- [Vite文档](https://cn.vitejs.dev/)

### TypeScript相关
- [TypeScript官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript深入理解](https://jkchao.github.io/typescript-book-chinese/)

---

## 🐛 已知问题与解决方案

### 问题1：Electron窗口白屏
**原因**：前端服务未启动或端口不对
**解决**：
```bash
# 检查前端是否在运行
netstat -ano | findstr 5173

# 启动前端服务
cd web && npm run dev
```

### 问题2：DLL注入失败
**原因**：游戏路径不正确或权限不足
**解决**：
- 确认游戏路径正确
- 以管理员身份运行
- 检查杀毒软件是否拦截

### 问题3：IPC连接失败
**原因**：端口被占用或游戏未启动
**解决**：
```bash
# 检查端口占用
netstat -ano | findstr 3000

# 修改配置文件端口号
```

---

## 📞 获取帮助

- 查看项目分析报告：`项目分析报告.md`
- 查看release说明：`release/readme.md`
- GitHub Issues：提交问题和建议
- 阅读源码注释

---

## ✅ 检查清单

使用此清单跟踪你的进度：

### 环境准备
- [ ] 安装Node.js
- [ ] 安装npm依赖
- [ ] 安装赛尔号游戏
- [ ] 部署DLL文件

### 核心开发
- [ ] 创建Vue前端项目
- [ ] 添加TypeScript类型
- [ ] 实现配置管理
- [ ] 添加日志系统
- [ ] 开发主界面
- [ ] 实现插件管理
- [ ] 实现封包监控

### 测试与优化
- [ ] 编写单元测试
- [ ] 功能测试
- [ ] 性能优化
- [ ] 错误处理完善

### 部署发布
- [ ] 配置打包
- [ ] 生成安装包
- [ ] 编写用户手册
- [ ] 发布版本

---

**文档生成时间**: 2026年2月6日  
**适用版本**: 1.0.0  
**维护者**: 开发团队

---

*祝你开发顺利！如有问题，请参考项目分析报告或提交Issue。* 🚀
