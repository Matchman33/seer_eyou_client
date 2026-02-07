import { BrowserWindow } from "electron";
import path from "path";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

/**
 * 窗口封装类（组合而非继承）
 *
 * 说明：
 * - BrowserWindow 只能在主进程创建
 * - preload/渲染进程里如果直接 import 一个 `class X extends BrowserWindow` 的模块，
 *   可能会因为 BrowserWindow 在该上下文为 undefined 而在模块初始化阶段直接报错
 * - 这里改为组合：内部持有 BrowserWindow 实例，对外暴露常用能力
 */
export class SeerWindow {
  private readonly win: BrowserWindow;

  /**
   * 创建一个新的窗口（只能在主进程调用）
   * @param url 窗口加载的url
   * @param options 窗口选项
   */

  constructor(
    url: string,
    options: Electron.BrowserWindowConstructorOptions = {},
  ) {
    this.win = new BrowserWindow({
      useContentSize: true,
      width: options.width || 960,
      height: options.height || 560,

      webPreferences: {
        // 给网页提供足够的权限
        plugins: true,
        // 开启开发者工具，方便调试
        devTools: true,
        webSecurity: false,
        // 禁用沙盒
        sandbox: false,
        // 开启上下文隔离，防止网页访问electron API
        contextIsolation: true,
        // 预加载脚本，用于与electron API交互
        // 预加载脚本路径使用编译好的js文件路径而不是开发环境中的ts文件路径
        preload: path.join(__dirname, "../preload.js"),
      },
      ...options,
    });

    if (url.startsWith("http")) {
      this.win.loadURL(url);
    } else {
      this.win.loadFile(url);
    }
  }

  /**
   * 获取底层 BrowserWindow（尽量少用，优先用封装方法）
   */
  get browserWindow() {
    return this.win;
  }

  /**
   * 透出 webContents，便于绑定快捷键、打开 devtools 等
   */
  get webContents() {
    return this.win.webContents;
  }

  /**
   * 代理事件监听（例如 'closed'、'will-resize'）
   */
  on(eventName: string, listener: (...args: any[]) => void) {
    this.win.on(eventName as any, listener as any);
    return this;
  }

  /**
   * 刷新当前窗口
   */
  reload() {
    this.win.reload();
  }

  /**
   * 关闭窗口
   */
  close() {
    this.win.close();
  }

  onClose(callback: (event: Electron.Event) => void) {
    this.win.on("close", (event) => {
      callback(event);
    });
  }

  /**
   * 在窗口加载完资源以后会调用此函数
   * @param callback 函数回调
   */
  onFinishLoad(callback: () => void) {
    this.win.webContents.on("did-finish-load", () => {
      callback();
    });
  }
}
