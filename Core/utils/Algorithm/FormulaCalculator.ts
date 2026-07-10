/**
 * 简单的表达式计算器
 * 支持基本的四则运算和括号
 */
export class FormulaCalculator {
    /**
     * 计算属性值
     * @param formula 公式
     * @param params 参数
     * @param variables 变量
     */
    public static calculate(formula: string, params: any, variables: any): number {
        let expression = formula;
        
        // 替换参数和变量
        for (const key in params) {
            expression = expression.replace(
                new RegExp(key, 'g'), 
                params[key].toString()
            );
        }
        
        for (const key in variables) {
            expression = expression.replace(
                new RegExp(key, 'g'), 
                variables[key].toString()
            );
        }

        return this.evaluateExpression(expression);
    }

    /**
     * 计算表达式
     * 支持: + - * / ( )
     */
    private static evaluateExpression(expression: string): number {
        // 移除空格
        expression = expression.replace(/\s+/g, '');
        
        // 解析表达式
        const tokens = this.tokenize(expression);
        return this.parseExpression(tokens);
    }

    /**
     * 将表达式转换为标记数组
     */
    private static tokenize(expression: string): string[] {
        const tokens: string[] = [];
        let current = '';
        
        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            
            if ('+-*/()\n'.includes(char)) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                tokens.push(char);
            } else {
                current += char;
            }
        }
        
        if (current) {
            tokens.push(current);
        }
        
        return tokens;
    }

    /**
     * 解析表达式
     */
    private static parseExpression(tokens: string[]): number {
        const values: number[] = [];
        const operators: string[] = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token === '(') {
                operators.push(token);
            }
            else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(') {
                    this.processOperator(values, operators.pop()!);
                }
                operators.pop(); // 移除 '('
            }
            else if ('+-*/'.includes(token)) {
                while (operators.length && this.getPrecedence(operators[operators.length - 1]) >= this.getPrecedence(token)) {
                    this.processOperator(values, operators.pop()!);
                }
                operators.push(token);
            }
            else {
                values.push(parseFloat(token));
            }
        }
        
        while (operators.length) {
            this.processOperator(values, operators.pop()!);
        }
        
        return values[0];
    }

    /**
     * 获取运算符优先级
     */
    private static getPrecedence(operator: string): number {
        switch (operator) {
            case '+':
            case '-':
                return 1;
            case '*':
            case '/':
                return 2;
            default:
                return 0;
        }
    }

    /**
     * 处理运算符
     */
    private static processOperator(values: number[], operator: string): void {
        const b = values.pop()!;
        const a = values.pop()!;
        
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
        }
    }
} 