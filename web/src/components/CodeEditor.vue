<template>
  <div class="code-editor-container">
    <div class="editor-toolbar">
      <button @click="runCode" class="btn-run">
        <span>▶️</span> 运行代码
      </button>
      <button @click="saveCode" class="btn-save">
        💾 保存
      </button>
      <button @click="clearConsole" class="btn-clear">
        🗑️ 清空控制台
      </button>
      <button @click="loadTemplate" class="btn-template">
        📄 加载模板
      </button>
    </div>

    <div class="editor-content">
      <div class="editor-main">
        <div ref="editorContainer" class="monaco-editor"></div>
      </div>

      <div class="console-panel">
        <div class="console-header">
          <span>📺 控制台输出</span>
          <span class="console-count">{{ consoleLogs.length }} 条日志</span>
        </div>
        <div class="console-content" ref="consoleContent">
          <div
            v-for="(log, index) in consoleLogs"
            :key="index"
            :class="['console-log', log.type]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
          <div v-if="consoleLogs.length === 0" class="empty-console">
            等待代码运行...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as monaco from 'monaco-editor';

interface ConsoleLog {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const editorContainer = ref<HTMLElement>();
const consoleContent = ref<HTMLElement>();
const consoleLogs = ref<ConsoleLog[]>([]);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const defaultCode = `// 📝 在这里编写你的JavaScript代码
// 可以使用 window.$game 和 window.$win API

console.log('Hello, 赛尔号插件开发！');

// 示例：连接游戏
// const gameClient = window.$game.newGameClient(3000, '127.0.0.1');
// gameClient.on('_onRecvCallback', (packet) => {
//   console.log('收到封包:', packet);
// });

// 示例：保存文件
// await window.$win.saveSeerjsFile('test.mjs', 'console.log("test")');

console.log('代码编辑器已就绪！');
`;

const pluginTemplate = `// 🔌 插件模板
// 将此代码保存为 .js 文件放入 plugins/插件名/ 目录

module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // 插件激活时调用
  activate(context) {
    console.log('[MyPlugin] 插件已激活');
    
    // 注册命令
    context.registerCommand('hello', () => {
      console.log('[MyPlugin] Hello World!');
      return { success: true, message: 'Hello!' };
    });
    
    // 监听游戏事件
    context.on('game:packet:received', (packet) => {
      console.log('[MyPlugin] 收到封包:', packet);
    });
    
    // 保存数据示例
    context.saveData('settings', { enabled: true });
  },
  
  // 插件停用时调用
  deactivate(context) {
    console.log('[MyPlugin] 插件已停用');
  },
  
  // 导出API供其他插件使用
  api: {
    sayHello() {
      return 'Hello from MyPlugin!';
    }
  }
};
`;

const addLog = (message: string, type: ConsoleLog['type'] = 'info') => {
  consoleLogs.value.push({
    time: new Date().toLocaleTimeString(),
    message,
    type
  });
  
  // 自动滚动到底部
  nextTick(() => {
    if (consoleContent.value) {
      consoleContent.value.scrollTop = consoleContent.value.scrollHeight;
    }
  });
  
  // 限制日志数量
  if (consoleLogs.value.length > 100) {
    consoleLogs.value.shift();
  }
};

const runCode = async () => {
  if (!editor) return;
  
  const code = editor.getValue();
  addLog('开始执行代码...', 'info');
  
  try {
    // 保存原始console方法
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // 拦截console输出
    console.log = (...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
      addLog(message, 'info');
      originalLog.apply(console, args);
    };
    
    console.error = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      addLog(message, 'error');
      originalError.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      addLog(message, 'warning');
      originalWarn.apply(console, args);
    };
    
    // 创建async函数以支持await
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const func = new AsyncFunction(code);
    
    // 执行代码
    await func();
    
    // 恢复console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    addLog('✅ 代码执行完成', 'success');
  } catch (error: any) {
    addLog(`❌ 错误: ${error.message}`, 'error');
    console.error('代码执行失败:', error);
  }
};

const saveCode = async () => {
  if (!editor) return;
  
  const code = editor.getValue();
  const fileName = `code-${Date.now()}.mjs`;
  
  try {
    await window.$win.saveSeerjsFile(fileName, code);
    addLog(`💾 代码已保存: ${fileName}`, 'success');
  } catch (error: any) {
    addLog(`保存失败: ${error.message}`, 'error');
  }
};

const clearConsole = () => {
  consoleLogs.value = [];
  addLog('控制台已清空', 'info');
};

const loadTemplate = () => {
  if (!editor) return;
  editor.setValue(pluginTemplate);
  addLog('已加载插件模板', 'success');
};

onMounted(() => {
  if (editorContainer.value) {
    // 创建Monaco编辑器
    editor = monaco.editor.create(editorContainer.value, {
      value: defaultCode,
      language: 'javascript',
      theme: 'vs-dark',
      fontSize: 14,
      minimap: { enabled: false },
      automaticLayout: true,
      tabSize: 2,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
    });
    
    addLog('代码编辑器已初始化', 'success');
    addLog('提示：可以使用 window.$game 和 window.$win API', 'info');
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.code-editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e1e;
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
}

.editor-toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-run {
  background: #16a34a;
  color: white;
}

.btn-run:hover {
  background: #15803d;
  transform: translateY(-1px);
}

.btn-save {
  background: #2563eb;
  color: white;
}

.btn-save:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-clear {
  background: #dc2626;
  color: white;
}

.btn-clear:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.btn-template {
  background: #7c3aed;
  color: white;
}

.btn-template:hover {
  background: #6d28d9;
  transform: translateY(-1px);
}

.editor-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  min-width: 0;
  position: relative;
}

.monaco-editor {
  width: 100%;
  height: 100%;
}

.console-panel {
  width: 450px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #3e3e42;
  background: #1e1e1e;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  color: #cccccc;
  font-weight: 600;
  font-size: 13px;
}

.console-count {
  font-size: 11px;
  opacity: 0.7;
}

.console-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #1e1e1e;
}

.console-log {
  padding: 6px 10px;
  margin-bottom: 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  display: flex;
  gap: 10px;
  word-break: break-all;
}

.console-log.info {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
}

.console-log.success {
  color: #4ade80;
  background: rgba(16, 185, 129, 0.1);
  border-left: 3px solid #10b981;
}

.console-log.error {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
  border-left: 3px solid #ef4444;
}

.console-log.warning {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
}

.log-time {
  opacity: 0.6;
  font-size: 11px;
  min-width: 80px;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  white-space: pre-wrap;
}

.empty-console {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-style: italic;
}

/* 滚动条样式 */
.console-content::-webkit-scrollbar {
  width: 10px;
}

.console-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.console-content::-webkit-scrollbar-thumb {
  background: #3e3e42;
  border-radius: 5px;
}

.console-content::-webkit-scrollbar-thumb:hover {
  background: #4e4e52;
}
</style>
