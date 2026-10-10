#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInstaller } from './install-harmony-ads.mjs';

export { runInstaller } from './install-harmony-ads.mjs';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const options = { project: '', mode: 'check', account: { appId: '', clientId: '' } };
        let modeSeen = false;
        for (let i = 2; i < process.argv.length; i++) {
            const arg = process.argv[i];
            if (arg === '--project') options.project = process.argv[++i] || '';
            else if (arg === '--app-id') options.account.appId = process.argv[++i] || '';
            else if (arg === '--client-id') options.account.clientId = process.argv[++i] || '';
            else if (['--check', '--dry-run', '--apply'].includes(arg)) {
                if (modeSeen) throw Error('只能指定一个运行模式');
                modeSeen = true; options.mode = arg.slice(2);
            } else throw Error('未知参数：' + arg);
        }
        const result = await runInstaller(options);
        for (const message of [...result.messages, ...result.changes]) console.log('[Harmony Account] ' + message);
        console.log('[Harmony Account] ' + (result.status === 'ok' ? '安装配置已就绪' : result.status === 'conflict' ? '存在冲突，未写入' : '检测到待应用改动'));
        process.exitCode = result.status === 'conflict' ? 2 : result.status !== 'ok' && options.mode === 'check' ? 1 : 0;
    } catch (error) { console.error('[Harmony Account] ' + error.message); process.exitCode = 2; }
}
