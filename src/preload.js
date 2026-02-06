"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ipcClient_1 = require("./utils/ipcClient");
const seerWindows_1 = require("./utils/seerWindows");
const fileUtils_1 = require("./utils/fileUtils");
console.log("preload.ts loaded");
/**
 * 暴露插件接口
 */
electron_1.contextBridge.exposeInMainWorld("$game", {
    newGameClient: (port = 3000, ip = "127.0.0.1") => {
        const game = new ipcClient_1.GameClient(port, ip);
        return {
            on: (eventName, callback) => game.on(eventName, callback),
            emit: (eventName, params, callback) => game.emit(eventName, params, callback),
            stop: () => game.close(),
        };
    },
});
/**
 * 暴露windows接口
 * 此接口只能让前端用来保存和读取魔法文件，魔法脚本不应该访问此接口
 */
electron_1.contextBridge.exposeInMainWorld("$win", {
    saveSeerjsFile: fileUtils_1.saveSeerjsFile,
    readSeerjsFile: fileUtils_1.readSeerjsFile,
    readSeerjsFiles: fileUtils_1.readSeerjsFiles,
    deleteSeerjsFile: fileUtils_1.deleteSeerjsFile,
    renameSeerjsFile: fileUtils_1.renameSeerjsFile,
    openNewWindow: (url, options = {}) => {
        const win = new seerWindows_1.SeerWindow(url, options);
        return win;
    },
    // 运行脚本，待运行的脚本必须是一个独立的js文件，后缀为mjs
    runScript: fileUtils_1.runSeerjsFile,
});
