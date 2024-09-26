import { THomework, TScheduleDay, TStudent } from "../clients/DnevnikClientTypes"

const SPECIAL_CHARS = ['\\', '_', '*', '[', ']', '(', ')', '~', '`', '>', '<', '&', '#', '+', '-', '=', '|', '{', '}', '.', '!']

// escape markdown
export function escMd(text: string) {
  SPECIAL_CHARS.forEach(char => (text = text.replaceAll(char, `\\${char}`)))
  return text
}

function formatTime(hour: number, minute: number) {
  const formattedHour = String(hour).toString().padStart(2, '0')
  const formattedMinute = String(minute).toString().padStart(2, '0')
  return `${formattedHour}:${formattedMinute}`
}

export function formatStudentMainMenuTitle(student: TStudent) {
  return `*${student.firstName} ${student.lastName}* · ${student.orgName}, ${student.className}`
}

export function formatScheduleDay(day: TScheduleDay) {
  return escMd(day.scheduleDayLessonModels.map((lesson) => `${lesson.number}. ${formatTime(lesson.beginHour, lesson.beginMinute)}..${formatTime(lesson.endHour, lesson.endMinute)} · ${lesson.lessonName}, ${lesson.room}`).join('\n'))
}

export function formatHomeworkItem(hw: THomework) {
  return `${escMd(`${hw.isDone ? '🟢' : '🔴'} Урок ${String(hw.lessonNumber)}`)}, *${escMd(hw.lessonName)}*\n>${escMd(hw.description)}||`
}
