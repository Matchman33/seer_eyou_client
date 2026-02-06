<template>
  <div id="app">
    <header class="header">
      <h1>🚀 赛尔号易游插件管理器</h1>
      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'monitor' }]"
          @click="activeTab = 'monitor'"
        >
          📦 封包监控
        </button>
        <button
          :class="['tab', { active: activeTab === 'plugins' }]"
          @click="activeTab = 'plugins'"
        >
          🔌 插件管理
        </button>
        <button
          :class="['tab', { active: activeTab === 'editor' }]"
          @click="activeTab = 'editor'"
        >
          💻 代码编辑器
        </button>
      </div>
      <div class="status-bar">
        <span :class="['status-indicator', connectionStatus]">
          {{ connectionStatusText }}
        </span>
        <span class="login-status">
          {{ loginStatus }}
        </span>
      </div>
    </header>

    <main class="main-content" v-if="activeTab === 'monitor'">
      <div class="control-panel">
        <button @click="connectToGame" :disabled="isConnected" class="btn btn-primary">
          连接游戏
        </button>
        <button @click="disconnectFromGame" :disabled="!isConnected" class="btn btn-danger">
          断开连接
        </button>
        <button @click="clearLogs" class="btn btn-secondary">
          清空日志
        </button>
      </div>

      <div class="data-panels">
        <div class="panel">
          <h3>📥 接收的封包 ({{ receivedPackets.length }})</h3>
          <div class="packet-list">
            <div v-for="(packet, index) in receivedPackets" :key="'recv-' + index" class="packet-item received">
              <span class="packet-time">{{ packet.time }}</span>
              <span class="packet-data">{{ packet.data }}</span>
            </div>
            <div v-if="receivedPackets.length === 0" class="empty-state">
              暂无接收数据
            </div>
          </div>
        </div>

        <div class="panel">
          <h3>📤 发送的封包 ({{ sentPackets.length }})</h3>
          <div class="packet-list">
            <div v-for="(packet, index) in sentPackets" :key="'sent-' + index" class="packet-item sent">
              <span class="packet-time">{{ packet.time }}</span>
              <span class="packet-data">{{ packet.data }}</span>
            </div>
            <div v-if="sentPackets.length === 0" class="empty-state">
              暂无发送数据
            </div>
          </div>
        </div>
      </div>

      <div class="panel logs-panel">
        <h3>📝 系统日志</h3>
        <div class="log-list">
          <div v-for="(log, index) in logs" :key="'log-' + index" :class="['log-item', log.type]">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="empty-state">
            暂无日志
          </div>
        </div>
      </div>
    </main>

    <!-- 插件管理标签页 -->
    <PluginManager v-if="activeTab === 'plugins'" />
    
    <!-- 代码编辑器标签页 -->
    <CodeEditor v-if="activeTab === 'editor'" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PluginManager from './components/PluginManager.vue'
import CodeEditor from './components/CodeEditor.vue'

// 标签页状态
const activeTab = ref<'monitor' | 'plugins' | 'editor'>('monitor')

// 状态定义
const isConnected = ref(false)
const isLoggedIn = ref(false)
const receivedPackets = ref<Array<{ time: string; data: string }>>([])
const sentPackets = ref<Array<{ time: string; data: string }>>([])
const logs = ref<Array<{ time: string; message: string; type: string }>>([])
let gameClient: any = null

// 计算属性
const connectionStatus = computed(() => isConnected.value ? 'connected' : 'disconnected')
const connectionStatusText = computed(() => isConnected.value ? '✅ 已连接' : '⭕ 未连接')
const loginStatus = computed(() => isLoggedIn.value ? '👤 已登录' : '👤 未登录')

// 添加日志
const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
  const time = new Date().toLocaleTimeString()
  logs.value.unshift({ time, message, type })
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100)
  }
}

// 格式化时间
const getTime = () => new Date().toLocaleTimeString()

// 连接到游戏
const connectToGame = () => {
  if (!window.$game) {
    addLog('错误：未找到游戏客户端API', 'error')
    return
  }

  try {
    addLog('正在连接到游戏服务器...', 'info')
    gameClient = window.$game.newGameClient(3000, '127.0.0.1')

    // 监听登录回调
    gameClient.on('_onLoginCallback', (data: any) => {
      console.log('登录回调:', data)
      isLoggedIn.value = true
      addLog('用户已登录游戏', 'success')
    })

    // 监听接收封包
    gameClient.on('_onRecvCallback', (data: any) => {
      console.log('接收封包:', data)
      const packetData = JSON.stringify(data)
      receivedPackets.value.unshift({
        time: getTime(),
        data: packetData
      })
      if (receivedPackets.value.length > 50) {
        receivedPackets.value = receivedPackets.value.slice(0, 50)
      }
      addLog(`接收: ${packetData.substring(0, 50)}...`, 'info')
    })

    // 监听发送封包
    gameClient.on('_onSendCallback', (data: any) => {
      console.log('发送封包:', data)
      const packetData = JSON.stringify(data)
      sentPackets.value.unshift({
        time: getTime(),
        data: packetData
      })
      if (sentPackets.value.length > 50) {
        sentPackets.value = sentPackets.value.slice(0, 50)
      }
      addLog(`发送: ${packetData.substring(0, 50)}...`, 'info')
    })

    // 检查登录状态
    gameClient.emit('_is_login', {}, (res: any) => {
      console.log('登录状态检查:', res)
      if (res && res.isLogin) {
        isLoggedIn.value = true
        addLog('检测到用户已登录', 'success')
      }
    })

    isConnected.value = true
    addLog('成功连接到游戏服务器', 'success')
  } catch (error: any) {
    addLog(`连接失败: ${error.message}`, 'error')
    console.error('连接失败:', error)
  }
}

// 断开连接
const disconnectFromGame = () => {
  if (gameClient) {
    try {
      gameClient.stop()
      gameClient = null
      isConnected.value = false
      isLoggedIn.value = false
      addLog('已断开游戏连接', 'warning')
    } catch (error: any) {
      addLog(`断开连接失败: ${error.message}`, 'error')
    }
  }
}

// 清空日志
const clearLogs = () => {
  receivedPackets.value = []
  sentPackets.value = []
  logs.value = []
  addLog('日志已清空', 'info')
}

// 组件挂载
onMounted(() => {
  addLog('应用已启动', 'success')
  addLog('等待连接到游戏...', 'info')
  
  // 检查API是否可用
  if (!window.$game) {
    addLog('警告：游戏API未准备就绪，请确保在Electron环境中运行', 'warning')
  }
})

// 组件卸载
onUnmounted(() => {
  if (gameClient) {
    gameClient.stop()
  }
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.header {
  background: rgba(0, 0, 0, 0.2);
  padding: 20px;
  backdrop-filter: blur(10px);
}

.header h1 {
  margin: 0 0 15px 0;
  font-size: 28px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.tab {
  padding: 8px 20px;
  border: none;
  border-radius: 8px 8px 0 0;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.tab.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-bottom-color: #10b981;
}

.status-bar {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.status-indicator {
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.status-indicator.connected {
  background: rgba(16, 185, 129, 0.3);
  border: 1px solid #10b981;
}

.status-indicator.disconnected {
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid #ef4444;
}

.login-status {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.main-content {
  padding: 20px;
}

.control-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.data-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.panel h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
}

.packet-list,
.log-list {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px;
}

.packet-item,
.log-item {
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  word-break: break-all;
}

.packet-item.received {
  background: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
}

.packet-item.sent {
  background: rgba(236, 72, 153, 0.2);
  border-left: 3px solid #ec4899;
}

.log-item.info {
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
}

.log-item.success {
  background: rgba(16, 185, 129, 0.1);
  border-left: 3px solid #10b981;
}

.log-item.error {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
}

.log-item.warning {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
}

.packet-time,
.log-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  min-width: 80px;
}

.packet-data,
.log-message {
  flex: 1;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.4);
  font-style: italic;
}

.logs-panel {
  grid-column: 1 / -1;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
