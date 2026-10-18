import { useId, useMemo, useState } from 'react'
import type { SchoolView } from '../../lib/api'
import { Close } from '../ui/Icons'
import { capitalise } from './tierStyle'

const MAX_RESULTS = 8

/** Lower case without accents, so "mvognde" finds "Mvogndé". */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface Entry {
  school: SchoolView
  key: string
  /** Where each word of the name starts in `key`. */
  wordStarts: number[]
}

/** 0 = name starts with the text, 1 = a word starts with it, 2 = anywhere in the name, null = no match. */
function rankOf(e: Entry, q: string): number | null {
  const at = e.key.indexOf(q)
  if (at < 0) return null
  if (at === 0) return 0
  return e.wordStarts.some((i) => e.key.startsWith(q, i)) ? 1 : 2
}

interface Props {
  /** All schools, not just the filtered ones. Null while loading. */
  schools: SchoolView[] | null
  /** Select the school like a marker click. Returns a note to show (e.g. filters were cleared), or null. */
  onChoose: (id: string) => string | null
}

/**
 * "Find a school" combobox. The typed text stays in this component, so typing never re-renders the
 * Admin page or the map; only choosing a school does.
 */
export default function SchoolSearch({ schools, onChoose }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // -1: no option highlighted yet (Enter then picks the first result).
  const [active, setActive] = useState(-1)
  const [note, setNote] = useState<string | null>(null)

  // Built once per data load (not per keystroke).
  const index = useMemo<Entry[]>(
    () =>
      (schools ?? []).map((school) => {
        const key = fold(school.name)
        const wordStarts = [...key.matchAll(/\s(\S)/g)].map((m) => m.index! + 1)
        return { school, key, wordStarts }
      }),
    [schools],
  )

  const q = fold(query.trim())
  const results = useMemo(() => {
    if (!q) return []
    return index
      .flatMap((e) => {
        const rank = rankOf(e, q)
        return rank === null ? [] : [{ e, rank }]
      })
      .sort((a, b) => a.rank - b.rank || a.e.school.name.localeCompare(b.e.school.name))
      .slice(0, MAX_RESULTS)
      .map((r) => r.e.school)
  }, [index, q])

  const expanded = open && q !== '' && results.length > 0
  const optionId = (i: number) => `${id}-opt-${i}`

  function choose(school: SchoolView) {
    setQuery(school.name)
    setOpen(false)
    setNote(onChoose(school.id))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i < 0 ? (step > 0 ? 0 : results.length - 1) : (i + step + results.length) % results.length))
    } else if (e.key === 'Enter') {
      if (expanded) {
        e.preventDefault()
        choose(results[Math.max(active, 0)])
      }
    } else if (e.key === 'Escape') {
      if (expanded) setOpen(false)
      else setQuery('')
    }
  }

  return (
    <div className="school-search">
      <label htmlFor={`${id}-input`} className="school-search-label">
        Find a school
      </label>
      <div className="school-search-box">
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={schools === null ? 'Loading schools…' : 'Type a school name'}
          disabled={schools === null}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
            setNote(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="school-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setNote(null)
            }}
          >
            <Close />
          </button>
        )}
        <ul id={listId} role="listbox" aria-label="Matching schools" className="school-search-list" hidden={!expanded}>
          {expanded &&
            results.map((s, i) => (
              <li
                key={s.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={`school-search-option ${i === active ? 'is-active' : ''}`}
                // Keep focus in the input, so the list does not close before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                <span className="priority-name">{s.name}</span>
                <span className="priority-status">
                  <span className="muted small">{s.region}</span>
                  <span className="chip">{capitalise(s.status)}</span>
                </span>
              </li>
            ))}
        </ul>
        {open && q !== '' && results.length === 0 && <p className="school-search-empty">No schools match.</p>}
      </div>
      <p className="sr-only" role="status">
        {open && q !== '' ? (results.length === 0 ? 'No schools match.' : `${results.length} school${results.length === 1 ? '' : 's'} found.`) : ''}
      </p>
      {note && (
        <p className="school-search-note small" role="status">
          {note}
        </p>
      )}
    </div>
  )
}
