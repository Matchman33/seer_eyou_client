import { createServer, Socket } from 'net';
import { parsePacket } from './packet';


type Packet = {

    type: 'on' | 'emit' | 'return'| 'error';
    eventName: string;
    data?: any;
    id?: string 
    msg ?: string
}


/**
 * IPCServer类用于处理IPC通信
 * 通过TCP协议在本地创建一个服务器，监听指定端口
 * 接收来自客户端的JSON数据包，并根据数据包的类型进行处理
 * 支持注册事件、调用客户端和回复事件
 * 在进程启动之后就应该立即调用listen来进行监听
 */
export class IPCS {


    listen(port: number) {
        createServer((socket) => {
            socket.on('data', (data: Buffer) => {
                
                const packets = parsePacket(data);
                packets.forEach((packet) => {

                    this.handlePacket(JSON.parse(packet), socket);

                });

            });
            socket.on("close", () => this.onClose(socket));
            socket.on("error", () => this.onClose(socket));
        }).listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    }

    private handlePacket(packet: Packet, socket: Socket) {
        // 处理接收到的JSON数据
        switch (packet.type) {
            case 'on':


                this.registerEvent(packet.eventName, socket);
                break;
            case 'emit':
                // 处理emit事件
                this.callClient(packet, socket);

                break;

            case 'return':
                // 处理return事件
                // console.log('return', packet);
                this.return(packet.id!, packet);
                break;
            default:
                console.error('Unknown packet type:', packet.type);
                break;

        }
    }

    // 客户端注册的事件,键是事件名,值是客户端socket的集合
    private client_events: { [eventName: string]: Set<Socket> } = {};
    // 客户端socket,键是socket对象,值是事件名的集合
    // 这里使用WeakMap是为了防止内存泄漏,因为socket对象会被GC回收
    private sockets = new WeakMap<Socket, Set<string>>();
    // 等待回复的事件,键是事件id,值是socket对象
    private waitForReturn: { [id: string]: Socket } = {};

    private registerEvent(eventName: string, socket: Socket) {
        // 处理注册事件的逻辑

        this.client_events[eventName] = this.client_events[eventName] || new Set();
        this.sockets.set(socket, this.sockets.get(socket) || new Set());
        this.client_events[eventName].add(socket);
        this.sockets.get(socket)!.add(eventName);
    }

    /**
     * 将数据包发送到包含指定事件的客户端，如果没有客户端注册该事件，则返回错误消息
     * @param packet 数据包，完整内容
     * @param socket 欲等待回复的socket对象
     */
    private callClient(packet: Packet, socket: Socket) {
        // 处理调用客户端的逻辑
        const sockets = this.client_events[packet.eventName];
        if (sockets && sockets.size > 0) {
            sockets.forEach((s) => {
                if (packet.id) this.waitForReturn[packet.id] = socket;

                s.write(JSON.stringify({ ...packet, type: 'emit' } as Packet));
            });
        } else {
            socket.write(JSON.stringify({ msg: '没有指定的事件: ' , eventName: packet.eventName, type: 'error' } as Packet));

        }
    }
    /**
     * 回复指定事件的客户端
     * @param id 事件id
     * @param packet 数据包，完整内容
     */
    private return(id: string, packet: Packet) {

        const socket = this.waitForReturn[id];

        if (socket) {

            socket.write(JSON.stringify({ ...packet, type: "return" }));
            delete this.waitForReturn[id];

        }
    }

    /**
     * 处理socket关闭的逻辑,将与该socket相关的事件从client_events中删除
     * @param socket 即将关闭的socket对象
     */
    private onClose(socket: Socket) {
        if (!this.sockets.has(socket)) return;

        this.sockets.get(socket)!.forEach((event) => {
            this.client_events[event].delete(socket);
        });
        this.sockets.delete(socket);
    }

}