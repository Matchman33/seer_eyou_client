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
      game.on("onRecvPacket", ({ packet }) => {});

      game.on("onSendPacket", ({ packet }) => {});
    },
    onDisable: async (ctx) => {
      ctx.log.info("onDisable");
    },
    onUnload: async (ctx) => {
      ctx.log.info("onUnload");
    },
  },

  commands: {
    openPage: (ctx) => {
      ctx.ui.openPage("home").then(({ windowId }) => {
        ctx.ui.toggleDevTools(windowId);
        // 监听窗口大小改变的事件
        ctx.ui.getWindow(windowId).on("will-resize", (event, newBounds) => {
          console.log(newBounds);
        });
      });
    },
  },

  ui: {
    pages: [
      {
        id: "home",
        title: "封包拦截器",
        entry: "http://localhost:5173/",
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
