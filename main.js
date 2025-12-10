import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;

const CAL_URL = 'https://wos.gg/system';

async function createWindow() {
  // dynamically import electron-store only when needed
  const { default: Store } = await import('electron-store');
  const store = new Store({ name: 'settings' });

  const { width, height, x, y } = store.get('bounds', {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
  });

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    title: "Words on Stream - App Wrapper",  // verbatim string
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:calendar'   // <-- persistent partition
    },
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Increase magnification to 125%
    mainWindow.webContents.setZoomFactor(1.1);
  });

  // After the page loads, override any title changes
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault(); // stop Google Calendar from changing it
    mainWindow.setTitle("Words on Stream - App Wrapper");
  });

  mainWindow.on('close', () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      store.set('bounds', mainWindow.getBounds());
    }
  });

  mainWindow.loadURL(CAL_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Auto-refresh every 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload();
      }
    }, ONE_HOUR);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.insertCSS(`
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: #c5c5c5; border-radius: 6px; }
      `);
    });

    const template = [
      {
        label: 'App',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
          { label: 'Back', accelerator: 'Alt+Left', click: () => mainWindow.webContents.goBack() },
          { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow.webContents.goForward() },
          { type: 'separator' },
          { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.toggleDevTools() },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
          { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' },
          { role: 'selectAll' }
        ],
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    const iconPath = path.join(__dirname, 'icon.png');
    try {
      const trayIcon = nativeImage.createFromPath(iconPath);
      tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
      tray.setToolTip('Words on Stream');
      tray.on('click', () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
      });
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Show', click: () => mainWindow.show() },
        { label: 'Reload', click: () => mainWindow.reload() },
        { type: 'separator' },
        { role: 'quit' },
      ]));
    } catch (e) {
      // Tray optional
    }
  }); // <-- closes ready-to-show callback
} // <-- closes createWindow function

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
