export interface PromptOptions {
  title: string
  label: string
  initial: string
}

let dialog: HTMLDialogElement | null = null

function create(): HTMLDialogElement {
  const element = document.createElement('dialog')
  element.id = 'promptDialog'
  element.className = 'prompt-dialog'
  // Enter submits with the first button, Tamam.
  element.innerHTML = `<form method="dialog">
    <h3 id="promptTitle"></h3>
    <label class="prompt-field"><span id="promptLabel"></span><input id="promptInput" autocomplete="off" spellcheck="false"></label>
    <div class="prompt-buttons">
      <button type="submit" id="promptOk" value="ok">Tamam</button>
      <button type="submit" id="promptCancel" value="cancel" formnovalidate>İptal</button>
    </div>
  </form>`
  document.body.append(element)
  return element
}

/**
 * Ask for one value, as a tool does for a radius or a side count. Resolves with the
 * typed text, or null when cancelled (İptal, Escape).
 */
export function promptValue(options: PromptOptions): Promise<string | null> {
  dialog ??= create()
  const current = dialog
  current.querySelector('#promptTitle')!.textContent = options.title
  current.querySelector('#promptLabel')!.textContent = options.label
  const input = current.querySelector<HTMLInputElement>('#promptInput')!
  input.value = options.initial
  current.returnValue = ''
  return new Promise(resolve => {
    current.addEventListener('close', () => resolve(current.returnValue === 'ok' ? input.value : null), { once: true })
    current.showModal()
    input.focus()
    input.select()
  })
}
