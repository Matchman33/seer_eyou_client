# 插件开发规范（plugins/）

本目录用于存放所有插件，每个插件是一个子目录，例如：

- `plugins/com.demo.hello/`
- `plugins/com.xxx.yyy/`

运行时，宿主会扫描 `plugins/*/index.js`，按以下规范加载插件。

---

## 1. 插件目录结构

每个插件必须满足：

- 目录名：任意（建议与 `meta.id` 对应，便于管理）
- 入口文件：`index.js`，采用 CommonJS 导出（`module.exports = { ... }`）

可选：

- 静态资源 / 页面：例如 `ui/index.html`
- 其他脚本 / 资源文件，由插件自行管理

---

## 2. 插件入口导出结构

入口文件 **必须导出一个对象**，结构如下：

```js
module.exports = {
  meta: { ... },
  lifecycle: { ... },   // 可选
  commands: { ... },    // 可选
  shortcuts: [ ... ],   // 可选（快捷键触发命令）
  ui: { ... },          // 可选
  menu: [ ... ],        // 可选（主窗口菜单）
};
```

### 2.1 meta（必填）

```ts
meta: {
  id: string;        // 插件唯一 ID，全局不能重复
  name: string;      // 插件名称
  version: string;   // 版本号（任意字符串）
  description?: string;
  author?: string;
}
```

注意：

- `id`、`name`、`version` 必须是非空字符串

### 2.2 lifecycle（可选）

插件生命周期钩子：

```ts
lifecycle: {
  onLoad?: (ctx) => void | Promise<void>;
  onEnable?: (ctx) => void | Promise<void>;
  onDisable?: (ctx) => void | Promise<void>;
  onUnload?: (ctx) => void | Promise<void>;
}
```

调用时机：

- `onLoad`：插件被扫描并加载后调用（仅一次）
- `onEnable`：插件被启用时调用（当前启动时默认启用全部插件）
- `onDisable`：插件被禁用时调用（应用关闭前会统一调用一次）
- `onUnload`：插件卸载前调用（应用关闭前）

### 2.3 commands（可选）

```ts
commands: {
  [command: string]: (ctx, payload: any) => any;
}
```

说明：

- `command` 为一个字符串，菜单项可通过 `command: string` 指定调用哪个函数
- `payload` 为菜单项配置中的 `payload` 字段，或宿主注入的额外信息（例如 `windowId`）。注意：主窗口菜单点击时，没有 `windowId`。

典型用法：

- 打开页面：`open` 调用 `ctx.ui.openPage(...)`
- 控制窗口：`window.reload` / `window.toggleDevTools` 等
- 发起 GameClient 事件：使用 `ctx.game.newGameClient`

### 2.4 ui（可选）

声明插件 UI 页面，供 `ctx.ui.openPage` 打开：

```ts
ui: {
  pages?: {
    id: string;       // 页面 ID，插件内部唯一
    title: string;    // 窗口标题（默认值）
    entry: string;    // 页面入口路径
    menu?: PluginMenuNode[]; // 可选：该页面窗口的专属菜单
    window?: {
      width?: number;
      height?: number;
      resizable?: boolean;
      title?: string; // 覆盖默认窗口标题
    };
  }[];
}
```

`entry` 支持两种形式：

- 相对路径：相对当前插件目录，例如 `"ui/index.html"`
- 绝对路径 / http(s) 地址：以 `http://` 或 `https://` 开头则视为 URL，使用 `loadURL` 加载

页面菜单 `menu`：

- 结构同下方的 `PluginMenuNode`
- 仅作用于该页面打开的窗口，**不会影响主窗口菜单**
- 点击时，`payload` 会自动合并一个 `{ windowId: string }`，用于在 command 里识别具体窗口

打开页面：

```js
await ctx.ui.openPage("home");                          // 使用页面配置
await ctx.ui.openPage("home", { width: 1024 });         // 临时覆盖窗口尺寸
```

### 2.5 menu（可选，主窗口菜单）

用于声明插件对主窗口顶层菜单的贡献：

```ts
menu: PluginMenuNode[];
```

`PluginMenuNode` 结构：

```ts
type PluginMenuNode =
  | { type: "separator" }
  | {
      id: string;
      label: string;
      enabled?: boolean;
      visible?: boolean;
      accelerator?: string; // 快捷键，如 "CmdOrCtrl+Shift+I"
      role?: string;
      checked?: boolean;
      type?: "normal" | "checkbox" | "radio";
      submenu?: PluginMenuNode[];
      command?: string;     // 对应 commands 的键名
      payload?: any;        // 传入 command 的 payload
    };
```

注意：

- 宿主会将菜单项的 `id` 规范化为 `${pluginId}:${id}` 避免冲突
- 有 `submenu` 的节点不会直接触发 `command`，点击行为由子菜单决定

### 2.6 shortcuts（可选，全局快捷键）

用于声明插件级别的快捷键映射，监听指定按键并触发对应的 `commands`：

```ts
shortcuts?: {
  id: string;
  key: string; // 对应 Electron before-input-event 的 input.key，如 "F5"、"F9"、"F12"、"r"
  modifiers?: Array<"shift" | "control" | "alt" | "meta">; // 可选修饰键
  command: string; // 要触发的 commands 键名
  payload?: any;   // 额外 payload，会与 { windowId, key, modifiers } 合并传入
}[];
```

行为：

- 仅对由该插件通过 `ctx.ui.openPage` 打开的窗口生效
- 宿主在窗口的 `before-input-event` 中监听 `keyDown` 事件
- 当按键与 `key` / `modifiers` 匹配时：
  - 调用 `commands[command](ctx, payload)`
  - 实际传入的 `payload` 为：
    - `{ ...(shortcut.payload ?? {}), windowId, key, modifiers }`
    - `modifiers` 包含 `{ shift, control, alt, meta }` 四个布尔值

典型用法：

- 在任意插件窗口中按 F9 切换当前窗口 DevTools：

```js
module.exports = {
  meta: { /* ... */ },
  shortcuts: [
    {
      id: "toggleDevToolsGlobal",
      key: "F9",
      command: "window.toggleDevTools",
    },
  ],
  commands: {
    "window.toggleDevTools": async (ctx, payload) => {
      if (!payload?.windowId) return;
      ctx.ui.toggleDevTools(payload.windowId);
    },
  },
};
```

---

## 3. 插件上下文（ctx）说明

所有 lifecycle/command 都会收到同一个 `ctx` 对象，类型为 `PluginContext`。

### 3.1 ctx.host

```ts
ctx.host: {
  isDev: boolean;  // 是否为开发模式（app.isPackaged === false）
};
```

用途：

- 根据 `isDev` 决定是否输出调试信息

### 3.2 ctx.plugin

```ts
ctx.plugin: {
  id: string;  // 等于 meta.id
  dir: string; // 插件所在目录的绝对路径
};
```

用途：

- 读取/写入插件自身目录下的资源文件

### 3.3 ctx.log

```ts
ctx.log: {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};
```

说明：

- 实际上是对 `console.log/console.warn/console.error` 的简单包装
- 会自动加上 `[plugin:<id>]` 前缀，方便在主进程日志中区分来源

### 3.4 ctx.game

封包通信接口，基于 `seer_eyou_js` 的 `GameClient`：

```ts
ctx.game.newGameClient(
  port: number = 3000,
  ip: string = "127.0.0.1",
): {
  on: (eventName: string, callback: (...args: any[]) => any) => any;
  emit: (
    eventName: string,
    params: any,
    callback: (...args: any[]) => any,
  ) => any;
  stop: () => void;
};
```

典型用法：

```js
const game = ctx.game.newGameClient();

game.on("_onLoginCallback", (data) => {
  ctx.log.info("login result", data);
});

game.emit("_is_login", {}, (res) => {
  ctx.log.info("is_login:", res);
  game.stop();
});
```

### 3.5 ctx.ui

用于基于 `ui.pages` 配置打开页面窗口，并控制已打开的窗口：

```ts
ctx.ui: {
  openPage: (
    pageId: string,
    options?: Electron.BrowserWindowConstructorOptions,
  ) => Promise<{ windowId: string }>;

  closeWindow: (windowId: string) => Promise<void>;
  setMenu: (windowId: string, nodes?: PluginMenuNode[]) => void;
  reload: (windowId: string) => void;
  toggleDevTools: (windowId: string) => void;
};
```

行为细节：

- 根据 `pageId` 在 `ui.pages` 中查找页面，找不到会抛出错误
- 解析 `entry` 为实际加载路径（同前文说明）
- 如页面有 `menu`，则为该窗口构建专属菜单，点击时 payload 自动注入 `{ windowId }`
-- 若无 `menu`，对该窗口调用 `setMenu(null)`，避免继承主窗口菜单

### 3.6 ctx.menu

```ts
ctx.menu: {
  refresh: () => void;
};
```

说明：

- 强制重新根据所有启用插件的 `definition.menu` 构建主窗口菜单
- 一般情况下不需要手动调用，宿主会在启用插件后自动刷新

### 3.7 ctx.storage

插件私有存储，保存在 `plugins/.storage/<pluginId>.json`：

```ts
ctx.storage: {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
};
```

行为：

- 每个插件一个独立的 JSON 文件
- `get`：
  - 如果文件不存在或内容非法，返回 `undefined`
  - 不会抛错（内部已处理）
- `set`：
  - 自动创建目录 `plugins/.storage/`
  - 以 `JSON.stringify` 形式写入

---

## 4. 最小示例

一个最小的可运行插件（带主菜单和页面）：

```js
module.exports = {
  meta: {
    id: "com.demo.hello",
    name: "Hello 示例插件",
    version: "1.0.0",
    description: "用于验证 plugins 标准的最小可运行示例",
    author: "demo",
  },

  lifecycle: {
    onLoad: async (ctx) => {
      ctx.log.info("onLoad");
    },
    onEnable: async (ctx) => {
      ctx.log.info("onEnable");
    },
    onDisable: async (ctx) => {
      ctx.log.info("onDisable");
    },
    onUnload: async (ctx) => {
      ctx.log.info("onUnload");
    },
  },

  commands: {
    open: async (ctx) => {
      return ctx.ui.openPage("home");
    },
  },

  ui: {
    pages: [
      {
        id: "home",
        title: "Hello 插件页面",
        entry: "ui/index.html",
        window: { width: 860, height: 520, resizable: true },
      },
    ],
  },

  menu: [
    {
      id: "root",
      label: "Hello 插件",
      submenu: [{ id: "open", label: "打开页面", command: "open" }],
    },
  ],
};
```

---

## 5. 必填与可选项总结

- **必须**
  - 插件目录下存在 `index.js`
  - `module.exports.meta`：
    - `id`、`name`、`version` 为非空字符串

- **可选但强烈推荐**
  - `meta.description`、`meta.author`
  - `lifecycle.onEnable` / `onDisable`：管理资源与状态
  - `commands`：整理插件对外能力
  - `ui.pages`：提供可视化页面
  - `menu`：在主窗口提供入口

- **可选高级能力**
  - `ctx.game`：与服务端进行封包通信
  - `ui.pages[].menu`：为每个页面窗口定制菜单
  - 在菜单 `payload` 中使用 `windowId` 操作具体窗口
