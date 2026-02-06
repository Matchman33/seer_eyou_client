"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeerWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
/**
 * 窗口类,通过传入一个url创建一个新的electron窗口
 */
class SeerWindow {
    /**
     * 窗口类,创建一个新的窗口
     * @param url 窗口加载的url
     * @param options 窗口选项
     */
    // 防止GC回收让窗口关闭
    mainWindow;
    win_url;
    win_height;
    win_width;
    constructor(url, options = {}) {
        // 默认窗口大小
        this.win_height = options.height || 560;
        this.win_width = options.width || 960;
        this.win_url = url;
        this.mainWindow = new electron_1.BrowserWindow({
            useContentSize: true,
            width: this.win_width,
            height: this.win_height,
            webPreferences: {
                // 给网页提供足够的权限
                plugins: true,
                // 开启开发者工具，方便调试
                devTools: true,
                webSecurity: true,
                // 禁用沙盒
                sandbox: false,
                // 开启上下文隔离，防止网页访问electron API
                contextIsolation: true,
                // 预加载脚本，用于与electron API交互
                // 预加载脚本路径使用编译好的js文件路径而不是开发环境中的ts文件路径
                preload: path_1.default.join(__dirname, '../preload.js')
            },
            ...options,
        });
        if (url.startsWith('http')) {
            this.mainWindow.loadURL(url);
        }
        else {
            this.mainWindow.loadFile(url);
        }
    }
    onClose(callback) {
        this.mainWindow.on('close', (event) => {
            callback(event);
        });
    }
    /**
     * 在窗口加载完资源以后会调用此函数
     * @param callback 函数回调
     */
    onFinishLoad(callback) {
        this.mainWindow.webContents.on('did-finish-load', () => {
            callback();
        });
    }
}
exports.SeerWindow = SeerWindow;
