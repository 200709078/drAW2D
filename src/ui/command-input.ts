const PAIRS: Readonly<Record<string, string>> = { '(': ')', '[': ']', '{': '}' }

/** Insert the closing bracket around the selection; Backspace removes an empty pair. */
function handleBrackets(event: KeyboardEvent, input: HTMLInputElement): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  const value = input.value
  const close = PAIRS[event.key]
  if (close) {
    event.preventDefault()
    input.value = value.slice(0, start) + event.key + value.slice(start, end) + close + value.slice(end)
    input.setSelectionRange(start + 1, end + 1)
    return
  }
  if (event.key === 'Backspace' && start === end) {
    const previous = value[start - 1]
    if (previous !== undefined && PAIRS[previous] !== undefined && value[start] === PAIRS[previous]) {
      event.preventDefault()
      input.value = value.slice(0, start - 1) + value.slice(start + 1)
      input.setSelectionRange(start - 1, start - 1)
    }
  }
}

/** Enter submits non-empty text; IME composition and modified keys keep their native meaning. */
export function bindCommandInput(input: HTMLInputElement, submit: (source: string) => void): void {
  input.addEventListener('keydown', event => {
    // keyCode 229 marks composition in browsers that do not set isComposing.
    if (event.isComposing || event.keyCode === 229) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    handleBrackets(event, input)
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!input.value.trim()) return
    submit(input.value)
    input.value = ''
  })
}
