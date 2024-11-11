import { isNil } from "lodash"
import { THomework, TScheduleDay, TStudent } from "../clients/dnevnik/DnevnikClientTypes"

const SPECIAL_CHARS = ['\\', '_', '*', '[', ']', '(', ')', '~', '`', '>', '<', '&', '#', '+', '-', '=', '|', '{', '}', '.', '!']

// escape markdown
export function escMd (text: string) {
  SPECIAL_CHARS.forEach(char => (text = text.replaceAll(char, `\\${char}`)))
  return text
}

export function formatTime (hour: number, minute: number) {
  const formattedHour = String(hour).toString().padStart(2, '0')
  const formattedMinute = String(minute).toString().padStart(2, '0')
  return `${formattedHour}:${formattedMinute}`
}

export function formatFileSize (size: number): string {
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

export function formatStudentMainMenuTitle (student: TStudent) {
  return `*${student.firstName} ${student.lastName}* · ${student.orgName}, ${student.className}`
}

export function formatScheduleDay (day: TScheduleDay) {
  return escMd(day.scheduleDayLessonModels.map((lesson) => `${lesson.number}. ${(!isNil(lesson.beginHour) && !isNil(lesson.beginMinute) && !isNil(lesson.endHour) && !isNil(lesson.endMinute)) ? `${formatTime(lesson.beginHour, lesson.beginMinute)}..${formatTime(lesson.endHour, lesson.endMinute)} · ` : ``}${lesson.lessonName}, ${lesson.room}`).join('\n'))
}

export function formatHomeworkItem (hw: THomework) {
  const attachments = hw.homeWorkFiles.length === 0
    ? ''
    : `\nФайлы: ${hw.homeWorkFiles.map((f) => `${escMd(f.name)} \\(${escMd(formatFileSize(f.size))}\\)`).join(', ')}`
  return `${escMd(`${hw.isDone ? '🟢' : '🔴'} Урок ${String(hw.lessonNumber)}`)}, *${escMd(hw.lessonName)}*\n>${escMd(hw.description)}||${attachments}`
}
