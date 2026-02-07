import fs from "fs/promises";
import path from "path";
import { app, Menu, MenuItemConstructorOptions } from "electron";
import { nanoid } from "nanoid";
import { SeerWindow } from "../utils/seerWindows";
import {
  PluginContext,
  PluginDefinition,
  PluginMenuNode,
  PluginShortcut,
} from "./types";
import { GameClient } from "seer_eyou_js";

type LoadedPlugin = {
  id: string;
  dir: string;
  definition: PluginDefinition;
  enabled: boolean;
  ctx: PluginContext;
};

export class PluginManager {
  // pluginsDir 指向运行目录下的 plugins（process.cwd()/plugins）
  private readonly pluginsDir: string;
  private readonly plugins = new Map<string, LoadedPlugin>();
  private readonly windows = new Map<string, SeerWindow>();

  // 单例实例
  private static instance: PluginManager | null = null;

  private constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  /**
   * 获取单例实例，如果未初始化则自动初始化
   * @param pluginsDir 插件目录路径（首次调用时必需）
   * @returns PluginManager 单例实例
   */
  static getInstance(pluginsDir?: string): PluginManager {
    if (PluginManager.instance === null) {
      if (!pluginsDir) {
        throw new Error(
          "PluginManager 未初始化，首次调用 getInstance 必须提供 pluginsDir 参数",
        );
      }
      PluginManager.instance = new PluginManager(pluginsDir);
    }
    return PluginManager.instance;
  }

  // 扫描并加载所有插件（只加载代码，不代表启用）
  // 目录规范：plugins/<任意文件夹名>/index.js
  // 插件唯一性：以 meta.id 为准
  async loadAll(): Promise<void> {
    await this.ensurePluginsDir();
    const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
    const pluginDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const folderName of pluginDirs) {
      const pluginDir = path.join(this.pluginsDir, folderName);
      const entryPath = path.join(pluginDir, "index.js");

      try {
        await fs.access(entryPath);
      } catch {
        continue;
      }

      // 动态导入js,definition为js导出内容
      const definition = this.safeRequire(entryPath);
      if (!this.isValidDefinition(definition)) {
        continue;
      }

      // 获取插件唯一id
      const pluginId = definition.meta.id;
      // 不重复导入
      if (this.plugins.has(pluginId)) {
        continue;
      }

      const ctx = this.createContext(pluginId, pluginDir, definition);
      const loaded: LoadedPlugin = {
        id: pluginId,
        dir: pluginDir,
        definition,
        enabled: false,
        ctx,
      };

      this.plugins.set(pluginId, loaded);
      await loaded.definition.lifecycle?.onLoad?.(loaded.ctx);
    }
  }

  // 默认启用全部插件（后续可以接入持久化启用状态）
  async enableAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await this.enable(plugin.id);
    }
  }

  // 禁用全部插件
  async disableAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await this.disable(plugin.id);
    }
  }

  // 卸载全部插件（一般用于应用退出）
  async unloadAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.definition.lifecycle?.onUnload?.(plugin.ctx);
    }
  }

  // 关闭插件打开的窗口、禁用与卸载插件
  async shutdown(): Promise<void> {
    await this.disableAll();
    for (const windowId of Array.from(this.windows.keys())) {
      await this.closeWindow(windowId);
    }
    await this.unloadAll();
  }

  // 将已启用插件贡献的 menu 合并成 Electron Menu 模板
  buildMenuTemplate(): MenuItemConstructorOptions[] {
    const template: MenuItemConstructorOptions[] = [];
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      const nodes = plugin.definition.menu ?? [];
      for (const node of nodes) {
        const converted = this.convertMenuNode(plugin.id, node);
        if (converted) template.push(converted);
      }
    }
    return template;
  }

  /**
   * 通过所有插件的配置生成顶部菜单栏
   *
   */
  refreshMenu(): void {
    const template = this.buildMenuTemplate();
    if (template.length === 0) {
      Menu.setApplicationMenu(null);
      return;
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  // 分发插件命令（由菜单点击触发，或后续宿主主动调用）
  async dispatchCommand(
    pluginId: string,
    command: string,
    payload: any,
  ): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) return;

    const handler = plugin.definition.commands?.[command];
    if (handler) {
      return handler(plugin.ctx, payload);
    }

    // 内置命令：统一用新窗口打开插件页面
    // if (command === "ui.open") {
    //   const pageId = payload?.pageId;
    //   if (typeof pageId !== "string" || pageId.length === 0) return;
    //   return plugin.ctx.ui.openPage(pageId, payload?.windowOptions);
    // }
  }

  // 启用单个插件
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.enabled) return;
    plugin.enabled = true;
    await plugin.definition.lifecycle?.onEnable?.(plugin.ctx);
  }

  // 禁用单个插件
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) return;
    plugin.enabled = false;
    await plugin.definition.lifecycle?.onDisable?.(plugin.ctx);
  }

  // 将插件菜单节点转换为 Electron MenuItem 模板
  // 约定：最终菜单 id 会被规范化为 `${pluginId}:${node.id}`，避免不同插件冲突
  private convertMenuNode(
    pluginId: string,
    node: PluginMenuNode,
    extraPayload?: any,
  ): MenuItemConstructorOptions | null {
    if ((node as any).type === "separator") {
      return { type: "separator" };
    }

    const normalizedId =
      typeof (node as any).id === "string" && (node as any).id.length > 0
        ? `${pluginId}:${(node as any).id}`
        : undefined;

    const submenu = (node as any).submenu as PluginMenuNode[] | undefined;
    const convertedSubmenu = submenu
      ? submenu
          .map((c) => this.convertMenuNode(pluginId, c, extraPayload))
          .filter(Boolean)
      : undefined;

    const command = (node as any).command as string | undefined;
    const payload = (node as any).payload;

    const item: MenuItemConstructorOptions = {
      id: normalizedId,
      label: (node as any).label,
      enabled: (node as any).enabled,
      visible: (node as any).visible,
      accelerator: (node as any).accelerator,
      role: (node as any).role,
      type: (node as any).type,
      checked: (node as any).checked,
      submenu: convertedSubmenu as any,
    };

    if (command && !convertedSubmenu) {
      item.click = () => {
        const merged =
          extraPayload && typeof extraPayload === "object"
            ? { ...payload, ...extraPayload }
            : payload;
        void this.dispatchCommand(pluginId, command, merged);
      };
    }

    return item;
  }

  private buildWindowMenuTemplateWithWindowId(
    pluginId: string,
    windowId: string,
    nodes?: PluginMenuNode[],
  ): MenuItemConstructorOptions[] | undefined {
    if (!nodes || nodes.length === 0) return undefined;
    const template: MenuItemConstructorOptions[] = [];
    for (const node of nodes) {
      const converted = this.convertMenuNode(pluginId, node, { windowId });
      if (converted) template.push(converted);
    }
    return template.length > 0 ? template : undefined;
  }

  private matchShortcutModifiers(
    input: Electron.Input,
    modifiers?: Array<"shift" | "control" | "alt" | "meta">,
  ): boolean {
    if (!modifiers || modifiers.length === 0) return true;
    const required = new Set(modifiers);
    const pressed = new Set<string>();
    if (input.shift) pressed.add("shift");
    if (input.control) pressed.add("control");
    if (input.alt) pressed.add("alt");
    if (input.meta) pressed.add("meta");
    if (required.size !== pressed.size) return false;
    for (const m of required) {
      if (!pressed.has(m)) return false;
    }
    return true;
  }

  private bindShortcutsForWindow(
    pluginId: string,
    windowId: string,
    win: SeerWindow,
    shortcuts?: PluginShortcut[],
  ): void {
    if (!shortcuts || shortcuts.length === 0) return;
    win.webContents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;
      for (const shortcut of shortcuts) {
        if (input.key !== shortcut.key) continue;
        if (!this.matchShortcutModifiers(input, shortcut.modifiers)) continue;
        event.preventDefault();
        const payload = {
          ...(shortcut.payload ?? {}),
          windowId,
          key: input.key,
          modifiers: {
            shift: input.shift,
            control: input.control,
            alt: input.alt,
            meta: input.meta,
          },
        };
        void this.dispatchCommand(pluginId, shortcut.command, payload);
        break;
      }
    });
  }

  private createContext(
    pluginId: string,
    pluginDir: string,
    definition: PluginDefinition,
  ): PluginContext {
    // 插件私有存储：保存为 plugins/.storage/<pluginId>.json
    const storagePath = path.join(
      this.pluginsDir,
      ".storage",
      `${pluginId}.json`,
    );

    const readStorage = async (): Promise<Record<string, any>> => {
      try {
        const buf = await fs.readFile(storagePath, "utf-8");
        const parsed = JSON.parse(buf);
        if (parsed && typeof parsed === "object") return parsed;
        return {};
      } catch {
        return {};
      }
    };

    const writeStorage = async (data: Record<string, any>): Promise<void> => {
      await fs.mkdir(path.dirname(storagePath), { recursive: true });
      await fs.writeFile(storagePath, JSON.stringify(data, null, 2), "utf-8");
    };

    let game: GameClient | null = null;

    const ctx: PluginContext = {
      host: { isDev: !app.isPackaged },
      plugin: { id: pluginId, dir: pluginDir },
      log: {
        // 同时打印时间
        info: (...args) =>
          console.log(
            `[plugin:${pluginId}-${new Date().toLocaleString()}]`,
            ...args,
          ),
        warn: (...args) =>
          console.warn(
            `[plugin:${pluginId}-${new Date().toLocaleString()}]`,
            ...args,
          ),
        error: (...args) =>
          console.error(
            `[plugin:${pluginId}-${new Date().toLocaleString()}]`,
            ...args,
          ),
      },
      game: {
        getGameClientInstance: (
          port: number = 3000,
          ip: string = "127.0.0.1",
        ) => {
          if (!game) game = new GameClient(port, ip);
          return {
            on: (eventName: string, callback: (...args: any[]) => any) =>
              game!.on(eventName, callback),
            emit: (
              eventName: string,
              params: any,
              callback: (...args: any[]) => any,
            ) => game!.emit(eventName, params, callback),
            stop: () => {
              game!.close();
              game = null;
            },
          };
        },
      },
      ui: {
        openPage: async (pageId, options) => {
          const pages = definition.ui?.pages ?? [];
          const page = pages.find((p) => p.id === pageId);
          if (!page) {
            throw new Error(`Unknown pageId: ${pageId}`);
          }

          // entry 解析逻辑：
          // - http(s) 开头：当作 URL，使用 BrowserWindow.loadURL
          // - 其他：当作文件路径，相对插件目录进行拼接，最终用 BrowserWindow.loadFile 加载
          const resolvedEntry = this.resolveUiEntry(pluginDir, page.entry);
          if (!resolvedEntry.startsWith("http")) {
            await fs.access(resolvedEntry);
          }

          const windowId = nanoid();
          const win = new SeerWindow(resolvedEntry, {
            width: page.window?.width,
            height: page.window?.height,
            resizable: page.window?.resizable,
            title: page.window?.title ?? page.title,
            ...options,
          });

          // 如果页面声明了专属菜单，则只为该窗口设置这一份菜单
          const pageMenu = this.buildWindowMenuTemplateWithWindowId(
            pluginId,
            windowId,
            page.menu,
          );
          if (pageMenu) {
            win.browserWindow.setMenu(Menu.buildFromTemplate(pageMenu));
          } else {
            // 未声明页面菜单：清空该窗口菜单栏，避免显示主窗口的全局菜单
            win.browserWindow.setMenu(null);
          }

          this.windows.set(windowId, win);
          this.bindShortcutsForWindow(
            pluginId,
            windowId,
            win,
            definition.shortcuts,
          );
          win.on("closed", () => {
            this.windows.delete(windowId);
          });

          return { windowId };
        },
        closeWindow: async (windowId) => {
          await this.closeWindow(windowId);
        },
        setMenu: (windowId: string, nodes?: PluginMenuNode[]) => {
          const win = this.windows.get(windowId);
          if (!win) return;
          const template = this.buildWindowMenuTemplateWithWindowId(
            pluginId,
            windowId,
            nodes,
          );
          win.browserWindow.setMenu(
            template ? Menu.buildFromTemplate(template) : null,
          );
        },
        reload: (windowId: string) => {
          const win = this.windows.get(windowId);
          win?.reload();
        },
        toggleDevTools: (windowId: string) => {
          const win = this.windows.get(windowId);
          win?.webContents.toggleDevTools();
        },
      },
      menu: {
        refresh: () => this.refreshMenu(),
      },
      storage: {
        get: async (key) => {
          const data = await readStorage();
          return data[key];
        },
        set: async (key, value) => {
          const data = await readStorage();
          data[key] = value;
          await writeStorage(data);
        },
      },
    };

    return ctx;
  }

  // 将插件声明的 entry 转换为 SeerWindow 可加载的路径
  // 插件最终放在运行目录：process.cwd()/plugins/<插件目录>/...
  private resolveUiEntry(pluginDir: string, entry: string): string {
    if (entry.startsWith("http://") || entry.startsWith("https://"))
      return entry;
    return path.isAbsolute(entry) ? entry : path.join(pluginDir, entry);
  }

  // 关闭由插件打开的窗口
  private async closeWindow(windowId: string): Promise<void> {
    const win = this.windows.get(windowId);
    if (!win) return;
    try {
      win.close();
    } finally {
      this.windows.delete(windowId);
    }
  }

  private safeRequire(entryPath: string): any {
    const required = require(entryPath);
    return required?.default ?? required;
  }

  // 校验插件入口导出结构是否满足最小标准
  private isValidDefinition(definition: any): definition is PluginDefinition {
    if (!definition || typeof definition !== "object") return false;
    if (!definition.meta || typeof definition.meta !== "object") return false;
    if (
      typeof definition.meta.id !== "string" ||
      definition.meta.id.length === 0
    )
      return false;
    if (
      typeof definition.meta.name !== "string" ||
      definition.meta.name.length === 0
    )
      return false;
    if (
      typeof definition.meta.version !== "string" ||
      definition.meta.version.length === 0
    )
      return false;
    return true;
  }

  private async ensurePluginsDir(): Promise<void> {
    await fs.mkdir(this.pluginsDir, { recursive: true });
  }
}
