/**
 * 实现文件读写
 */

import path from "path";
import fs from "fs/promises";
import { constants } from "fs";

// 默认目录为当前运行目录+seer_magic
const defaultPath = path.join(process.cwd(), "seer_magic");

/**
 * 读入seer_data目录下的所有后缀为seerjs的文件
 * @param readPath
 * @returns 文件名列表
 */
export async function readSeerjsFiles(readPath: string = defaultPath) {
  const files = await fs.readdir(readPath, {
    withFileTypes: true,
  });
  return files.filter((file) => file.name.endsWith(".mjs"));
}

// 通过文件名读取文件内容
export async function readSeerjsFile(
  fileName: string,
  readPath: string = defaultPath
): Promise<string> {
  const filePath = path.join(readPath, fileName);

  // Read the file content
  const content = await fs.readFile(filePath, "utf-8");

  return content;
}

// 保存文件
export async function saveSeerjsFile(
  fileName: string,
  content: string,
  readPath: string = defaultPath
) {
  try {
    await fs.access(readPath, constants.F_OK);
  } catch (err) {
    await fs.mkdir(readPath, { recursive: true });
  }
  const filePath = path.join(readPath, fileName);
  await fs.writeFile(filePath, content);
}

// 删除文件
export async function deleteSeerjsFile(
  fileName: string,
  readPath: string = defaultPath
) {
  const filePath = path.join(readPath, fileName);
  await fs.unlink(filePath);
}

// 重命名文件
export async function renameSeerjsFile(
  oldName: string,
  newName: string,
  readPath: string = defaultPath
) {
  const oldFilePath = path.join(readPath, oldName);
  const newFilePath = path.join(readPath, newName);
  await fs.rename(oldFilePath, newFilePath);
}
