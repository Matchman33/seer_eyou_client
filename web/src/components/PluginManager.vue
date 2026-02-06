<template>
  <div class="plugin-manager">
    <div class="manager-header">
      <h2>🔌 插件管理</h2>
      <button @click="refreshPlugins" class="btn-refresh">
        🔄 刷新
      </button>
    </div>

    <div class="plugin-list">
      <div v-if="loading" class="loading-state">
        加载中...
      </div>

      <div v-else-if="plugins.length === 0" class="empty-state">
        <p>📦 暂无已安装插件</p>
        <p class="hint">将插件放入 plugins/ 目录后重启应用</p>
      </div>

      <div v-else class="plugins-grid">
        <div
          v-for="plugin in plugins"
          :key="plugin.id"
          class="plugin-card"
        >
          <div class="plugin-icon">{{ plugin.icon || '🔌' }}</div>
          <div class="plugin-info">
            <h3>{{ plugin.name }}</h3>
            <p class="plugin-author">by {{ plugin.author }}</p>
            <p class="plugin-description">{{ plugin.description }}</p>
            <div class="plugin-meta">
              <span class="version">v{{ plugin.version }}</span>
              <span :class="['status', plugin.enabled ? 'enabled' : 'disabled']">
                {{ plugin.enabled ? '✅ 已启用' : '⭕ 已禁用' }}
              </span>
            </div>
          </div>
          <div class="plugin-actions">
            <button
              v-if="!plugin.enabled"
              @click="enablePlugin(plugin.id)"
              class="btn-enable"
            >
              启用
            </button>
            <button
              v-else
              @click="disablePlugin(plugin.id)"
              class="btn-disable"
            >
              禁用
            </button>
            <button
              @click="testPlugin(plugin.id)"
              class="btn-test"
              :disabled="!plugin.enabled"
            >
              测试
            </button>
            <button
              @click="uninstallPlugin(plugin.id)"
              class="btn-uninstall"
            >
              卸载
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="console-output">
      <div class="console-header">
        <span>📝 操作日志</span>
        <button @click="clearLogs" class="btn-clear-logs">清空</button>
      </div>
      <div class="console-content">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-entry', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  author: string;
  description: string;
  icon?: string;
}

interface Log {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const plugins = ref<Plugin[]>([]);
const loading = ref(true);
const logs = ref<Log[]>([]);

const addLog = (message: string, type: Log['type'] = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    message,
    type
  });
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50);
  }
};

const refreshPlugins = async () => {
  try {
    loading.value = true;
    addLog('正在刷新插件列表...', 'info');
    
    if (!window.$plugin) {
      addLog('错误：插件API未准备就绪', 'error');
      return;
    }

    plugins.value = await window.$plugin.getAllPlugins();
    addLog(`成功加载 ${plugins.value.length} 个插件`, 'success');
  } catch (error: any) {
    addLog(`刷新失败: ${error.message}`, 'error');
    console.error('刷新插件列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const enablePlugin = async (pluginId: string) => {
  try {
    addLog(`正在启用插件: ${pluginId}`, 'info');
    await window.$plugin.enablePlugin(pluginId);
    await refreshPlugins();
    addLog(`插件已启用: ${pluginId}`, 'success');
  } catch (error: any) {
    addLog(`启用失败: ${error.message}`, 'error');
  }
};

const disablePlugin = async (pluginId: string) => {
  try {
    addLog(`正在禁用插件: ${pluginId}`, 'info');
    await window.$plugin.disablePlugin(pluginId);
    await refreshPlugins();
    addLog(`插件已禁用: ${pluginId}`, 'success');
  } catch (error: any) {
    addLog(`禁用失败: ${error.message}`, 'error');
  }
};

const testPlugin = async (pluginId: string) => {
  try {
    addLog(`测试插件: ${pluginId}`, 'info');
    
    // 执行测试命令
    const result = await window.$plugin.executeCommand(`${pluginId}.start`);
    addLog(`测试结果: ${JSON.stringify(result)}`, 'success');
    
    // 获取插件API
    const api = window.$plugin.getPluginAPI(pluginId);
    addLog(`插件API: ${Object.keys(api || {}).join(', ')}`, 'info');
  } catch (error: any) {
    addLog(`测试失败: ${error.message}`, 'error');
  }
};

const uninstallPlugin = async (pluginId: string) => {
  if (!confirm(`确定要卸载插件 ${pluginId} 吗？`)) {
    return;
  }

  try {
    addLog(`正在卸载插件: ${pluginId}`, 'warning');
    await window.$plugin.uninstallPlugin(pluginId);
    await refreshPlugins();
    addLog(`插件已卸载: ${pluginId}`, 'success');
  } catch (error: any) {
    addLog(`卸载失败: ${error.message}`, 'error');
  }
};

const clearLogs = () => {
  logs.value = [];
};

onMounted(() => {
  addLog('插件管理器已启动', 'success');
  refreshPlugins();
});
</script>

<style scoped>
.plugin-manager {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.manager-header h2 {
  margin: 0;
  font-size: 24px;
}

.btn-refresh {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.plugin-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.empty-state .hint {
  margin-top: 10px;
  font-size: 14px;
  opacity: 0.7;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.plugin-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.plugin-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.plugin-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 15px;
}

.plugin-info h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
}

.plugin-author {
  margin: 0 0 10px 0;
  font-size: 12px;
  opacity: 0.7;
}

.plugin-description {
  margin: 0 0 15px 0;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-meta {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  font-size: 12px;
}

.version {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
}

.status.enabled {
  background: rgba(16, 185, 129, 0.3);
  border: 1px solid #10b981;
}

.status.disabled {
  background: rgba(239, 68, 68, 0.3);
  border: 1px solid #ef4444;
}

.plugin-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.plugin-actions button {
  flex: 1;
  min-width: 60px;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.btn-enable {
  background: #10b981;
  color: white;
}

.btn-enable:hover {
  background: #059669;
}

.btn-disable {
  background: #f59e0b;
  color: white;
}

.btn-disable:hover {
  background: #d97706;
}

.btn-test {
  background: #3b82f6;
  color: white;
}

.btn-test:hover:not(:disabled) {
  background: #2563eb;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-uninstall {
  background: #ef4444;
  color: white;
}

.btn-uninstall:hover {
  background: #dc2626;
}

.console-output {
  height: 200px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-clear-logs {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.console-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.log-entry {
  padding: 4px 0;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-entry.info {
  color: #93c5fd;
}

.log-entry.success {
  color: #4ade80;
}

.log-entry.error {
  color: #f87171;
}

.log-entry.warning {
  color: #fbbf24;
}

.log-time {
  opacity: 0.6;
  margin-right: 8px;
}

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
