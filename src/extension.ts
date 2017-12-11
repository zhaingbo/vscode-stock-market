import * as vscode from 'vscode';
import * as https from 'https';
import * as moment from 'moment';

let items: Map<string, vscode.StatusBarItem>
const api = 'https://hq.sinajs.cn/list='

export function activate(context: vscode.ExtensionContext) {
    items = new Map<string, vscode.StatusBarItem>()

    const app = new StockApp(vscode.workspace.getConfiguration())

    app.initialize()

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        app.initialize()
    }))
}

class StockApp {
    now = moment()

    api = 'https://hq.sinajs.cn/list='

    defaultRefreshDuration: 1000

    config: vscode.WorkspaceConfiguration

    statusBars: {name: string, code:string, statusBar: vscode.StatusBarItem}[] = []

    indices: Map<string, {name: string, code: string}>

    constructor(config: vscode.WorkspaceConfiguration) {
        this.config = config

        this.configIndices()
    }

    initialize() {
        this.reset()

        this.initializeStatusBars()

        this.refreshIndices()

        setInterval(this.refreshIndices.bind(this), this.refreshDuration())
    }

    initializeStatusBars() {
        const configuredIndexNames = this.config.get('vscode-stocks.indices', [])
        configuredIndexNames.forEach((name, i) => {
            const index = this.indices.get(name)
            if (index) {
                const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, configuredIndexNames.length - i)
                item.text = `${index.name}...`
                item.show()
    
                this.statusBars.push({
                    name: index.name,
                    code: index.code,
                    statusBar: item
                })
            } else {
                console.log(`[debug]${name} not found`)
            }
        })
    }

    refreshIndices() {
        this.statusBars
            .forEach(item => {
                const { name, code, statusBar } = item

                httpGet(`${this.api}${code}`)
                    .then(data => {
                        const detail = data.split('=')[1].trim().split(',');
                        const currentNumber: number = Math.round(Number(detail[1]) * 100) / 100;
                        const diff: number = Number(detail[2]);
                        
                        statusBar.text = `${name}${currentNumber}`
                        if (diff > 0) {
                            statusBar.color = 'red';
                        } else if (diff === 0) {
                            statusBar.color = 'white';
                        } else {
                            statusBar.color = 'green';
                        }
                    })
                    .catch(e => {
                        console.log(e)
                    })
            })
    }

    refreshDuration() {
        return this.config.get('vscode-stocks.refreshDuration', this.defaultRefreshDuration)
    }

    configIndices() {
        this.indices = new Map<string, {name: string, code: string}>()
        this.indices.set('上证', {'name': '上证', 'code': 's_sh000001'})
        this.indices.set('创业', {'name': '创业', 'code': 's_sz399006'})
        this.indices.set('深证成指', {'name': '深证成指', 'code': 's_sz399001'})
    }

    inTradingTime() {
        return (this.now > moment().hour(9).minute(15) && this.now < moment().hour(11).minute(30)) || 
            (this.now > moment().hour(13).minute(0) && this.now < moment().hour(15).minute(0));
    }

    reset() {
        this.statusBars = []
        this.now = moment()
    }
}

function httpGet(url): Promise<string> {
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
