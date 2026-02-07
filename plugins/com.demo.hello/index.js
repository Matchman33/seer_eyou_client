module.exports = {
  meta: {
    id: "com.demo.hello",
    name: "示例插件",
    version: "1.0.0",
    description: "用于验证 plugins 标准的可运行示例",
    author: "demo",
  },

  shortcuts: [
    {
      id: "toggleDevToolsGlobal",
      key: "F9",
      command: "window.toggleDevTools",
    },
    {
      id: "storageCountGlobal",
      key: "F10",
      command: "testStorage",
    },
  ],

  lifecycle: {
    onLoad: async (ctx) => {
      ctx.log.info("onLoad");
    },
    onEnable: async (ctx) => {
      const game = ctx.game.getGameClientInstance();
      // 监听发包事件
      game.on("_onLoginCallback", (params) => {
        ctx.log.info("_onRecvCallback", params);
      });
      ctx.log.info("onEnable", {
        isDev: ctx.host.isDev,
        pluginId: ctx.plugin.id,
        pluginDir: ctx.plugin.dir,
      });
    },
    onDisable: async (ctx) => {
      ctx.log.info("onDisable");
    },
    onUnload: async (ctx) => {
      ctx.log.info("onUnload");
    },
  },

  commands: {
    ping: async (ctx, payload) => {
      ctx.log.info("ping", payload);
    },
    open: async (ctx) => {
      return ctx.ui.openPage("home");
    },
    "window.reload": async (ctx, payload) => {
      if (!payload?.windowId) return;
      ctx.ui.reload(payload.windowId);
    },
    "window.toggleDevTools": async (ctx, payload) => {
      if (!payload?.windowId) return;
      ctx.ui.toggleDevTools(payload.windowId);
    },
    closeSelfWindow: async (ctx, payload) => {
      if (!payload?.windowId) return;
      await ctx.ui.closeWindow(payload.windowId);
    },
    simplifyMenu: async (ctx, payload) => {
      if (!payload?.windowId) return;
      ctx.ui.setMenu(payload.windowId, [
        {
          id: "only",
          label: "仅此一项",
          command: "ping",
        },
      ]);
    },
    openCustom: async (ctx) => {
      const { windowId } = await ctx.ui.openPage("openCustom");
      ctx.log.info("opened custom window", windowId);
    },
    testStorage: async (ctx) => {
      const current = (await ctx.storage.get("openCount")) ?? 0;
      const next = current + 1;
      await ctx.storage.set("openCount", next);
      ctx.log.info("storage openCount", next);
    },
    testGameClient: async (ctx) => {
      const game = ctx.game.getGameClientInstance();
      game.emit("_is_login", {}, (res) => {
        ctx.log.info("testGameClient _is_login result", res);
      });
    },
    refreshPluginMenu: async (ctx) => {
      ctx.menu.refresh();
    },
  },

  ui: {
    pages: [
      {
        id: "home",
        title: "Hello 插件页面",
        entry: "ui/index.html",
        window: { width: 860, height: 520, resizable: true },
        menu: [
          {
            id: "view",
            label: "子菜单",
            submenu: [
              { id: "reload", label: "刷新", command: "window.reload" },
              {
                id: "ping",
                label: "Ping",
                command: "ping",
                payload: { at: Date.now() },
              },

              {
                id: "devtools",
                label: "切换开发者工具",
                command: "window.toggleDevTools",
                accelerator: "F12",
              },
              {
                id: "simplifyMenu",
                label: "简化菜单",
                command: "simplifyMenu",
              },
              {
                id: "close",
                label: "关闭窗口",
                command: "closeSelfWindow",
              },
            ],
          },
        ],
      },
      {
        id: "openCustom",
        title: "openCustom openCustom",
        entry: "https://www.baidu.com",
        menu: [
          {
            id: "view",
            label: "视图",
            submenu: [
              { id: "reload", label: "刷新", command: "window.reload" },
              {
                id: "devtools",
                label: "切换开发者工具",
                command: "window.toggleDevTools",
                accelerator: "F12",
              },
              {
                id: "simplifyMenu",
                label: "简化菜单",
                command: "simplifyMenu",
              },
              {
                id: "close",
                label: "关闭窗口",
                command: "closeSelfWindow",
              },
            ],
          },
        ],
      },
    ],
  },

  menu: [
    {
      id: "root",
      label: "Hello 插件",
      submenu: [
        { id: "open", label: "打开页面", command: "open" },
        {
          id: "Custom",
          label: "打开百度(自定义菜单)",
          command: "openCustom",
        },
        {
          id: "storage",
          label: "测试存储",
          command: "testStorage",
        },
        {
          id: "game",
          label: "测试 GameClient",
          command: "testGameClient",
        },
        {
          id: "refreshMenu",
          label: "刷新插件菜单",
          command: "refreshPluginMenu",
        },
      ],
    },
  ],
};
