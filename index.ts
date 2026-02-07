import { app, BrowserWindow, Menu } from "electron";
import { SeerWindow } from "./src/utils/seerWindows";
let seerWindow: SeerWindow | null = null;

const onReady = () => {
  // 隐藏默认菜单栏
  Menu.setApplicationMenu(null);
  // 这是进行测试时候开启的本地端口，是一个vue项目的端口
  seerWindow = new SeerWindow("http://127.0.0.1:5500/index.html", {
    width: 975,
    height: 640,
    // 网页的title会覆盖窗口标题
    title: "易游插件管理",
  });

  // 监听 F12 按键打开开发者工具
  // 正式发布应该禁用这个功能
  seerWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown") {
      if (input.key === "F12") {
        seerWindow!.webContents.toggleDevTools(); // 打开/关闭开发者工具
      } else if (input.key === "F5") {
        seerWindow!.reload(); // 刷新页面
      }
    }
  });

  // 监听改变窗口大小
  seerWindow.on("will-resize", (event, newBounds) => {
    console.log(newBounds);
  });
};

app.on("ready", onReady);

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
