import { BrowserWindow } from "electron";
import path from "path";
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

/**
 * 窗口类,通过传入一个url创建一个新的electron窗口
 */
export class SeerWindow extends BrowserWindow {
  /**
   * 窗口类,创建一个新的窗口
   * @param url 窗口加载的url
   * @param options 窗口选项
   */

  constructor(
    url: string,
    options: Electron.BrowserWindowConstructorOptions = {},
  ) {
    super({
      useContentSize: true,
      width: options.width || 960,
      height: options.height || 560,

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
        preload: path.join(__dirname, "../preload.js"),
      },
      ...options,
    });

    if (url.startsWith("http")) {
      this.loadURL(url);
    } else {
      this.loadFile(url);
    }
  }

  onClose(callback: (event: Electron.Event) => void) {
    this.on("close", (event) => {
      callback(event);
    });
  }

  /**
   * 在窗口加载完资源以后会调用此函数
   * @param callback 函数回调
   */
  onFinishLoad(callback: () => void) {
    this.webContents.on("did-finish-load", () => {
      callback();
    });
  }
}
