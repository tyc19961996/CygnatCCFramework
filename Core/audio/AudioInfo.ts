

export const AudioBundleName = 'Audio';
export const AudioLoadTag = 'AudioTag';

/**
 * 音效播放记录
 */
export interface SFXPlayRecord {
    /** 上次播放时间 */
    lastPlayTime: number;
    /** 播放次数 */
    playCount: number;
    /** 重置计数的时间窗口开始时间 */
    windowStartTime: number;
}