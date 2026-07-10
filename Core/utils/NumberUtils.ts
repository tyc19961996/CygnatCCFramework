
/**数字工具 */
export class NumberUtils {

    /**
    * 
    * @param {String} str 运算表达式
    * @returns 运算结果
    */
    static calculateExpression(str) {
        // 运算符栈
        const operators = [];
        // 操作数栈
        const values = [];
        // 定义运算符的优先级
        const precedence = {
            '+': 1,
            '-': 1,
            '*': 2,
            '/': 2
        };

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            // 如果是数字，解析整个数字
            if (!isNaN(char)) {
                let num = parseFloat(char);

                while (i + 1 < str.length && !isNaN(str[i + 1])) {
                    num = num * 10 + parseFloat(str[i + 1]);
                    i++;
                }

                values.push(num);
            } else if (char === '(') {
                // 如果是左括号，将其推入运算符栈
                operators.push(char);
            } else if (char === ')') {
                // 如果是右括号，将栈顶运算符应用于运算数，直到遇到左括号为止
                while (
                    operators.length > 0 &&
                    operators[operators.length - 1] !== '('
                ) this.applyOperator(operators, values);

                // 弹出左括号
                operators.pop();
            } else if (char in precedence) {
                // 如果是运算符
                while (
                    operators.length > 0 &&
                    precedence[char] <= precedence[operators[operators.length - 1]]
                ) this.applyOperator(operators, values);

                operators.push(char);
            }
        }

        // 处理剩余的运算符
        while (operators.length > 0) this.applyOperator(operators, values);

        // 最终结果位于操作数栈的顶部
        return values[0];
    }

    /**
         * 辅助函数，用于执行运算
         * @param {*} operators 运算符栈
         * @param {*} values 操作数栈
         */
    static applyOperator(operators, values) {
        const operator = operators.pop();
        const b = values.pop();
        const a = values.pop();

        switch (operator) {
            case '+':
                values.push(a + b);
                break;
            case '-':
                values.push(a - b);
                break;
            case '*':
                values.push(a * b);
                break;
            case '/':
                values.push(a / b);
                break;
            default:
                console.log('出错啦');
                break;
        }
    }

}
