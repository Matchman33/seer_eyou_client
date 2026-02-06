import { app, BrowserWindow, Menu } from 'electron';
import { SeerWindow } from './src/utils/seerWindows';
import { getPluginManager } from './src/plugins/PluginManager';
import * as fs from 'fs';
import * as path from 'path';

let seerWindow: SeerWindow | null = null;
let pluginManager: any = null;

// 加载配置文件
const loadConfig = () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('加载配置文件失败，使用默认配置:', error);
        return {
            app: {
                windowWidth: 975,
                windowHeight: 640,
                devServerUrl: 'http://localhost:5173'
            }
        };
    }
};

const config = loadConfig();

// 初始化插件管理器
const initPluginManager = async () => {
    try {
        pluginManager = getPluginManager();
        
        // 将插件管理器挂载到global，供preload使用
        (global as any).pluginManager = pluginManager;
        
        // 加载所有插件
        await pluginManager.loadPlugins();
        
        console.log('[Main] 插件管理器初始化完成');
    } catch (error) {
        console.error('[Main] 插件管理器初始化失败:', error);
    }
};

const onReady = async () => {
    // 初始化插件管理器
    await initPluginManager();
    
    // 隐藏默认菜单栏
    Menu.setApplicationMenu(null);
    // 从配置文件读取URL
    seerWindow = new SeerWindow(config.app.devServerUrl, {
        width: config.app.windowWidth,
        height: config.app.windowHeight,
        // 网页的title会覆盖窗口标题
        title: "易游插件管理"
    });



    // 监听 F12 按键打开开发者工具
    // 正式发布应该禁用这个功能
    seerWindow.mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if (input.key === 'F12') {
                seerWindow?.mainWindow.webContents.toggleDevTools(); // 打开/关闭开发者工具
            } else if (input.key === 'F5') {
                seerWindow?.mainWindow.reload(); // 刷新页面
            }
        }
    });

    // 监听改变窗口大小
    seerWindow.mainWindow.on('will-resize', (event, newBounds) => {
        console.log(newBounds);
    });
};

app.on('ready', onReady);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        onReady();
    }
});
