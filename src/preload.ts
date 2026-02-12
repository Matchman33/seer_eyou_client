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
import path from "path";
import fs from "fs/promises";
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
const parsePluginArgs = () => {
  const meta: Record<string, string> = {};

  for (const arg of process.argv) {
    if (arg.startsWith("--plugin")) {
      const [key, value] = arg.substring(2).split("=");
      const metaKey = key.replace("plugin", "").toLowerCase();
      meta[metaKey] = value;
    }
  }

  return meta;
};
const pluginMeta = parsePluginArgs();
const storagePath = path.join(
  pluginMeta.dir,
  ".storage",
  `${pluginMeta.id}.json`,
);
console.log("preload.ts loaded", storagePath);

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
      off: (eventName: string) => game!.off(eventName),
      stop: () => {
        game?.close();
        game = null;
      },
    };
  },
  pluginMeta,

  storage: {
    get: async (key: string) => {
      const data = await readStorage();
      return data[key];
    },
    set: async (key: string, value: any) => {
      const data = await readStorage();
      data[key] = value;
      await writeStorage(data);
    },
  },

  unpackPacket: (packet: string): Packet => {
    const length = parseInt(packet.substring(0, 8), 16);
    const version = parseInt(packet.substring(8, 10), 16);
    const cmd = parseInt(packet.substring(10, 18), 16);
    const account = parseInt(packet.substring(18, 26), 16);
    const checksum = parseInt(packet.substring(26, 34), 16);
    const data = packet.substring(34, packet.length);
    return {
      length,
      version,
      cmd,
      account,
      checksum,
      data,
    };
  },

  /**
   * 将封包对象转换为十六进制字符串
   * @param {Packet} packet 封包对象
   * @returns {string} 封包的十六进制字符串表示
   */
  packPacket: (packet: Packet): string => {
    const { length, version, cmd, account, checksum, data } = packet;
    return `${length.toString(16).padStart(8, "0")}${version.toString(16).padStart(2, "0")}${cmd.toString(16).padStart(8, "0")}${account.toString(16).padStart(8, "0")}${checksum.toString(16).padStart(8, "0")}${data}`.toUpperCase();
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
