import { contextBridge } from "electron";
import { GameClient } from "./utils/ipcClient";
import { SeerWindow } from "./utils/seerWindows";
import {
  saveSeerjsFile,
  readSeerjsFile,
  readSeerjsFiles,
  deleteSeerjsFile,
  renameSeerjsFile,
  runSeerjsFile,
} from "./utils/fileUtils";

console.log("preload.ts loaded");

/**
 * 暴露插件接口
 */
contextBridge.exposeInMainWorld("$game", {
  newGameClient: (port: number = 3000, ip: string = "127.0.0.1") => {
    const game = new GameClient(port, ip);
    return {
      on: (eventName: string, callback: (...args: any[]) => any) =>
        game.on(eventName, callback),
      emit: (
        eventName: string,
        params: any,
        callback: (...args: any[]) => any,
      ) => game.emit(eventName, params, callback),
      stop: () => game.close(),
    };
  },
});

/**
 * 暴露windows接口
 * 此接口只能让前端用来保存和读取魔法文件，魔法脚本不应该访问此接口
 */
contextBridge.exposeInMainWorld("$win", {
  saveSeerjsFile,
  readSeerjsFile,
  readSeerjsFiles,
  deleteSeerjsFile,
  renameSeerjsFile,
  openNewWindow: (
    url: string,
    options: Electron.BrowserWindowConstructorOptions = {},
  ) => {
    const win = new SeerWindow(url, options);
    return win;
  },

  // 运行脚本，待运行的脚本必须是一个独立的js文件，后缀为mjs
  runScript: runSeerjsFile,
});

/**
 * 暴露插件接口
 */
contextBridge.exposeInMainWorld("$plugin", {
  // 获取所有插件列表
  getAllPlugins: async () => {
    return await (global as any).pluginManager?.getAllPlugins() || [];
  },
  
  // 获取单个插件信息
  getPlugin: async (pluginId: string) => {
    return await (global as any).pluginManager?.getPlugin(pluginId);
  },
  
  // 启用插件
  enablePlugin: async (pluginId: string) => {
    return await (global as any).pluginManager?.activatePlugin(pluginId);
  },
  
  // 禁用插件
  disablePlugin: async (pluginId: string) => {
    return await (global as any).pluginManager?.deactivatePlugin(pluginId);
  },
  
  // 卸载插件
  uninstallPlugin: async (pluginId: string) => {
    return await (global as any).pluginManager?.uninstallPlugin(pluginId);
  },
  
  // 获取插件API
  getPluginAPI: (pluginId: string) => {
    return (global as any).pluginManager?.getPluginAPI(pluginId);
  },
  
  // 执行插件命令
  executeCommand: async (commandName: string, ...args: any[]) => {
    return await (global as any).pluginManager?.executeCommand(commandName, ...args);
  },
});
