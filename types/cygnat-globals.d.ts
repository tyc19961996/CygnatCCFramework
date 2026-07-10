declare namespace Editor {
  namespace Project {
    const name: string;
    const path: string;
  }

  namespace Dialog {
    function select(options: any): Promise<{ filePaths: string[] }>;
  }

  namespace Message {
    function request(moduleName: string, messageName: string, ...args: any[]): Promise<any>;
  }
}
