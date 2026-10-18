import { useMemo, useState, type FormEvent } from 'react'
import LearnShell from '../components/learn/LearnShell'
import ProgressSyncNote from '../components/learn/ProgressSyncNote'
import { Arrow, ArrowLeft, Check } from '../components/ui/Icons'
import {
  MASTERY_PERCENT,
  NAME_MAX,
  findStudent,
  markLessonDone,
  nameError,
  recordAttempt,
  signIn,
  signOut,
  similarStudents,
  summariseStudent,
  type Student,
} from '../lib/learning'
import type { CoursePack, Lesson } from '../lib/types'
import { useLearning } from '../lib/useLearning'

type View = { page: 'course' } | { page: 'lesson'; lessonId: string } | { page: 'quiz' }

export default function StudentPage() {
  const { current, pack } = useLearning()
  const [view, setView] = useState<View>({ page: 'course' })

  return (
    <LearnShell role="student">
      {!current ? (
        <StartScreen onStart={() => setView({ page: 'course' })} />
      ) : view.page === 'lesson' && pack.lessons.some((l) => l.id === view.lessonId) ? (
        <LessonView
          key={view.lessonId}
          student={current}
          pack={pack}
          lesson={pack.lessons.find((l) => l.id === view.lessonId)!}
          onOpen={(lessonId) => setView({ page: 'lesson', lessonId })}
          onBack={() => setView({ page: 'course' })}
        />
      ) : view.page === 'quiz' ? (
        <Quiz student={current} pack={pack} onBack={() => setView({ page: 'course' })} />
      ) : (
        <CourseView
          student={current}
          pack={pack}
          onOpenLesson={(lessonId) => setView({ page: 'lesson', lessonId })}
          onQuiz={() => setView({ page: 'quiz' })}
        />
      )}
    </LearnShell>
  )
}

// ---------- start: "What's your name?" ----------

const RECENT_COUNT = 6

function StartScreen({ onStart }: { onStart: () => void }) {
  const { students } = useLearning()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const exact = name.trim() ? findStudent(name) : undefined
  const similar = useMemo(() => similarStudents(name, students).slice(0, 3), [name, students])
  const recent = useMemo(
    () => [...students].sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt)).slice(0, RECENT_COUNT),
    [students],
  )

  function start(asName: string) {
    const err = nameError(asName)
    setError(err)
    if (err) return
    try {
      signIn(asName)
      onStart()
    } catch {
      setError('This device is out of storage space. Ask your teacher.')
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    start(name)
  }

  return (
    <form className="card learn-start" onSubmit={submit} noValidate>
      <label htmlFor="student-name" className="learn-start-label">
        What's your name?
      </label>
      <input
        id="student-name"
        type="text"
        autoComplete="off"
        maxLength={NAME_MAX + 10}
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        aria-invalid={error !== null}
        aria-describedby="name-help"
      />
      {error ? (
        <p className="field-error" id="name-help">
          {error}
        </p>
      ) : (
        <p className="muted small" id="name-help">
          {exact ? `Welcome back, ${exact.name}! Start to continue.` : 'Letters, spaces, hyphens and apostrophes.'}
        </p>
      )}

      {!exact &&
        similar.map((s) => (
          <button key={s.id} type="button" className="suggestion" onClick={() => start(s.name)}>
            Continue as <strong>{s.name}</strong>?
          </button>
        ))}

      <button type="submit" className="btn-primary btn-block btn-big">
        Start <Arrow />
      </button>

      {recent.length > 0 && (
        <div>
          <p className="muted small">Already learning on this device? Tap your name.</p>
          <div className="quick-names">
            {recent.map((s) => (
              <button key={s.id} type="button" onClick={() => start(s.name)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}

// ---------- course: lessons and quiz ----------

interface CourseProps {
  student: Student
  pack: CoursePack
  onOpenLesson: (id: string) => void
  onQuiz: () => void
}

function CourseView({ student, pack, onOpenLesson, onQuiz }: CourseProps) {
  const summary = summariseStudent(student, pack)
  const done = new Set(student.lessonsDone)

  return (
    <div className="card learn-course">
      <div className="panel-head">
        <h2 className="greeting">Hi {student.name}!</h2>
        <button type="button" className="btn-link" onClick={signOut}>
          Not you? Switch student
        </button>
      </div>
      <ProgressBar
        value={summary.lessonsDone}
        max={pack.lessons.length}
        label={`${summary.lessonsDone} of ${pack.lessons.length} lessons done`}
      />
      <p className="muted small">
        {summary.lessonsDone === pack.lessons.length
          ? 'All lessons done. Dream big: try the quiz!'
          : summary.lessonsDone === 0
            ? 'Start with lesson 1. You can do it!'
            : 'Great progress. Keep going!'}
      </p>

      <ul className="lesson-list">
        {pack.lessons.map((l, i) => (
          <li key={l.id}>
            <button type="button" className="picker-row" onClick={() => onOpenLesson(l.id)}>
              <span className={`tick ${done.has(l.id) ? 'is-done' : ''}`} aria-hidden="true">
                {done.has(l.id) ? '✓' : i + 1}
              </span>
              <span className="picker-main">
                <span className="picker-name">{l.title}</span>
              </span>
              <span className="lesson-go">{done.has(l.id) ? 'Done' : <Arrow className="arrow-red" />}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="picker-row" onClick={onQuiz}>
            <span className={`tick ${summary.mastered ? 'is-done' : ''}`} aria-hidden="true">
              ?
            </span>
            <span className="picker-main">
              <span className="picker-name">Quiz ({pack.quiz.length} questions)</span>
              <span className="muted small">
                {summary.best === null
                  ? `Score ${MASTERY_PERCENT}% or more to master it`
                  : `Best score ${summary.best}%${summary.mastered ? ' · Mastered' : ''}`}
              </span>
            </span>
            <span className="lesson-go">
              <Arrow className="arrow-red" />
            </span>
          </button>
        </li>
      </ul>

      <ProgressSyncNote />
    </div>
  )
}

interface LessonProps {
  student: Student
  pack: CoursePack
  lesson: Lesson
  onOpen: (id: string) => void
  onBack: () => void
}

function LessonView({ student, pack, lesson, onOpen, onBack }: LessonProps) {
  const isDone = student.lessonsDone.includes(lesson.id)
  const next = pack.lessons[pack.lessons.findIndex((l) => l.id === lesson.id) + 1]

  return (
    <div className="card learn-lesson">
      <button type="button" className="btn-link" onClick={onBack}>
        <ArrowLeft /> All lessons
      </button>
      <h2 className="lesson-title">{lesson.title}</h2>
      <p className="lesson-tip">{lesson.tip}</p>

      {lesson.rows && (
        <ul className="fact-grid">
          {lesson.rows.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {lesson.tryThese && (
        <ul className="try-list">
          {lesson.tryThese.map((t) => (
            <li key={t.q}>
              <details>
                <summary>{t.q} = ?</summary>
                <strong>{t.a}</strong>
              </details>
            </li>
          ))}
        </ul>
      )}

      {isDone ? (
        <div className="save-result is-uploaded" role="status">
          <span className="save-result-icon" aria-hidden="true">
            <Check size={28} strokeWidth={3} />
          </span>
          <div>
            <strong>Lesson done. Well done!</strong>
            <p>Your progress is saved on this device.</p>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-primary btn-block btn-big" onClick={() => markLessonDone(student.id, lesson.id)}>
          I've done this lesson <Check strokeWidth={3} />
        </button>
      )}

      {isDone && (
        <button type="button" className="btn-primary btn-block btn-big" onClick={() => (next ? onOpen(next.id) : onBack())}>
          {next ? `Next: ${next.title}` : 'Back to lessons'} <Arrow />
        </button>
      )}
    </div>
  )
}

// ---------- quiz: one question at a time ----------

const PRAISE = ['Correct! Great work.', 'Yes! Well done.', 'Correct! You are a star.', 'Right! Keep it up.']

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="progress">
      <div className="progress-label">{label}</div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className="progress-fill" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function Quiz({ student, pack, onBack }: { student: Student; pack: CoursePack; onBack: () => void }) {
  // Keep the questions this attempt started with, even if the pack updates mid-quiz.
  const [questions] = useState(pack.quiz)
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = questions[index]

  function choose(i: number) {
    if (chosen !== null) return
    setChosen(i)
    if (i === q.answerIndex) setCorrect((c) => c + 1)
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setChosen(null)
      return
    }
    recordAttempt(student.id, correct, questions.length)
    setFinished(true)
  }

  if (finished) {
    const percent = Math.round((correct / questions.length) * 100)
    const mastered = percent >= MASTERY_PERCENT
    return (
      <div className="card learn-quiz">
        <p className="eyebrow eyebrow-dark">Quiz finished</p>
        <p className="quiz-score">
          {correct} / {questions.length}
          <span className="quiz-score-pct">{percent}%</span>
        </p>
        <div className={`save-result ${mastered ? 'is-uploaded' : 'is-queued'}`} role="status">
          <div>
            <strong>
              {mastered
                ? 'Mastered! Dream big: you did it.'
                : `Good effort! Practise the lessons and try again. You need ${MASTERY_PERCENT}% to master it.`}
            </strong>
            <p>Your progress is saved on this device.</p>
          </div>
        </div>
        <button type="button" className="btn-primary btn-block btn-big" onClick={onBack}>
          Back to lessons <Arrow />
        </button>
        <ProgressSyncNote />
      </div>
    )
  }

  const answered = chosen !== null
  const right = chosen === q.answerIndex

  return (
    <div className="card learn-quiz">
      <button type="button" className="btn-link" onClick={onBack}>
        <ArrowLeft /> Leave quiz
      </button>
      <ProgressBar value={index + (answered ? 1 : 0)} max={questions.length} label={`Question ${index + 1} of ${questions.length}`} />
      <h2 className="quiz-question">{q.question}</h2>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          const state = !answered ? '' : i === q.answerIndex ? 'is-right' : i === chosen ? 'is-wrong' : ''
          return (
            <button key={i} type="button" className={`quiz-option ${state}`} onClick={() => choose(i)} disabled={answered}>
              {opt}
            </button>
          )
        })}
      </div>
      {answered && (
        <>
          <p className={`quiz-feedback ${right ? 'is-right' : 'is-wrong'}`} role="status">
            {right ? (
              <>
                <Check size={24} strokeWidth={3} /> {PRAISE[index % PRAISE.length]}
              </>
            ) : (
              `Good try! The answer is ${q.options[q.answerIndex]}. You'll get the next one.`
            )}
          </p>
          <button type="button" className="btn-primary btn-block btn-big" onClick={next} autoFocus>
            {index + 1 < questions.length ? 'Next question' : 'See my score'} <Arrow />
          </button>
        </>
      )}
    </div>
  )
}
