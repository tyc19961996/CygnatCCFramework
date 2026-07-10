
export default  interface  FileFs{
    /**异步 创建文件夹 */
    mkdir(path: string, f: (e, r?: any, n?: any) => void)
    /**同步 创建文件夹 */
    mkdirSync(path: string):boolean
    /**异步 写入文件 */
    writeFile(path, data, options?: any, callback?: any)
    /**同步 写入文件 */
    writeFileSync(path, data, options?: {})
    /**异步 读取文件 */
    readFile(t, f: (e, r) => void)
    /**同步 读取文件 */
    readFileSync(t,o?): any
    /**读取文件夹 */
    readdirSync(p:string):string[];
    /**异步 重命名 */
    rename(oldPath, newPath, callback)
    /**同步 重命名 */
    renameSync(oldPath, newPath)
    /**异步 文件是否存在 */
    exists(path: string, call: (t, e) => void)
    /**同步 文件是否存在 */
    existsSync(path): boolean;

    unlink(path:string);

    unlinkSync(path):boolean;
}

