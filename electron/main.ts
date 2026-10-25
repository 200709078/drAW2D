import { app, BrowserWindow, dialog, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const indexPath = fileURLToPath(new URL('../dist/index.html', import.meta.url))
const preloadPath = fileURLToPath(new URL('./preload.cjs', import.meta.url))
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

function senderWindow(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

/** The renderer draws its own title bar; these channels back its window buttons. */
function registerWindowControls(): void {
  ipcMain.on('window:minimize', event => senderWindow(event)?.minimize())
  ipcMain.on('window:toggle-maximize', event => {
    const window = senderWindow(event)
    if (!window) return
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  })
  ipcMain.on('window:toggle-fullscreen', event => {
    const window = senderWindow(event)
    window?.setFullScreen(!window.isFullScreen())
  })
  ipcMain.on('window:set-fullscreen', (event, enabled: unknown) => senderWindow(event)?.setFullScreen(enabled === true))
  ipcMain.on('window:close', event => senderWindow(event)?.close())
  ipcMain.handle('window:is-maximized', event => senderWindow(event)?.isMaximized() ?? false)
  ipcMain.handle('window:is-fullscreen', event => senderWindow(event)?.isFullScreen() ?? false)
}

type FileKind = 'drw2' | 'png' | 'svg'

const FILTERS: Readonly<Record<FileKind, Electron.FileFilter>> = {
  drw2: { name: 'drAW2D belgesi', extensions: ['drw2'] },
  png: { name: 'PNG görüntüsü', extensions: ['png'] },
  svg: { name: 'SVG çizimi', extensions: ['svg'] },
}

const isKind = (value: unknown): value is FileKind => typeof value === 'string' && value in FILTERS
const isName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length < 256

/** Paths the user picked in a dialog this session; the renderer may write only to these. */
const grantedPaths = new Set<string>()

function withExtension(file: string, kind: FileKind): string {
  return path.extname(file).toLowerCase() === `.${kind}` ? file : `${file}.${kind}`
}

async function askSavePath(event: IpcMainInvokeEvent, name: string, kind: FileKind): Promise<string | null> {
  const window = senderWindow(event)
  const options = { defaultPath: path.basename(name), filters: [FILTERS[kind]] }
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  const file = withExtension(result.filePath, kind)
  grantedPaths.add(file)
  return file
}

/** Opening and saving documents and exports through native dialogs. */
function registerFiles(): void {
  ipcMain.handle('file:open', async event => {
    const window = senderWindow(event)
    const options: Electron.OpenDialogOptions = { properties: ['openFile'], filters: [FILTERS.drw2] }
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    const file = result.canceled ? undefined : result.filePaths[0]
    if (!file) return null
    grantedPaths.add(file)
    return { path: file, name: path.basename(file), text: await readFile(file, 'utf8') }
  })
  ipcMain.handle('file:save', async (event, text: unknown, current: unknown, name: unknown) => {
    if (typeof text !== 'string' || !isName(name)) return null
    const file = typeof current === 'string' && grantedPaths.has(current) ? current : await askSavePath(event, name, 'drw2')
    if (!file) return null
    await writeFile(file, text, 'utf8')
    return { path: file, name: path.basename(file) }
  })
  ipcMain.handle('file:export', async (event, data: unknown, name: unknown, kind: unknown) => {
    if (!(typeof data === 'string' || data instanceof Uint8Array) || !isName(name) || !isKind(kind) || kind === 'drw2') return null
    const file = await askSavePath(event, name, kind)
    if (!file) return null
    await writeFile(file, data)
    return path.basename(file)
  })
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    title: 'drAW2D | mADEMatik',
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#ffffff',
    icon: iconPath,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    fullscreenable: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  window.on('maximize', () => window.webContents.send('window:maximize-changed', true))
  window.on('unmaximize', () => window.webContents.send('window:maximize-changed', false))
  window.on('enter-full-screen', () => window.webContents.send('window:fullscreen-changed', true))
  window.on('leave-full-screen', () => window.webContents.send('window:fullscreen-changed', false))
  // F11 is handled here so the renderer does not toggle a second time.
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault()
      window.setFullScreen(!window.isFullScreen())
    }
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
  registerWindowControls()
  registerFiles()
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
