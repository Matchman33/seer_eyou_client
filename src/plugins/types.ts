import { SeerWindow } from "../utils/seerWindows";

// 插件生命周期：宿主会在不同阶段调用这些钩子
export type PluginLifecycle = {
  onLoad?: (ctx: PluginContext) => void | Promise<void>;
  onEnable?: (ctx: PluginContext) => void | Promise<void>;
  onDisable?: (ctx: PluginContext) => void | Promise<void>;
  onUnload?: (ctx: PluginContext) => void | Promise<void>;
};

// 插件元信息：用于唯一标识插件、兼容宿主 API 版本
export type PluginMeta = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
};

// 插件菜单声明：宿主会转换为 Electron Menu 模板
export type PluginMenuNode =
  | { type: "separator" }
  | {
      id: string;
      label: string;
      enabled?: boolean;
      visible?: boolean;
      accelerator?: string;
      role?: string;
      checked?: boolean;
      type?: "normal" | "checkbox" | "radio";
      submenu?: PluginMenuNode[];
      command?: string;
      payload?: any;
    };

// 插件快捷键声明：用于监听指定按键并触发命令
export type PluginShortcut = {
  id: string;
  // 键值来自 Electron before-input-event 的 input.key，例如 "F5"、"F12"、"r"
  key: string;
  // 可选修饰键列表，不填则表示不要求特定修饰键
  modifiers?: Array<"shift" | "control" | "alt" | "meta">;
  command: string;
  payload?: any;
};

// 插件可选 UI 页面：entry 支持相对插件目录的文件路径，或 http(s) URL
export type PluginUiPage = {
  id: string;
  title: string;
  entry: string;
  // 可选：为该页面窗口单独定义菜单布局与点击行为
  menu?: PluginMenuNode[];
  window?: {
    width?: number;
    height?: number;
    resizable?: boolean;
    title?: string;
  };
};

export type PluginUi = {
  pages?: PluginUiPage[];
};

// 插件命令：菜单点击或宿主调用会分发到这里
export type PluginCommandHandler = (ctx: PluginContext, payload: any) => any;

// 插件入口导出结构（plugins/<pluginId>/index.js）
export type PluginDefinition = {
  meta: PluginMeta;
  lifecycle?: PluginLifecycle;
  commands?: Record<string, PluginCommandHandler>;
  ui?: PluginUi;
  menu?: PluginMenuNode[];
  shortcuts?: PluginShortcut[];
};
 export type Packet = {
  // 封包长度
  length: number;
  // 协议版本号
  version: number;
  // 命令号
  cmd: number;
  // 米米号
  account: number;
  // 校验码
  checknum: number;
  // 封包体
  data: string;
};
// 插件上下文：宿主提供给插件的受控能力集合
export type PluginContext = {
  host: { isDev: boolean };
  plugin: { id: string; dir: string };
  log: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  // 事件分发统一采用 seer_eyou_js 的 GameClient（与 preload.ts 暴露的 $game 行为一致）
  game: {
    getGameClientInstance: (
      port?: number,
      ip?: string,
    ) => {
      on: (eventName: string, callback: (...args: any[]) => any) => any;
      emit: (
        eventName: string,
        params: any,
        callback: (...args: any[]) => any,
      ) => any;
      stop: () => void;
    };
    packPacket: (params: Packet) => string;
    unpackPacket: (packet: string) => Packet;
  };
  ui: {
    openPage: (
      pageId: string,
      options?: Electron.BrowserWindowConstructorOptions,
    ) => Promise<{ windowId: string }>;
    closeWindow: (windowId: string) => Promise<void>;
    setMenu: (windowId: string, nodes?: PluginMenuNode[]) => void;
    reload: (windowId: string) => void;
    toggleDevTools: (windowId: string) => void;
    getWindow: (windowId: string) => SeerWindow | undefined;
  };
  menu: { refresh: () => void };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
};

