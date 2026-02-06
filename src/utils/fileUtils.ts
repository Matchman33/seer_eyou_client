/**
 * 实现文件读写
 */

import path from "path";
import fs from "fs/promises";
import { constants } from "fs";
import { fork, ForkOptions } from "child_process";
import { kill } from "process";

// 默认目录为当前运行目录+seer_magic
const defaultPath = path.join(process.cwd(), "seer_magic");

/**
 * 读入seer_data目录下的所有后缀为mjs的文件
 * @param readPath
 * @returns 文件名列表
 */
export function readSeerjsFiles(readPath: string = defaultPath) {
  const files = fs
    .readdir(readPath, {
      withFileTypes: true,
    })
    .then((files) =>
      files
        .filter((file) => file.name.endsWith(".mjs"))
        .map((file) => file.name),
    );
  return files;
}

// 通过文件名读取文件内容
export async function readSeerjsFile(fileName: string): Promise<string> {
  const filePath = path.join(defaultPath, fileName + ".mjs");

  // Read the file content
  const content = await fs.readFile(filePath, "utf-8");

  return content;
}

/**
 * 保存魔法脚本到seer_magic目录下
 * @param fileName 文件名
 * @param content  文件内容
 * @param readPath 读取目录，默认当前运行目录+seer_magic
 */
export async function saveSeerjsFile(fileName: string, content: string) {
  try {
    await fs.access(defaultPath, constants.F_OK);
  } catch (err) {
    await fs.mkdir(defaultPath, { recursive: true });
  }
  const filePath = path.join(defaultPath, fileName + ".mjs");
  return fs.writeFile(filePath, content);
}

/**
 * 删除seer_magic目录下的文件
 * @param fileName 文件名
 */
export function deleteSeerjsFile(fileName: string) {
  const filePath = path.join(defaultPath, fileName + ".mjs");
  return fs.unlink(filePath);
}

/**
 * 重命名seer_magic目录下的文件
 * @param oldName 旧文件名
 * @param newName 新文件名
 */
export function renameSeerjsFile(oldName: string, newName: string) {
  const oldFilePath = path.join(defaultPath, oldName + ".mjs");
  const newFilePath = path.join(defaultPath, newName + ".mjs");
  return fs.rename(oldFilePath, newFilePath);
}

/**
 * 运行seer_magic目录下的文件
 * @param fileName 文件名
 * @param args 传递给子进程的参数
 * @param options 子进程选项
 * @returns
 */
export function runSeerjsFile(
  fileName: string,
  args?: readonly string[],
  options?: ForkOptions,
) {
  const child = fork(path.join(defaultPath, fileName + ".mjs"), args, options);
  /**
   * 返回一个对象，包含子进程的引用和子进程的结束方法
   */
  return {
    child,
    exit: () => kill(child.pid!),
    addListener: (eventName: string, callback: (...args: any[]) => void) =>
      child.on(eventName, callback),
  };
}
