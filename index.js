const FridaInject = require('frida-inject');
const isDev = require('electron-is-dev');
const path = require('path');

const { ipcMain } = require('electron');
const { app, BrowserWindow } = require('electron')

const powerSaveBlocker = require('electron').powerSaveBlocker;
powerSaveBlocker.start('prevent-app-suspension');

app.commandLine.appendSwitch('page-visibility');
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");

let win
let injected = false


// Check if we're in an installer, and bail out after handling
// installer-y things.
if (handleSquirrelEvent()) {
    return;
}

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

/**
 * Handle Squirrel installer events for Windows.
 */
function handleSquirrelEvent() {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
        } catch (e) {}

        return spawnedProcess;
    }

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    }

    const squirrelEvent = process.argv[1];
    switch(squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Here you do things like:
            // Update PATH
            // Write to registry for file assoc *.led etc

            // Create desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo everything done above

            // Remove desktop and start shortcuts
            spawnUpdate(['--removeShortcut', exeName]);
            setTimeout(app.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // Anything to be done before the old version of
            // an app is retired?

            app.quit();
            return true;
    }
}