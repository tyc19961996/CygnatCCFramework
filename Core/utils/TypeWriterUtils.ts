import { isValid, Label } from "cc";

/**
 * 打字机任务信息
 */
interface ITypewriterTask {
    label: Label;
    currentIndex: number;
    fullText: string;
    callback?: () => void;
    timerId: any; // setTimeout返回的ID
    taskId: string; // 任务唯一ID
}

export class TypeWriterUtils {

    /**
     * 所有正在进行的打字机任务
     * key: 任务ID（通常使用label的uuid）
     * value: 任务信息
     */
    private static mTypewriterTaskMap: Map<string, ITypewriterTask> = new Map();

    /**
     * 文字逐字显示（打字机效果）
     * @param label Label组件
     * @param content 要显示的内容
     * @param speed 每个字符的显示间隔时间（秒）
     * @param callback 显示完成后的回调函数
     * @param taskId 可选的任务ID，如果不提供则使用label的uuid
     * @returns 返回任务ID，可用于停止指定的打字机效果
     */
    public static showTextTypewriter(
        label: Label, 
        content: string, 
        speed: number = 0.05, 
        callback?: () => void,
        taskId?: string
    ): string {
        if (!label) {
            console.error("showTextTypewriter: label is null");
            if (callback) callback();
            return "";
        }

        // 生成任务ID（使用label的uuid或自定义ID）
        const id = taskId || label.uuid || `task_${Date.now()}_${Math.random()}`;

        // 如果该label已经有任务在运行，先停止旧任务
        if (this.mTypewriterTaskMap.has(id)) {
            this.stopTypewriter(id);
        }

        // 初始化
        label.string = "";
        const fullText = content || "";

        // 如果内容为空，直接完成
        if (fullText.length === 0) {
            if (callback) callback();
            return id;
        }

        let currentIndex = 0;

        // 保存任务信息
        const task: ITypewriterTask = {
            label: label,
            currentIndex: 0,
            fullText: fullText,
            callback: callback,
            timerId: null,
            taskId: id
        };

        this.mTypewriterTaskMap.set(id, task);

        // 使用setTimeout递归实现逐字显示
        const updateText = () => {
            const currentTask = this.mTypewriterTaskMap.get(id);
            if (!currentTask || !isValid(currentTask.label)) {
                // 任务已被移除或label无效，清理
                this.mTypewriterTaskMap.delete(id);
                return;
            }

            currentIndex++;
            currentTask.currentIndex = currentIndex;

            // 显示到当前索引的文字
            currentTask.label.string = fullText.substring(0, currentIndex);

            // 如果显示完成
            if (currentIndex >= fullText.length) {
                // 完成任务，清理
                this.mTypewriterTaskMap.delete(id);
                if (currentTask.callback) {
                    currentTask.callback();
                }
            } else {
                // 继续下一个字符
                currentTask.timerId = setTimeout(updateText, speed * 1000);
            }
        };

        // 开始第一次更新
        task.timerId = setTimeout(updateText, speed * 1000);

        return id;
    }

    /**
     * 停止指定的打字机效果
     * @param taskId 任务ID，如果不提供则停止所有任务
     * @param showFullText 是否显示完整文字（默认true）
     */
    public static stopTypewriter(taskId?: string, showFullText: boolean = true): void {
        if (taskId !== undefined) {
            // 停止指定任务
            const task = this.mTypewriterTaskMap.get(taskId);
            if (task) {
                // 清除定时器
                if (task.timerId !== null) {
                    clearTimeout(task.timerId);
                }

                // 如果任务还在进行，直接显示完整文字
                if (showFullText && task.currentIndex < task.fullText.length && isValid(task.label)) {
                    task.label.string = task.fullText;
                }

                // 注意：这里不执行callback，因为是被手动停止的，不是自然完成的
                // 如果需要执行回调，应该在调用stopTypewriter的地方处理

                // 从Map中移除
                this.mTypewriterTaskMap.delete(taskId);
            }
        } else {
            // 停止所有任务
            this.stopAllTypewriter(showFullText);
        }
    }

    /**
     * 停止所有打字机效果
     * @param showFullText 是否显示完整文字（默认true）
     */
    public static stopAllTypewriter(showFullText: boolean = true): void {
        const taskIds = Array.from(this.mTypewriterTaskMap.keys());
        for (const taskId of taskIds) {
            this.stopTypewriter(taskId, showFullText);
        }
    }

    /**
     * 根据Label停止对应的打字机效果
     * @param label Label组件
     * @param showFullText 是否显示完整文字（默认true）
     */
    public static stopTypewriterByLabel(label: Label, showFullText: boolean = true): void {
        if (!label) {
            return;
        }

        const taskId = label.uuid;
        if (taskId && this.mTypewriterTaskMap.has(taskId)) {
            this.stopTypewriter(taskId, showFullText);
        }
    }

    /**
     * 检查指定任务是否正在运行
     * @param taskId 任务ID
     * @returns 是否正在运行
     */
    public static isTypewriterRunning(taskId: string): boolean {
        return this.mTypewriterTaskMap.has(taskId);
    }

    /**
     * 获取所有正在运行的任务ID
     * @returns 任务ID数组
     */
    public static getAllRunningTaskIds(): string[] {
        return Array.from(this.mTypewriterTaskMap.keys());
    }
}