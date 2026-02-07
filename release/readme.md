# 使用说明 

## DLL 放置说明

请将以下两个 DLL 文件复制到指定目录：

- CrashSight64.dll → D:\SeerLauncher\games\NewSeer\Seer_Data\Plugins\x86_64
- seerHacker.dll → D:\SeerLauncher\games\NewSeer

说明：
- 将 DLL 放入目标目录后，程序会在运行时从该目录自动加载。

## 封包通信说明

### 概览
- 服务端监听地址与端口：127.0.0.1:3000
- 通信模型：事件驱动，双方通过 on 注册事件处理器、通过 emit 触发事件
- 客户端接口：GameClient.on(eventName, callback)、GameClient.emit(eventName, payload)

### 事件用法总览
```ts
GameClient.on(eventName: string, callback: (payload: any) => void)
GameClient.emit(eventName: string, payload?: any)
```
```cpp
ipcc->on(const char* event, std::function<json(const json&)> handler);
ipcc.emit(const char* event, const json& payload);
```

### 服务端发出的事件（server_to_client）

#### 登录结果通知：_onLoginCallback
```cpp
ipcc.emit("_onLoginCallback", json({
  {"userId", lpPacketData->userId},
  {"result", Result},
  {"key", Algorithm::GetKey()}
}));
```
```ts
GameClient.on("_onLoginCallback", (data) => {
  const { userId, result, key } = data;
});
```
- 数据体(JSON)：userId:number, result:number, key:string
- 作用：通知客户端登录结果与凭据
- 触发时机：服务端完成登录流程后

#### 收包回调（服务端收到游戏封包）：_onRecvCallback
```cpp
ipcc.emit("_onRecvCallback", json({
  {"packet", SOC::vectorToHexStr(*plain)}
}));
```
```ts
GameClient.on("_onRecvCallback", ({ packet }) => {});
```
- 数据体(JSON)：packet:hex_string
- 作用：广播服务端收到的封包内容
- 触发时机：服务端解析并接收来自游戏的封包

#### 发包回调（游戏发包）：_onSendCallback
```cpp
ipcc.emit("_onSendCallback", json({
  {"packet", SOC::vectorToHexStr(*plain)}
}));
```
```ts
GameClient.on("_onSendCallback", ({ packet }) => {});
```
- 数据体(JSON)：packet:hex_string
- 作用：广播游戏端发出的封包内容
- 触发时机：游戏端产生并发送封包

### 服务端监听的事件（client_to_server）

#### 刷新初始化：_fresh
```ts
GameClient.emit("_fresh", {});
```
```cpp
ipcc->on("_fresh", [&](const json &data) {
  pInit();
  return json({});
});
```
- 请求体(JSON)：{}
- 响应体(JSON)：{}
- 作用：触发服务端初始化/刷新流程

#### 查询登录状态：_is_login
```ts
GameClient.emit("_is_login", {});
```
```cpp
ipcc->on("_is_login", [&](json params) {
  return json({
    {"userId", v->getUserId()},
    {"isLogin", v->getIsLogin()}
  });
});
```
- 请求体(JSON)：{}
- 响应体(JSON)：userId:number, isLogin:boolean
- 作用：查询当前登录状态与用户标识

#### 发送封包到服务端：_send_packet
```ts
GameClient.emit("_send_packet", { packet: "ABCD..." });
```
```cpp
ipcc->on("_send_packet", [&](json params) {
  auto packet = params["packet"].get<std::string>();
  oriSendPacket(SOC::hexStrToVector(packet));
  return json({});
});
```
- 请求体(JSON)：packet:hex_string
- 响应体(JSON)：{}
- 作用：将十六进制封包字符串发送至服务端，由服务端完成底层发送

### 示例：登录事件触发与接收
```cpp
ipcc.emit("_onLoginCallback", json({
  {"userId", 123456},
  {"result", 0},
  {"key", "K1A2B3C4..."}
}));
```
```ts
GameClient.on("_onLoginCallback", ({ userId, result, key }) => {});
```
