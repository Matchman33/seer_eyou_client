import { nanoid } from 'nanoid';
import net from 'net';

// 定义数据包类型
interface Packet {
    type: string;
    eventName?: string;
    data?: any;
    id?: string;
    msg?: string;
}

// 定义回调函数类型
type Callback = (data?: any) => any;
let client: GameClient | null = null;
export function getIPCClient(port: number = 3000, ip: string = '127.0.0.1'): GameClient {
    if (client && client.status === 'running') {
        return client;
    }
    client = new GameClient(port, ip);
    return client;
}


export class GameClient {
    private client: net.Socket;
    private registerEvents: Map<string, Callback[]> = new Map();
    private waitForReply: Map<string, Callback> = new Map();
    private buffer: string = '';
    public status = 'running';

    constructor(port: number, ip: string = '127.0.0.1') {
        // 创建 TCP 客户端连接
        this.client = net.createConnection({ port, host: ip }, () => {
            console.log('Connected to server');
        });

        // 监听数据事件
        this.client.on('data', (data) => {
            this.handleData(data.toString());
        });

        // 监听错误事件
        this.client.on('error', (err) => {
            console.error('Connection error:', err);
            this.status = 'closed';
        });

        // 监听关闭事件
        this.client.on('close', () => {
            console.log('Connection closed');
            this.status = 'closed';

        });
    }

    /**
     * 注册事件处理器
     * @param eventName 事件名称
     * @param callback 回调函数
     */
    public on(eventName: string, callback?: Callback): void {
        if (callback) {
            if (!this.registerEvents.has(eventName)) {
                this.registerEvents.set(eventName, []);
            }
            this.registerEvents.get(eventName)?.push(callback);
        }

        // 发送注册事件的数据包
        const packet: Packet = {
            type: 'on',
            eventName
        };
        this.client.write(JSON.stringify(packet));
    }

    /**
     * 发送事件到服务器
     * @param eventName 事件名称
     * @param data 数据
     * @param callback 回调函数
     */
    public emit(eventName: string, data: any = {}, callback?: Callback): void {
        const packet: Packet = {
            type: 'emit',
            eventName,
            data
        };

        if (callback) {
            packet.id = nanoid(); // 使用 UUID 作为唯一标识
            this.waitForReply.set(packet.id, callback);
        }

        this.client.write(JSON.stringify(packet));
    }

    /**
     * 处理接收到的数据
     * @param data 接收到的字符串数据
     */
    private handleData(data: string): void {
        this.buffer += data;
        const packets = this.parsePacket(this.buffer);

        packets.forEach(p => {
            try {
                const packet: Packet = JSON.parse(p);
                this.handlePacket(packet);
            } catch (e) {
                console.error('Error decoding JSON:', e);
            }
        });
    }

    /**
     * 解析数据包
     * @param data 原始数据字符串
     * @returns 解析后的数据包字符串数组
     */
    private parsePacket(data: string): string[] {
        let isStr = false;
        const stack: number[] = [];
        let startIndex = 0;
        const res: string[] = [];

        for (let endIndex = 0; endIndex < data.length; endIndex++) {
            const char = data[endIndex];
            
            if (char === '"') {
                isStr = !isStr;
            }
            if (isStr) {
                continue;
            }
            if (char === '{') {
                stack.push(0);
            } else if (char === '}') {
                if (stack.length > 0) {
                    stack.pop();
                }
                if (stack.length === 0) {
                    res.push(data.substring(startIndex, endIndex + 1));
                    startIndex = endIndex + 1;
                }
            }
        }

        this.buffer = data.substring(startIndex);
        return res;
    }

    /**
     * 处理数据包
     * @param packet 解析后的数据包对象
     */
    private handlePacket(packet: Packet): void {
        if (packet.type === 'return') {
            // 处理返回数据包
            if (packet.id && this.waitForReply.has(packet.id)) {
                const callback = this.waitForReply.get(packet.id);
                if (callback) {
                    callback(packet.data);
                    this.waitForReply.delete(packet.id);
                }
            }
        } else if (packet.type === 'emit') {
            // 处理服务器发送的事件
            if (packet.eventName && this.registerEvents.has(packet.eventName)) {
                const callbacks = this.registerEvents.get(packet.eventName);
                if (callbacks && callbacks.length > 0) {
                    // 调用所有注册的回调函数，但只使用第一个结果
                    const res = callbacks[0](packet.data);
                    if (packet.id) {
                        // 如果有 ID 则需要返回响应
                        const response: Packet = {
                            type: 'return',
                            id: packet.id,
                            eventName: packet.eventName,
                            data: res
                        };
                        this.client.write(JSON.stringify(response));
                    }
                }
            }
        } else {
            console.error(`Error: ${packet.msg}`);
        }
    }

    /**
     * 同步调用，等待响应
     * @param eventName 事件名称
     * @param data 数据
     * @returns Promise 包含响应结果
     */
    public acquire(eventName: string, data: any): Promise<any> {
        return new Promise((resolve) => {
            this.emit(eventName, data, (res) => {
                resolve(res);
            });
        });
    }

    /**
     * 关闭连接
     */
    public close(): void {
        this.client.destroy();
        this.status = 'closed';
    }
}
