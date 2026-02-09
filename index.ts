import { app, BrowserWindow } from "electron";
import { SeerWindow } from "./src/utils/seerWindows";
import path from "path";
import { PluginManager } from "./src/plugins/pluginManager";
let seerWindow: SeerWindow | null = null;

// Electron 启动后初始化：加载插件、启用插件、应用插件菜单
const onReady = async () => {
  // 插件目录固定为运行目录下的 plugins（process.cwd()/plugins）
  const pluginManager = PluginManager.getInstance(path.join(process.cwd(), "plugins"));
  await pluginManager.loadAll();
  // 默认启用所有插件
  await pluginManager.enableAll();
  pluginManager.refreshMenu();

  // 默认加载运行目录下的 index.html，保证无需额外启动前端 dev server 也能运行
  seerWindow = new SeerWindow(path.join(process.cwd(), "index.html"), {
    width: 975,
    height: 640,
    // 网页的title会覆盖窗口标题
    title: "易游插件管理",
  });

  // 主窗口单独支持 F12/F5 调试快捷键
  seerWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F12") {
      seerWindow!.webContents.toggleDevTools();
      event.preventDefault();
    } else if (input.key === "F5") {
      seerWindow!.reload();
      event.preventDefault();
    }
  });

  // 监听改变窗口大小
  seerWindow.on("will-resize", (event, newBounds) => {
    console.log(newBounds);
  });
};

app.on("ready", onReady);

// 退出前做插件清理：关闭插件窗口、触发 onDisable/onUnload
app.on("before-quit", () => {
  void PluginManager.getInstance().shutdown();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    onReady();
  }
});
