import { TransportAdapter } from './types'
import { TStudent, TScheduleDay, THomework, TEstimateResultYearGradesTableLessonGrade } from '../clients/dnevnik/DnevnikClientTypes'
import { isNil, round } from 'lodash'

export function formatTime (hour: number, minute: number) {
  const formattedHour = String(hour).toString().padStart(2, '0')
  const formattedMinute = String(minute).toString().padStart(2, '0')
  return `${formattedHour}:${formattedMinute}`
}

export function formatFileSize (size: number): string {
  var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

export function formatStudentMainMenuTitle (student: TStudent, transport: TransportAdapter): string {
  return `${transport.bold(`${student.firstName} ${student.lastName}`)} · ${student.orgName}, ${student.className}`
}

export function formatScheduleDay (day: TScheduleDay, transport: TransportAdapter): string {
  return transport.escape(day.scheduleDayLessonModels.map((lesson) => `${lesson.number}. ${(!isNil(lesson.beginHour) && !isNil(lesson.beginMinute) && !isNil(lesson.endHour) && !isNil(lesson.endMinute)) ? `${formatTime(lesson.beginHour, lesson.beginMinute)}..${formatTime(lesson.endHour, lesson.endMinute)} · ` : ``}${lesson.lessonName}, ${lesson.room}`).join('\n'))
}

export function formatHomeworkItem (hw: THomework, transport: TransportAdapter): string {
  const attachments = hw.homeWorkFiles.length === 0
    ? ''
    : `\nФайлы: ${hw.homeWorkFiles.map((f) => `${transport.escape(f.name)} (${transport.escape(formatFileSize(f.size))})`).join(', ')}`
  return `${transport.escape(`${hw.isDone ? '🟢' : '🔴'} Урок ${String(hw.lessonNumber)}`)}, ${transport.bold(hw.lessonName)}\n>${transport.escape(hw.description)}||${attachments}`
}

export function formatYearGradesLesson (l: TEstimateResultYearGradesTableLessonGrade, transport: TransportAdapter): string {
  const finalStr = l.finallyGrade || l.yearGrade
    ? [
      l.yearGrade && `Год ${transport.bold(String(l.yearGrade))}`,
      l.testGrade && `Тест ${transport.bold(String(l.testGrade))}`,
      l.finallyGrade && `Итог ${transport.bold(String(l.finallyGrade))}`,
    ].filter(Boolean).join(', ')
    : null
  return `${transport.escape(l.lesson.name)}\n${l.grades.map((g) => g.finallygrade ? transport.bold(String(g.finallygrade)) : transport.escape(`${round(g.averageGrade, 2).toString()}/${round(g.averageWeightedGrade, 2).toString()}`)).join(' · ')}${finalStr ? ` ⋯ ${finalStr}` : ''}`
}
