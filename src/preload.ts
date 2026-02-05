import { contextBridge } from "electron";
import { GameClient } from "./utils/ipcClient";
import { SeerWindow } from "./utils/seerWindows";
import {
  saveSeerjsFile,
  readSeerjsFile,
  readSeerjsFiles,
  deleteSeerjsFile,
  renameSeerjsFile,
} from "./utils/fileUtils";
import { fork, ForkOptions } from "child_process";
import { kill } from "process";
console.log("preload.ts loaded");
contextBridge.exposeInMainWorld("$game", {
  newGameClient: (port: number = 3000, ip: string = "127.0.0.1") => {
    const game = new GameClient(port, ip);
    return {
      on: (eventName: string, callback: (...args: any[]) => void) =>
        game.on(eventName, callback),
      emit: (
        eventName: string,
        params: any,
        callback: (...args: any[]) => void
      ) => game.emit(eventName, params, callback),
      stop: () => game.close(),
    };
  },
});

contextBridge.exposeInMainWorld("$win", {
  saveSeerjsFile: async (fileName: string, content: string) => {
    await saveSeerjsFile(fileName, content);
  },
  readSeerjsFile: async (fileName: string) => {
    return await readSeerjsFile(fileName);
  },
  readSeerjsFiles: async () => {
    return await readSeerjsFiles();
  },
  deleteSeerjsFile: async (fileName: string) => {
    await deleteSeerjsFile(fileName);
  },
  openNewWindow: (
    url: string,
    options: Electron.BrowserWindowConstructorOptions = {}
  ) => {
    const win = new SeerWindow(url, options);
    return win;
  },
  // 文件重命名
  renameSeerjsFile: async (oldName: string, newName: string) => {
    await renameSeerjsFile(oldName, newName);
  },

  // 运行脚本，待运行的脚本必须是一个独立的js文件，后缀为mjs
  runScript: (
    modulePath: string | URL,
    args?: readonly string[],
    options?: ForkOptions
  ) => {
    const child = fork(modulePath, args, options);
    /**
     * 返回一个对象，包含子进程的引用和子进程的结束方法
     */
    return {
      child,
      exit: ()=>kill(child.pid!),
      addListener: (eventName: string, callback: (...args: any[]) => void) =>
        child.on(eventName, callback),
    }
  },
});
