import * as vscode from 'vscode';
import * as https from 'https';
import * as moment from 'moment';

let items: Map<string, vscode.StatusBarItem>
const api = 'https://hq.sinajs.cn/list='

export function activate(context: vscode.ExtensionContext) {
    items = new Map<string, vscode.StatusBarItem>()

    refresh()

    setInterval(refresh, 2000)
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(refresh))
}

function refresh(): void {
    const config = vscode.workspace.getConfiguration()
    const configuredCodes = config.get('vscode-stocks.stockCodes', [])

    if (!arrayEq(configuredCodes, Array.from(items.keys()))) {
        cleanup()
        fillEmpty(configuredCodes)
    }

    refreshStocks(configuredCodes)
}

function cleanup(): void {
    items.forEach(item => {
        item.hide()
        item.dispose()
    });

    items = new Map<string, vscode.StatusBarItem>()
}

function fillEmpty(codes: {name: string, type: string, code: string}[]): void {
    codes
        .forEach((code, i) => {
            const priority = codes.length - i
            const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority)
            item.text = `${code.name}()`
            item.show()
            items.set(code.code, item)
        })
}

function refreshStocks(codes: {name: string, type: string, code: string}[]): void {
    codes.forEach(code => {
        get(`${api}${code.code}`)
            .then(data => {
                const { name, type } = code

                if (type === 'exponent') {
                    const detail = data.split('=')[1].trim().split(',');
                    const currentNumber: number = Number(detail[1]);
                    const diff: number = Number(detail[2]);
                    const stock = items.get(code.code);

                    stock.text = `${name}(${currentNumber})`
                    if (diff > 0) {
                        stock.color = 'red';
                    } else if (diff === 0) {
                        stock.color = 'white';
                    } else {
                        stock.color = 'green';
                    }
                }
            })
            .catch(e => {
                //
            })
    })
}

function get(url): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, response => {
            let responseData = '';
            response.on('data', chunk => responseData += chunk);
            response.on('end', () => {
                if (response.statusCode === 200) {
                    resolve(responseData)
                } else {
                    reject(`failed get ${url} data`)
                }
            })
        })
    })
}

function arrayEq(arr1: any[], arr2: any[]):boolean {
    if (arr1.length !== arr2.length) return false;
    
    return !arr1.some((item, i) => item !== arr2[i]);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
