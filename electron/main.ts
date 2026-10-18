import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'

const indexPath = fileURLToPath(new URL('../dist/index.html', import.meta.url))
const devServerUrl = app.isPackaged ? undefined : process.env.DRAW2D_DEV_SERVER_URL
const iconPath = fileURLToPath(new URL(
  devServerUrl ? '../public/img/app-icon.png' : '../dist/img/app-icon.png',
  import.meta.url,
))

function openExternal(url: string): void {
  const protocol = new URL(url).protocol
  if (protocol === 'https:' || protocol === 'http:') {
    void shell.openExternal(url).catch(console.error)
  }
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    title: 'drAW2D',
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#ffffff',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      openExternal(url)
    }
  })

  if (devServerUrl) {
    await window.loadURL(devServerUrl)
  } else {
    await window.loadFile(indexPath)
  }
}

void app.whenReady().then(async () => {
  app.setAppUserModelId('com.madematik.draw2d')
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow().catch(console.error)
    }
  })
}).catch((error: unknown) => {
  console.error(error)
  app.quit()
  process.exitCode = 1
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
