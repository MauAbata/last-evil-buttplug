const FridaInject = require('frida-inject');
const isDev = require('electron-is-dev');

const { ipcMain } = require('electron');
const { app, BrowserWindow } = require('electron')

const powerSaveBlocker = require('electron').powerSaveBlocker;
powerSaveBlocker.start('prevent-app-suspension');

app.commandLine.appendSwitch('page-visibility');
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

let win
let injected = false

if (process.platform === "linux"){
    app.commandLine.appendSwitch("enable-experimental-web-platform-features", true);
} else {
    app.commandLine.appendSwitch("enable-web-bluetooth", true);
}

function createWindow() {
    win = new BrowserWindow({
        width: 320,
        height: 160,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    let btCallback = null

    ipcMain.on("BT_DEVICE_CONNECT", (event, deviceId) => {
        if (btCallback) btCallback(deviceId);
        btCallback = null
    })

    win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
        event.preventDefault();
        btCallback = callback
        console.log('Device list:', deviceList);
        win.webContents.send("BT_DEVICE_SCAN", JSON.stringify(deviceList));
        // let result = deviceList[0];
        // if (!result) {
        //     callback('');
        // } else {
        //     callback(result.deviceId);
        // }
    });

    const startURL = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, 'build/index.html')}`;

    win.loadURL(startURL);
}

ipcMain.on('BIND', (event, data) => {
    const { exe = 'LastEvil.exe' } = JSON.parse(data);

    if (injected) {
        event.reply("ATTACHED")
        return
    }

    FridaInject({
        name: 'LastEvil.exe',
        scripts: [
            './mono-api'
        ],
        onAttach: session => console.log('Attached'),
        onDetach: (session, reason) => console.log('Detached'),
        onLoad: script => {
            console.log('Script loading...')
            event.reply('ATTACHED')
            injected = true;
            script.message.connect(message => {
                console.log('Message: ', message.payload)
                if (message.payload.message === 'ON_DAMAGE')
                    win && win.webContents.send("ON_DAMAGE", JSON.stringify(message.payload));
                if (message.payload.message === 'ON_ANIMATION_EVENT')
                    win && win.webContents.send("ON_ANIMATION_EVENT", JSON.stringify(message.payload));
            })
        },
        onUnload: script => console.log('Script unloaded')
    })
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})