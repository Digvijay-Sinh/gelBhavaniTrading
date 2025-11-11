const { app, BrowserWindow, ipcMain } = require('electron');

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },

    });

    win.loadFile('index.html');

    ipcMain.on('navigate', (event, page) => {
        win.loadFile(page);
    });
}

app.whenReady().then(createWindow);