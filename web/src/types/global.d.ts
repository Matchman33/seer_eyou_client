// web/src/types/global.d.ts
export interface GameClientAPI {
  on: (eventName: string, callback: (...args: any[]) => void) => void;
  emit: (eventName: string, params: any, callback?: (...args: any[]) => void) => void;
  stop: () => void;
}

export interface WindowAPI {
  saveSeerjsFile: (fileName: string, content: string) => Promise<void>;
  readSeerjsFile: (fileName: string) => Promise<string>;
  readSeerjsFiles: () => Promise<any[]>;
  deleteSeerjsFile: (fileName: string) => Promise<void>;
  renameSeerjsFile: (oldName: string, newName: string) => Promise<void>;
  openNewWindow: (url: string, options?: any) => any;
  runScript: (modulePath: string, args?: readonly string[], options?: any) => {
    child: any;
    exit: () => void;
    addListener: (eventName: string, callback: (...args: any[]) => void) => void;
  };
}

export interface PluginAPI {
  getAllPlugins: () => Promise<any[]>;
  getPlugin: (pluginId: string) => Promise<any>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  getPluginAPI: (pluginId: string) => any;
  executeCommand: (commandName: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    $game: {
      newGameClient: (port?: number, ip?: string) => GameClientAPI;
    };
    $win: WindowAPI;
    $plugin: PluginAPI;
  }
}

export {};
