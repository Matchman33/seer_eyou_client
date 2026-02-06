// 封包拦截器插件示例

module.exports = {
  name: 'packet-interceptor',
  version: '1.0.0',
  
  // 插件激活时调用
  activate(context) {
    console.log('[PacketInterceptor] 插件已激活');
    
    // 保存上下文
    this.context = context;
    this.packets = [];
    
    // 注册命令
    context.registerCommand('start', () => {
      console.log('[PacketInterceptor] 开始拦截封包');
      return { success: true, message: '封包拦截已启动' };
    });
    
    context.registerCommand('stop', () => {
      console.log('[PacketInterceptor] 停止拦截封包');
      return { success: true, message: '封包拦截已停止' };
    });
    
    context.registerCommand('getPackets', () => {
      return this.packets;
    });
    
    // 监听游戏事件（示例）
    context.on('game:packet:received', (packet) => {
      console.log('[PacketInterceptor] 收到封包:', packet);
      this.packets.push({
        type: 'received',
        data: packet,
        timestamp: Date.now()
      });
      
      // 限制存储数量
      if (this.packets.length > 100) {
        this.packets.shift();
      }
    });
    
    context.on('game:packet:sent', (packet) => {
      console.log('[PacketInterceptor] 发送封包:', packet);
      this.packets.push({
        type: 'sent',
        data: packet,
        timestamp: Date.now()
      });
      
      if (this.packets.length > 100) {
        this.packets.shift();
      }
    });
    
    // 注册UI面板
    context.registerPanel({
      id: 'packet-panel',
      title: '封包监控',
      icon: '📦'
    });
    
    console.log('[PacketInterceptor] 插件初始化完成');
  },
  
  // 插件停用时调用
  deactivate(context) {
    console.log('[PacketInterceptor] 插件已停用');
    this.packets = [];
  },
  
  // 插件提供的API
  api: {
    // 获取所有封包
    getAllPackets() {
      return this.packets || [];
    },
    
    // 清空封包记录
    clearPackets() {
      this.packets = [];
      console.log('[PacketInterceptor] 封包记录已清空');
    },
    
    // 拦截指定类型的封包
    interceptPacketType(packetType, callback) {
      console.log(`[PacketInterceptor] 开始拦截类型: ${packetType}`);
      // 这里可以添加具体的拦截逻辑
    },
    
    // 修改封包
    modifyPacket(packetId, newData) {
      console.log(`[PacketInterceptor] 修改封包: ${packetId}`);
      // 这里可以添加修改封包的逻辑
      return { success: true, packetId, newData };
    }
  }
};
