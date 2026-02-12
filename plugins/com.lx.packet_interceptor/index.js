
module.exports = {
  meta: {
    id: "com.lx.packet_interceptor",
    name: "内置封包拦截器",
    version: "1.0.0",
    description: "内置的封包拦截器插件，用于拦截最底层的封包",
    author: "lx",
  },

  lifecycle: {
    onLoad: async (ctx) => {
      ctx.log.info("内置封包拦截器已加载");
    },
    onEnable: async (ctx) => {
      const game = ctx.game.getGameClientInstance();
      // 监听发包事件
      game.on("onRecvPacket", ({ packet }) => {
        ctx.log.info("收到封包:", packet);
      });

      game.on("onSendPacket", ({ packet }) => {
        ctx.log.info("发送封包:", packet);
      });
    },
    onDisable: async (ctx) => {
      ctx.log.info("onDisable");
    },
    onUnload: async (ctx) => {
      ctx.log.info("onUnload");
    },
  },

  shortcuts: [
    {
      id: "toggleDevToolsGlobal",
      key: "F12",
      command: "window.toggleDevTools",
    },
  ],

  commands: {
    openPage: (ctx) => {
      ctx.ui.openPage("home").then(({ windowId }) => {
        // 监听窗口大小改变的事件
        ctx.ui.getWindow(windowId).on("will-resize", (event, newBounds) => {
          console.log("修改封包拦截窗口大小", newBounds);
        });
      });
    },
    toggleDevTools: (ctx) => {
      ctx.ui.toggleDevTools(windowId);
    },
  },

  ui: {
    pages: [
      {
        id: "home",
        title: "封包拦截器",
        entry: "ui/index.html",
        window: { width: 1289, height: 770, resizable: true },
      },
    ],
  },
  menu: [
    {
      id: "root",
      label: "封包拦截器",
      command: "openPage",
    },
  ],
};
