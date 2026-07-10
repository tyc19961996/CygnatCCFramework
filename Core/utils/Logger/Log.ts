import { PREVIEW } from "cc/env";
import { _DEBUG_ } from "../../header";


/**
 * 打印台扩展
 */

/**
 * 
 * @param level         日志等级
 * @param styleColor    背景颜色
 * @param title         日志标题
 * @param titleColor    标题颜色
 * @param txtColor      文本颜色
 * @returns 
 */
function create(level: 'log' | 'warn' | 'error', styleColor: string, title: string, titleColor = '#fff', txtColor = '#000') {
    if (PREVIEW) {
        return window.console[level].bind(window.console,
            '%c %s %c ',//%s
            `background:${styleColor}; padding: 2px; border-radius: 5px 0 0 5px; border: 1px solid ${styleColor}; color: ${titleColor}; font-weight: normal;`,
            `${title} ${new Date().toLocaleString()}`,
            `background:#ffffff ; padding: 2px; border-radius: 0 5px 5px 0; border: 1px solid ${styleColor}; color: ${txtColor}; font-weight: normal;`
        );
    }
    return window.console[level].bind(window.console,
        `${title} [${new Date().toLocaleString()}]`
    );
}

//#region 外部调用

function Print(Fun: any, list: any[]) {
    switch (list.length) {
        case 1:
            Fun(list[0])
            break;
        case 2:
            Fun(list[0], list[1])
            break;
        case 3:
            Fun(list[0], list[1], list[2])
            break;
        case 4:
            Fun(list[0], list[1], list[2], list[3])
            break;
        case 5:
            Fun(list[0], list[1], list[2], list[3], list[4])
            break;
        case 6:
            Fun(list[0], list[1], list[2], list[3], list[4], list[5])
            break;
        default:
            Fun(list)
            break;
    }
}

/**
 * 包装普通消息
 * @param any 内容
 */
function Log(...params: any[]) {
    if (!_DEBUG_) return;

    create('log', '#9BA4B4', '[普通]', '#fff')(params);
}

/**
 * 包装普通轻消息
 * @param any 内容
 */
function LogLight(...params: any[]) {
    if (!_DEBUG_) return;

    create('log', '#EBEBEB', '[普通Ex]', '#776d8a')(params);
}

/**
 * 包装成功消息
 * @param any 内容
 */
function Com(...params: any[]) {
    if (!_DEBUG_) return;

    create('log', '#ade498', '[完成]', '#fff')(params);
}

/**
 * 包装警告消息
 * @param any 内容
 */
function Warn(...params: any[]) {
    if (!_DEBUG_) return;

    create('warn', '#ffa931', '[警告]', '#5c6e06')(params);
}

/**
 * 包装错误消息
 * @param any 内容
 */
function Error(...params: any[]) {
    // if (!_DEBUG_) return;

    create('error', '#ec0101', '[错误]', '#fff')(params);
}


export { Log, LogLight, Com, Warn, Error };