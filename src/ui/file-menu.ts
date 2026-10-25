export interface FileMenuHandlers {
  onNew(): void
  onOpen(): void
  onSave(saveAs: boolean): void
  onExport(kind: 'png' | 'svg'): void
}

/** The toolbar's file menu: opens on click, closes on a press outside, a choice or Escape. */
export function createFileMenu(button: HTMLButtonElement, handlers: FileMenuHandlers): void {
  const wrapper = document.createElement('div')
  wrapper.className = 'file-menu-wrapper'
  wrapper.id = 'fileMenuWrapper'
  button.replaceWith(wrapper)
  wrapper.append(button)
  const menu = document.createElement('div')
  menu.id = 'fileMenu'
  menu.className = 'file-menu'
  menu.setAttribute('role', 'menu')
  menu.setAttribute('aria-label', 'Dosya')
  menu.hidden = true
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  wrapper.append(menu)
  const setOpen = (open: boolean) => {
    menu.hidden = !open
    button.setAttribute('aria-expanded', String(open))
  }
  button.addEventListener('click', () => setOpen(menu.hidden !== false))
  document.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Node) || !wrapper.contains(event.target)) setOpen(false)
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false)
  })
  const heading = (text: string) => {
    const title = document.createElement('h3')
    title.textContent = text
    menu.append(title)
  }
  const item = (id: string, caption: string, shortcut: string, action: () => void) => {
    const entry = document.createElement('button')
    entry.type = 'button'
    entry.id = id
    entry.className = 'menu-item'
    entry.setAttribute('role', 'menuitem')
    entry.append(caption)
    if (shortcut) {
      const hint = document.createElement('kbd')
      hint.textContent = shortcut
      entry.append(hint)
    }
    entry.addEventListener('click', () => {
      setOpen(false)
      action()
    })
    menu.append(entry)
  }
  heading('Belge')
  item('fileNew', 'Yeni', '', handlers.onNew)
  item('fileOpen', 'Aç…', 'Ctrl+O', handlers.onOpen)
  item('fileSave', 'Kaydet', 'Ctrl+S', () => handlers.onSave(false))
  item('fileSaveAs', 'Farklı Kaydet…', 'Ctrl+Shift+S', () => handlers.onSave(true))
  heading('Dışa Aktar')
  item('fileExportPng', 'Görüntüyü PNG olarak kaydet', '', () => handlers.onExport('png'))
  item('fileExportSvg', 'Görüntüyü SVG olarak kaydet', '', () => handlers.onExport('svg'))
}
