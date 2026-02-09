import { contextBridge } from "electron";
import {
  saveSeerjsFile,
  readSeerjsFile,
  readSeerjsFiles,
  deleteSeerjsFile,
  renameSeerjsFile,
  runSeerjsFile,
} from "./utils/fileUtils";
import { GameClient } from "seer_eyou_js";
import { Packet } from "./plugins/types";

console.log("preload.ts loaded");

// 单例实例，每个页面独立
let game: GameClient | null = null;

/**
 * 暴露插件接口
 */
contextBridge.exposeInMainWorld("$game", {
  getGameClientInstance: (port: number = 3000, ip: string = "127.0.0.1") => {
    if (!game) {
      game = new GameClient(port, ip);
    }
    return {
      on: (eventName: string, callback: (...args: any[]) => any) =>
        game!.on(eventName, callback),
      emit: (
        eventName: string,
        params: any,
        callback: (...args: any[]) => any,
      ) => game!.emit(eventName, params, callback),
      stop: () => {
        game?.close();
        game = null;
      },
    };
  },

  unpackPacket: (packet: string): Packet => {
    const length = parseInt(packet.substring(0, 8), 16);
    const version = parseInt(packet.substring(8, 10), 16);
    const cmd = parseInt(packet.substring(10, 18), 16);
    const account = parseInt(packet.substring(18, 26), 16);
    const checknum = parseInt(packet.substring(26, 34), 16);
    const data = packet.substring(34, packet.length);
    return {
      length,
      version,
      cmd,
      account,
      checknum,
      data,
    };
  },

  /**
   * 将封包对象转换为十六进制字符串
   * @param {Packet} packet 封包对象
   * @returns {string} 封包的十六进制字符串表示
   */
  packPacket: (packet: Packet): string => {
    const { length, version, cmd, account, checknum, data } = packet;
    return `${length.toString(16).padStart(8, "0")}${version.toString(16).padStart(2, "0")}${cmd.toString(16).padStart(8, "0")}${account.toString(16).padStart(8, "0")}${checknum.toString(16).padStart(8, "0")}${data}`.toUpperCase();
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
  // 运行脚本，待运行的脚本必须是一个独立的js文件，后缀为mjs
  runScript: runSeerjsFile,
});
