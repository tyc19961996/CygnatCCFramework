//AudioMgr.ts
import { Node, AudioSource, AudioClip, director, Component } from 'cc';
import { AudioBundleName, AudioLoadTag, SFXPlayRecord } from './AudioInfo';
import { AssetLoader } from '../../UI';

/**
 * @en
 * this is a sington class for audio play, can be easily called from anywhere in you project.
 * @zh
 * 这是一个用于播放音频的单件类，可以很方便地在项目的任何地方调用。
 */
export class AudioManager extends Component {
    private static _ins: AudioManager;
    public static get ins(): AudioManager {
        if (this._ins == null) {
            const _root = new Node();
            _root.name = "AudioManager";
            //设为常驻节点
            director.addPersistRootNode(_root);
            this._ins = _root.addComponent<AudioManager>(this);
        }
        return this._ins;
    }
    private audioList: Record<string, AudioClip> = {};
    private _audioSource: AudioSource;
    private _audioeffect: AudioSource;
    public currentBGM: string = null;

    /** 音效播放记录 */
    private _sfxPlayRecords: Map<string, SFXPlayRecord> = new Map();
    /** 音效播放最小间隔（毫秒） */
    private _sfxMinInterval: number = 50;
    /** 时间窗口内最大播放次数 */
    private _sfxMaxPlayCount: number = 3;
    /** 时间窗口大小（毫秒） */
    private _sfxTimeWindow: number = 200;


    protected onLoad(): void {
        this._audioSource = this.node.addComponent(AudioSource);
        this._audioeffect = this.node.addComponent(AudioSource);
        this._audioSource.volume = 1;
        this._audioeffect.volume = 1;
    }
    /**
     * 获取正在播放的循环音频
     */
    public get audioSource() {
        return this._audioSource;
    }
    /**
     * 播放背景音乐
     * @param type 背景音乐类型
     */
    playBGM(type: string) {
        if (this.currentBGM === type) return;

        this.currentBGM = type;
        if (this.audioList[type]) {
            this._audioSource.stop();
            this._audioSource.clip = this.audioList[type];
            this._audioSource.loop = true;
            this._audioSource.play();
        } else {
            AssetLoader.loadDynmicResByBundle(AudioBundleName, type, AudioClip, AudioLoadTag).then((audio: AudioClip) => {
                if (!audio) {
                    console.warn(`BGM not found: ${type}`);
                    return;
                }
                this.audioList[type] = audio;
                this._audioSource.stop();
                this._audioSource.clip = audio;
                this._audioSource.loop = true;
                this._audioSource.play();
            });
        }
    }

    /**
     * 检查音效是否可以播放
     * @param type 音效类型
     * @returns 是否可以播放
     */
    private _canPlaySFX(type: string): boolean {
        const currentTime = Date.now();
        const record = this._sfxPlayRecords.get(type);

        if (!record) {
            // 第一次播放
            this._sfxPlayRecords.set(type, {
                lastPlayTime: currentTime,
                playCount: 1,
                windowStartTime: currentTime
            });
            return true;
        }

        // 检查最小间隔
        if (currentTime - record.lastPlayTime < this._sfxMinInterval) {
            return false;
        }

        // 检查时间窗口内播放次数
        if (currentTime - record.windowStartTime > this._sfxTimeWindow) {
            // 重置时间窗口
            record.windowStartTime = currentTime;
            record.playCount = 1;
        } else {
            // 在同一时间窗口内
            if (record.playCount >= this._sfxMaxPlayCount) {
                return false;
            }
            record.playCount++;
        }

        record.lastPlayTime = currentTime;
        return true;
    }

    /**
     * 播放音效
     * @param type 音效类型
     * @param forcePlay 是否强制播放（忽略频率限制）
     * @param volumeScale 音量缩放 最终播放的音量为 audioSource.volume * volumeScale
     */
    playSFX(type: string, forcePlay: boolean = true, volumeScale: number = 1) {
        // 检查播放频率限制
        if (!forcePlay && !this._canPlaySFX(type)) {
            return;
        }

        if (this.audioList[type]) {
            this._audioeffect.playOneShot(this.audioList[type],volumeScale);
        } else {
            AssetLoader.loadDynmicResByBundle(AudioBundleName, type, AudioClip, AudioLoadTag).then((audio: AudioClip) => {
                if (!audio) {
                    console.warn(`SFX not found: ${type}`);
                    return;
                }
                this.audioList[type] = audio;
                this._audioeffect.playOneShot(audio,volumeScale);
            });
        }
    }

    /**
     * 设置音效播放限制参数
     * @param minInterval 最小播放间隔（毫秒）
     * @param maxPlayCount 时间窗口内最大播放次数
     * @param timeWindow 时间窗口大小（毫秒）
     */
    public setSFXLimits(minInterval: number = 50, maxPlayCount: number = 3, timeWindow: number = 200) {
        this._sfxMinInterval = minInterval;
        this._sfxMaxPlayCount = maxPlayCount;
        this._sfxTimeWindow = timeWindow;
    }

    /**
     * 停止背景音乐
     */
    stop() {
        this.currentBGM = null;
        this._audioSource.stop();
    }
    /**
     * 暂停背景音乐
     */
    pause() {
        this._audioSource.pause();
    }
    /**
     * 恢复背景音乐
     */
    resume() {
        this._audioSource.play();
    }
    /**
     * 设置背景音乐开关
     * @param val 是否开启
     */
    setBGMVolume(val: number) {
        this._audioSource.volume = val * 0.6;
    }
    /**
     * 设置音效开关
     * @param val 是否开启
     */
    setSFXVolume(val: number) {
        this._audioeffect.volume = val;
    }
    /**
     * 预加载音频资源
     * @param types 音频类型数组
     */
    public async preloadAudios(types: string[]) {
        types.forEach(async type => {
            if (!this.audioList[type]) {
                const audio: AudioClip = await AssetLoader.loadDynmicResByBundle(AudioBundleName, type as string, AudioClip, AudioLoadTag);
                if (audio) {
                    this.audioList[type] = audio;
                }
            }
        });
    }
}

