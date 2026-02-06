"use strict";
/**
 * 实现文件读写
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSeerjsFiles = readSeerjsFiles;
exports.readSeerjsFile = readSeerjsFile;
exports.saveSeerjsFile = saveSeerjsFile;
exports.deleteSeerjsFile = deleteSeerjsFile;
exports.renameSeerjsFile = renameSeerjsFile;
exports.runSeerjsFile = runSeerjsFile;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const process_1 = require("process");
// 默认目录为当前运行目录+seer_magic
const defaultPath = path_1.default.join(process.cwd(), "seer_magic");
/**
 * 读入seer_data目录下的所有后缀为mjs的文件
 * @param readPath
 * @returns 文件名列表
 */
function readSeerjsFiles(readPath = defaultPath) {
    const files = promises_1.default
        .readdir(readPath, {
        withFileTypes: true,
    })
        .then((files) => files
        .filter((file) => file.name.endsWith(".mjs"))
        .map((file) => file.name));
    return files;
}
// 通过文件名读取文件内容
async function readSeerjsFile(fileName) {
    const filePath = path_1.default.join(defaultPath, fileName + ".mjs");
    // Read the file content
    const content = await promises_1.default.readFile(filePath, "utf-8");
    return content;
}
/**
 * 保存魔法脚本到seer_magic目录下
 * @param fileName 文件名
 * @param content  文件内容
 * @param readPath 读取目录，默认当前运行目录+seer_magic
 */
async function saveSeerjsFile(fileName, content) {
    try {
        await promises_1.default.access(defaultPath, fs_1.constants.F_OK);
    }
    catch (err) {
        await promises_1.default.mkdir(defaultPath, { recursive: true });
    }
    const filePath = path_1.default.join(defaultPath, fileName + ".mjs");
    return promises_1.default.writeFile(filePath, content);
}
/**
 * 删除seer_magic目录下的文件
 * @param fileName 文件名
 */
function deleteSeerjsFile(fileName) {
    const filePath = path_1.default.join(defaultPath, fileName + ".mjs");
    return promises_1.default.unlink(filePath);
}
/**
 * 重命名seer_magic目录下的文件
 * @param oldName 旧文件名
 * @param newName 新文件名
 */
function renameSeerjsFile(oldName, newName) {
    const oldFilePath = path_1.default.join(defaultPath, oldName + ".mjs");
    const newFilePath = path_1.default.join(defaultPath, newName + ".mjs");
    return promises_1.default.rename(oldFilePath, newFilePath);
}
/**
 * 运行seer_magic目录下的文件
 * @param fileName 文件名
 * @param args 传递给子进程的参数
 * @param options 子进程选项
 * @returns
 */
function runSeerjsFile(fileName, args, options) {
    const child = (0, child_process_1.fork)(path_1.default.join(defaultPath, fileName + ".mjs"), args, options);
    /**
     * 返回一个对象，包含子进程的引用和子进程的结束方法
     */
    return {
        child,
        exit: () => (0, process_1.kill)(child.pid),
        addListener: (eventName, callback) => child.on(eventName, callback),
    };
}
