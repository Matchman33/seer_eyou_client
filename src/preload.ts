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
