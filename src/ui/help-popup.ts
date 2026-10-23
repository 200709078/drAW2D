const MAX_SUGGESTIONS = 8

interface Suggestion {
  command: string
  topic: string
  searchText: string
}

const normalize = (text: string) => text.trim().toLocaleLowerCase('tr-TR')

export interface HelpPopupOptions {
  input: HTMLInputElement
  /** An example was chosen: make the command input visible and focus it. */
  onExample(command: string): void
}

/**
 * The help popup turns its static H4 sections into searchable accordions on first open.
 * The same examples feed the command input's suggestions.
 */
export function createHelpPopup({ input, onExample }: HelpPopupOptions): { open(): void; close(): void } {
  const popup = document.getElementById('help-popup')
  const header = document.getElementById('help-header')
  const section = document.querySelector<HTMLElement>('.help-section')
  let search: HTMLInputElement | null = null
  let suggestions: Suggestion[] | null = null

  const close = () => {
    if (popup) popup.style.display = 'none'
  }

  function filter(query: string): void {
    const normalized = normalize(query)
    for (const topic of document.querySelectorAll<HTMLDetailsElement>('.help-topic')) {
      const matches = !normalized || normalize(topic.textContent ?? '').includes(normalized)
      topic.hidden = !matches
      if (normalized && matches) topic.open = true
    }
  }

  function buildAccordion(): void {
    if (!popup || !header || !section || search) return
    const wrap = document.createElement('div')
    wrap.className = 'help-search'
    search = document.createElement('input')
    search.id = 'helpSearch'
    search.type = 'search'
    search.placeholder = 'Komut ara...'
    search.autocomplete = 'off'
    search.addEventListener('input', () => filter(search!.value))
    wrap.append(search)
    header.after(wrap)

    section.classList.add('is-accordion-ready')
    const titles = Array.from(section.children).filter(child => child.tagName === 'H4')
    titles.forEach((title, index) => {
      const details = document.createElement('details')
      details.className = 'help-topic'
      details.open = index === 0
      const summary = document.createElement('summary')
      summary.textContent = title.textContent
      const body = document.createElement('div')
      body.className = 'help-topic-body'
      for (let next = title.nextElementSibling; next && next.tagName !== 'H4';) {
        const current = next
        next = next.nextElementSibling
        body.append(current)
      }
      details.append(summary, body)
      title.replaceWith(details)
    })
    popup.addEventListener('click', event => {
      if (event.target === popup) close()
    })
  }

  function open(): void {
    buildAccordion()
    if (popup) popup.style.display = 'flex'
    input.value = ''
    if (search) {
      search.value = ''
      filter('')
      search.focus()
    }
  }

  function suggestionItems(): Suggestion[] {
    if (suggestions) return suggestions
    const unique = new Map<string, Suggestion>()
    for (const example of document.querySelectorAll('code.example')) {
      const command = example.textContent?.trim() ?? ''
      if (!command || unique.has(command)) continue
      // Before the accordion exists, the nearest preceding H4 names the topic.
      let heading: Element | null = example.closest('pre')
      while (heading && heading.tagName !== 'H4') heading = heading.previousElementSibling
      const topic = (example.closest('.help-topic')?.querySelector('summary') ?? heading)?.textContent?.trim() ?? ''
      unique.set(command, { command, topic, searchText: normalize(`${command} ${topic}`) })
    }
    suggestions = Array.from(unique.values())
    return suggestions
  }

  const box = document.createElement('div')
  box.id = 'commandSuggestions'
  box.className = 'command-suggestions'
  box.hidden = true
  input.insertAdjacentElement('afterend', box)

  function renderSuggestions(): void {
    const query = normalize(input.value)
    const matches = query ? suggestionItems().filter(item => item.searchText.includes(query)).slice(0, MAX_SUGGESTIONS) : []
    if (!matches.length) {
      box.hidden = true
      return
    }
    box.replaceChildren(...matches.map(item => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'command-suggestion'
      const command = document.createElement('span')
      command.textContent = item.command
      button.append(command)
      if (item.topic) {
        const topic = document.createElement('small')
        topic.textContent = item.topic
        button.append(topic)
      }
      // Keep focus in the input while choosing.
      button.addEventListener('mousedown', event => event.preventDefault())
      button.addEventListener('click', () => {
        input.value = item.command
        box.hidden = true
        input.focus()
      })
      return button
    }))
    box.hidden = false
  }

  input.addEventListener('input', renderSuggestions)
  input.addEventListener('focus', renderSuggestions)
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Enter') box.hidden = true
  })
  document.addEventListener('click', event => {
    if (event.target !== input && !(event.target instanceof Element && event.target.closest('#commandSuggestions'))) box.hidden = true
  })

  document.querySelector('.help-close')?.addEventListener('click', close)
  for (const example of document.querySelectorAll('.example')) {
    example.addEventListener('click', () => {
      close()
      onExample(example.textContent?.trim() ?? '')
    })
  }

  return { open, close }
}
