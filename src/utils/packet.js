"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePacket = parsePacket;
/**
 * 解析数据包
 * @param data Buffer数据
 * @returns string[] 解析后的JSON字符串数组
 */
function parsePacket(data) {
    // 判断json字符串中的内容是否是字符串的值,防止json字符串中有{}导致分割错误
    let isStr = false;
    const stack = [];
    let lastPck = "";
    return (() => {
        let startIndex = 0;
        let currentPacket = lastPck + data.toString();
        // 返回的结果,可能是多个json字符串
        let res = [];
        for (let endIndex = 0; endIndex < currentPacket.length; endIndex++) {
            if (currentPacket[endIndex] === '"') {
                isStr = !isStr;
            }
            if (isStr) {
                continue;
            }
            if (currentPacket[endIndex] === "{") {
                stack.push(0);
            }
            else if (currentPacket[endIndex] === "}") {
                stack.pop();
                if (stack.length === 0) {
                    res.push(currentPacket.substring(startIndex, endIndex + 1));
                    startIndex = endIndex + 1;
                }
            }
        }
        if (startIndex < currentPacket.length) {
            lastPck = currentPacket.substring(startIndex);
        }
        return res;
    })();
}
