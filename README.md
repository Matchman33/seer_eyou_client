# seer_eyou_client

赛尔号插件管理器（Electron 客户端），用于统一管理与赛尔号微端相关的插件。

## 简介
本项目基于 Electron 开发，提供插件的安装、启用/禁用与更新，配合赛尔号微端实现便捷的启动与扩展。

## 功能
- 插件管理：安装、启用/禁用、更新
- 启动集成：与赛尔号微端协同工作
- 封包通信：通过 GameClient 与游戏服务端进行通信
- 插件系统：支持自定义插件开发，提供丰富的 API

## 快速开始

### 环境要求
- Node.js (建议 v16+)
- npm 或 pnpm

### 安装依赖
```bash
npm install
```

### 运行项目
```bash
npm start
```

### 项目结构
```
seer_eyou_client/
├── src/                    # 源代码目录
│   ├── preload.ts         # 预加载脚本，暴露 API 到渲染进程
│   ├── plugins/           # 插件管理器核心代码
│   │   ├── pluginManager.ts
│   │   └── types.ts
│   ├── utils/             # 工具函数
│   │   ├── fileUtils.ts
│   │   └── seerWindows.ts
│   └── public/            # 公共页面资源
├── plugins/               # 插件目录
│   ├── README.md          # 插件开发规范
│   └── com.demo.hello/    # 示例插件
├── release/               # 发布文件
│   └── README.md          # DLL 放置说明
├── index.ts               # 主进程入口
├── index.html             # 主窗口页面
└── package.json
```

## 开发指南

### 插件开发
详细的插件开发规范请参考 [plugins/README.md](plugins/README.md)

### API 说明
- **$game**: 游戏客户端接口（渲染进程）
  - `getGameClientInstance(port, ip)`: 获取 GameClient 单例实例
  - `unpackPacket(packet)`: 解析封包
  - `packPacket(packet)`: 打包封包
- **$win**: 窗口工具接口（渲染进程）
  - `saveSeerjsFile`: 保存魔法文件
  - `readSeerjsFile`: 读取魔法文件
  - `runScript`: 运行脚本

### 插件上下文 API
插件通过 `ctx` 对象访问以下功能：
- `ctx.host`: 宿主信息
- `ctx.plugin`: 插件信息
- `ctx.log`: 日志工具
- `ctx.game`: 游戏通信接口
- `ctx.ui`: UI 管理接口
- `ctx.menu`: 菜单管理接口
- `ctx.storage`: 存储接口

## 下载与安装
- 赛尔号微端下载地址：[SeerLauncher_setup.exe](https://newseer.61.com/apk/installer/SeerLauncher_setup.exe)

## 相关资源
- DLL 放置说明：参见 [release/README.md](release/README.md)
- 插件开发规范：参见 [plugins/README.md](plugins/README.md)
- 封包通信协议：参见 [release/README.md](release/README.md#封包通信说明)

## 许可
本仓库内容供学习与交流使用，具体许可以仓库内 LICENSE 文件为准（如有）。
