"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const seerWindows_1 = require("./src/utils/seerWindows");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let seerWindow = null;
// 加载配置文件
const loadConfig = () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configData);
    }
    catch (error) {
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
const onReady = () => {
    // 隐藏默认菜单栏
    electron_1.Menu.setApplicationMenu(null);
    // 从配置文件读取URL
    seerWindow = new seerWindows_1.SeerWindow(config.app.devServerUrl, {
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
            }
            else if (input.key === 'F5') {
                seerWindow?.mainWindow.reload(); // 刷新页面
            }
        }
    });
    // 监听改变窗口大小
    seerWindow.mainWindow.on('will-resize', (event, newBounds) => {
        console.log(newBounds);
    });
};
electron_1.app.on('ready', onReady);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        onReady();
    }
});
