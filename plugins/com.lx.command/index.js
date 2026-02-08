module.exports = {
  meta: {
    id: "com.lx.command",
    name: "内置命令封装",
    version: "1.0.0",
    description: "内置的命令封装插件，用于封装最底层的命令",
    author: "lx",
  },

  lifecycle: {
    onLoad: async (ctx) => {
      ctx.log.info("内置命令封装已加载");
    },
    onEnable: async (ctx) => {
      const game = ctx.game.getGameClientInstance();
      // 监听发包事件
      game.on("_onRecvCallback", ({ packet }) => {
        game.emit("onRecvPacket", ctx.game.unpackPacket(packet));
      });

      game.on("_onSendCallback", ({ packet }) => {
        game.emit("onSendPacket", ctx.game.unpackPacket(packet));
      });

      game.on("sendPacket", (params) => {
        game.emit("_send_packet", { packet: ctx.game.packPacket(params) });
      });
    },
    onDisable: async (ctx) => {
      ctx.log.info("onDisable");
    },
    onUnload: async (ctx) => {
      ctx.log.info("onUnload");
    },
  },
};
