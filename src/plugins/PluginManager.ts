import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// 插件接口定义
export interface PluginMetadata {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description: string;
  main: string;
  icon?: string;
  ui?: {
    hasPanel: boolean;
    panelComponent?: string;
    menuIcon?: string;
    menuLabel?: string;
  };
  permissions: string[];
  dependencies?: Record<string, string>;
  repository?: string;
  homepage?: string;
  keywords?: string[];
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  metadata: PluginMetadata;
  instance: any;
  context: PluginContext;
  enabled: boolean;
  path: string;
}

// 插件上下文类
export class PluginContext extends EventEmitter {
  private plugin: Plugin;
  private commands: Map<string, Function> = new Map();
  private panels: any[] = [];
  private disposables: Function[] = [];

  constructor(plugin: Plugin) {
    super();
    this.plugin = plugin;
  }

  // 注册命令
  registerCommand(name: string, handler: Function): void {
    const fullName = `${this.plugin.id}.${name}`;
    this.commands.set(fullName, handler);
    console.log(`[Plugin] 注册命令: ${fullName}`);
    
    // 添加到可清理列表
    this.disposables.push(() => {
      this.commands.delete(fullName);
    });
  }

  // 执行命令
  executeCommand(name: string, ...args: any[]): any {
    const command = this.commands.get(name);
    if (command) {
      return command(...args);
    }
    throw new Error(`命令不存在: ${name}`);
  }

  // 注册UI面板
  registerPanel(config: any): void {
    this.panels.push({
      ...config,
      pluginId: this.plugin.id
    });
    console.log(`[Plugin] 注册面板: ${config.id}`);
    
    // 通知主进程更新UI
    this.emit('panel:registered', config);
  }

  // 获取面板列表
  getPanels(): any[] {
    return this.panels;
  }

  // 获取配置
  getConfig(key: string): any {
    return (this.plugin.metadata as any)[key];
  }

  // 保存数据
  async saveData(key: string, value: any): Promise<void> {
    const dataPath = path.join(process.cwd(), 'plugin-data', this.plugin.id);
    await fs.promises.mkdir(dataPath, { recursive: true });
    await fs.promises.writeFile(
      path.join(dataPath, `${key}.json`),
      JSON.stringify(value, null, 2)
    );
    console.log(`[Plugin] 保存数据: ${this.plugin.id}/${key}`);
  }

  // 读取数据
  async loadData(key: string): Promise<any> {
    try {
      const filePath = path.join(process.cwd(), 'plugin-data', this.plugin.id, `${key}.json`);
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`[Plugin] 读取数据失败: ${this.plugin.id}/${key}`);
      return null;
    }
  }

  // 获取插件信息
  getPluginInfo(): { id: string; name: string; version: string } {
    return {
      id: this.plugin.id,
      name: this.plugin.name,
      version: this.plugin.version
    };
  }

  // 清理资源
  dispose(): void {
    this.disposables.forEach(dispose => dispose());
    this.disposables = [];
    this.removeAllListeners();
    console.log(`[Plugin] 清理上下文: ${this.plugin.id}`);
  }
}

// 插件管理器主类
export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private pluginsDir: string;
  private gameClientRef: any = null;

  constructor(pluginsDir: string) {
    super();
    this.pluginsDir = pluginsDir;
    console.log(`[PluginManager] 初始化，插件目录: ${pluginsDir}`);
  }

  // 设置游戏客户端引用（供插件使用）
  setGameClient(gameClient: any): void {
    this.gameClientRef = gameClient;
    console.log('[PluginManager] 设置游戏客户端引用');
  }

  // 获取游戏客户端引用
  getGameClient(): any {
    return this.gameClientRef;
  }

  // 初始化插件目录
  async initPluginsDirectory(): Promise<void> {
    try {
      await fs.promises.mkdir(this.pluginsDir, { recursive: true });
      console.log(`[PluginManager] 插件目录已创建: ${this.pluginsDir}`);
    } catch (error) {
      console.error('[PluginManager] 创建插件目录失败:', error);
    }
  }

  // 加载所有插件
  async loadPlugins(): Promise<void> {
    console.log('[PluginManager] 开始加载所有插件...');
    
    try {
      await this.initPluginsDirectory();
      
      const dirs = await fs.promises.readdir(this.pluginsDir);
      console.log(`[PluginManager] 找到 ${dirs.length} 个插件目录`);
      
      for (const dir of dirs) {
        const pluginPath = path.join(this.pluginsDir, dir);
        const stat = await fs.promises.stat(pluginPath);
        
        if (stat.isDirectory()) {
          try {
            await this.loadPlugin(pluginPath);
          } catch (error) {
            console.error(`[PluginManager] 加载插件失败: ${dir}`, error);
          }
        }
      }
      
      console.log(`[PluginManager] 成功加载 ${this.plugins.size} 个插件`);
    } catch (error) {
      console.error('[PluginManager] 加载插件时出错:', error);
    }
  }

  // 加载单个插件
  async loadPlugin(pluginPath: string): Promise<void> {
    console.log(`[PluginManager] 加载插件: ${pluginPath}`);
    
    // 读取插件元数据
    const metadataPath = path.join(pluginPath, 'plugin.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`插件元数据文件不存在: ${metadataPath}`);
    }

    const metadata: PluginMetadata = JSON.parse(
      await fs.promises.readFile(metadataPath, 'utf-8')
    );

    // 验证必需字段
    if (!metadata.name || !metadata.version || !metadata.main) {
      throw new Error('插件元数据缺少必需字段');
    }

    // 检查插件是否已加载
    if (this.plugins.has(metadata.name)) {
      console.warn(`[PluginManager] 插件已存在: ${metadata.name}`);
      return;
    }

    // 动态导入插件
    const mainPath = path.join(pluginPath, metadata.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`插件入口文件不存在: ${mainPath}`);
    }

    // 使用 require 加载插件（支持commonjs）
    const pluginModule = require(mainPath);
    const pluginExport = pluginModule.default || pluginModule;

    // 创建插件实例
    const plugin: Plugin = {
      id: metadata.name,
      name: metadata.displayName,
      version: metadata.version,
      metadata,
      instance: pluginExport,
      context: null as any,
      enabled: false,
      path: pluginPath
    };

    // 创建插件上下文
    plugin.context = new PluginContext(plugin);

    // 存储插件
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginManager] 插件已加载: ${plugin.id} v${plugin.version}`);

    // 自动激活插件
    await this.activatePlugin(plugin.id);
  }

  // 激活插件
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    if (plugin.enabled) {
      console.warn(`[PluginManager] 插件已激活: ${pluginId}`);
      return;
    }

    try {
      console.log(`[PluginManager] 激活插件: ${pluginId}`);
      
      // 检查插件是否有activate方法
      if (typeof plugin.instance.activate !== 'function') {
        throw new Error('插件缺少 activate 方法');
      }

      // 调用插件的activate方法
      await plugin.instance.activate(plugin.context);
      plugin.enabled = true;

      this.emit('plugin:activated', plugin);
      console.log(`[PluginManager] 插件已激活: ${pluginId}`);
    } catch (error) {
      console.error(`[PluginManager] 激活插件失败: ${pluginId}`, error);
      throw error;
    }
  }

  // 停用插件
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      return;
    }

    try {
      console.log(`[PluginManager] 停用插件: ${pluginId}`);

      // 调用插件的deactivate方法
      if (typeof plugin.instance.deactivate === 'function') {
        await plugin.instance.deactivate(plugin.context);
      }

      // 清理上下文
      plugin.context.dispose();
      plugin.enabled = false;

      this.emit('plugin:deactivated', plugin);
      console.log(`[PluginManager] 插件已停用: ${pluginId}`);
    } catch (error) {
      console.error(`[PluginManager] 停用插件失败: ${pluginId}`, error);
      throw error;
    }
  }

  // 卸载插件
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginId}`);
    }

    try {
      // 先停用插件
      if (plugin.enabled) {
        await this.deactivatePlugin(pluginId);
      }

      // 删除插件文件
      await this.deleteDirectory(plugin.path);

      // 从列表中移除
      this.plugins.delete(pluginId);

      this.emit('plugin:uninstalled', plugin);
      console.log(`[PluginManager] 插件已卸载: ${pluginId}`);
    } catch (error) {
      console.error(`[PluginManager] 卸载插件失败: ${pluginId}`, error);
      throw error;
    }
  }

  // 递归删除目录
  private async deleteDirectory(dirPath: string): Promise<void> {
    const files = await fs.promises.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.promises.stat(filePath);
      
      if (stat.isDirectory()) {
        await this.deleteDirectory(filePath);
      } else {
        await fs.promises.unlink(filePath);
      }
    }
    
    await fs.promises.rmdir(dirPath);
  }

  // 获取所有插件
  getAllPlugins(): any[] {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      enabled: p.enabled,
      author: p.metadata.author,
      description: p.metadata.description,
      icon: p.metadata.icon,
      ui: p.metadata.ui,
      permissions: p.metadata.permissions
    }));
  }

  // 获取单个插件信息
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  // 获取插件API
  getPluginAPI(pluginId: string): any {
    const plugin = this.plugins.get(pluginId);
    return plugin?.instance.api;
  }

  // 执行插件命令
  async executeCommand(commandName: string, ...args: any[]): Promise<any> {
    // 命令格式: pluginId.commandName
    const [pluginId] = commandName.split('.');
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin || !plugin.enabled) {
      throw new Error(`插件未启用: ${pluginId}`);
    }

    return plugin.context.executeCommand(commandName, ...args);
  }

  // 广播事件到所有插件
  broadcastEvent(eventName: string, ...args: any[]): void {
    this.plugins.forEach(plugin => {
      if (plugin.enabled) {
        plugin.context.emit(eventName, ...args);
      }
    });
  }

  // 清理所有插件
  async dispose(): Promise<void> {
    console.log('[PluginManager] 清理所有插件...');
    
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        await this.deactivatePlugin(plugin.id);
      }
    }
    
    this.plugins.clear();
    this.removeAllListeners();
    console.log('[PluginManager] 清理完成');
  }
}

// 导出单例
let pluginManagerInstance: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManagerInstance) {
    const pluginsDir = path.join(process.cwd(), 'plugins');
    pluginManagerInstance = new PluginManager(pluginsDir);
  }
  return pluginManagerInstance;
}
