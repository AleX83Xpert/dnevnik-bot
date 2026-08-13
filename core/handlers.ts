import { KeystoneContext } from '@keystone-6/core/types'
import dayjs from 'dayjs'
import { chunk, lowerCase, round } from 'lodash'
import { BotContext, InlineKeyboard } from './types'
import { fetchFromDnevnik } from './fetcher'
import { findOrCreateUser, findUser, updateUserTokens, clearUserTokens } from './userRepo'
import { DnevnikClient } from '../clients/dnevnik/DnevnikClient'
import { DnevnikClientExternalServerError, DnevnikClientUnauthorizedError } from '../clients/dnevnik/DnevnikClientErrors'
import { getTokenExpirationDate } from '../utils/jwt'
import { getLogger } from '../utils/logger'
import { formatStudentMainMenuTitle, formatScheduleDay, formatHomeworkItem, formatYearGradesLesson } from './formatters'
import { TEstimatePeriod } from '../clients/dnevnik/DnevnikClientTypes'

const logger = getLogger('handlers')

// ─── Helpers ───

function getSelectedStudent (ctx: BotContext) {
  return ctx.session.students.find((student) => student.id === ctx.session.selectedStudentId)
}

function getSelectedStudentName (ctx: BotContext) {
  const student = getSelectedStudent(ctx)
  if (!!student) {
    return `${student.firstName} ${student.lastName}`
  } else {
    return '??? В контексте нет выбранного ученика'
  }
}

function buildMainMenuKeyboard (ctx: BotContext): InlineKeyboard {
  const buttons: { text: string; callbackId: string }[][] = [
    [
      { text: '📅 Расписание', callbackId: 'menu_schedule' },
      { text: '📚 ДЗ', callbackId: 'menu_homework' },
      { text: '📊 Оценки', callbackId: 'menu_grades' },
    ],
  ]

  if (ctx.session.students.length > 1) {
    buttons.push([{ text: '◀️ Выбрать другого ученика', callbackId: 'menu_select_student' }])
  }

  return { buttons }
}

function scheduleMenu (): InlineKeyboard {
  return {
    buttons: [
      [
        { text: '😴 Сегодня', callbackId: 'schedule_today' },
        { text: '🤨 Завтра', callbackId: 'schedule_tomorrow' },
      ],
      [
        { text: '🫩 Эта неделя', callbackId: 'schedule_this_week' },
        { text: '🫠 След. неделя', callbackId: 'schedule_next_week' },
      ],
      [
        { text: '◀️ Назад', callbackId: 'menu_back' },
      ],
    ],
  }
}

function homeworkMenu (): InlineKeyboard {
  return {
    buttons: [
      [
        { text: '😳 Сегодня', callbackId: 'homework_today' },
        { text: '😲 Завтра', callbackId: 'homework_tomorrow' },
      ],
      [
        { text: '🫣 Эта неделя', callbackId: 'homework_this_week' },
        { text: '😵 След. неделя', callbackId: 'homework_next_week' },
      ],
      [
        { text: '◀️ Назад', callbackId: 'menu_back' },
      ],
    ],
  }
}

// ─── Enter handlers ───

export async function enterAuthRequired (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  // This state is handled by onStart/onSendTokens, not a menu
}

export async function enterSelectStudent (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const studentsResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'students' } })

  if (studentsResult && studentsResult.students) {
    if (!studentsResult.isParent) {
      await ctx.transport.removeKeyboard('Ой ой, кажется вы подключили не родительскую учетную запись. Есть вероятность что что-то не сработает. Но почему бы и не попробовать, верно?')
    }

    ctx.session.students = studentsResult.students
    if (studentsResult.students.length === 1) {
      ctx.session.selectedStudentId = studentsResult.students[0].id
      await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: studentsResult.students[0].id }, true)
    } else {
      const keyboard: InlineKeyboard = {
        buttons: studentsResult.students.map((student) => [{ text: `${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, callbackId: `select_${student.id}` }]),
      }
      await ctx.transport.reply('Выберите ученика:', keyboard)
    }
  } else {
    await ctx.transport.reply('🙀 Не удалось получить список учеников. Попробуйте начать сначала: /start.')
  }
}

export async function enterMainMenu (godContext: KeystoneContext, ctx: BotContext, needNewMessage = false): Promise<void> {
  const student = getSelectedStudent(ctx)

  if (student) {
    const msg = formatStudentMainMenuTitle(student, ctx.transport)
    const keyboard = buildMainMenuKeyboard(ctx)

    const ref = ctx.transport.getMessageRef()
    if (ref && !needNewMessage) {
      await ctx.transport.editText(ref, msg, keyboard)
    } else {
      const newRef = await ctx.transport.reply(msg, keyboard)
      ctx.transport.setMessageRef(newRef)
    }
  } else {
    await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
  }
}

export async function enterScheduleMenu (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)

  if (student) {
    const msg = `${ctx.transport.bold(`${student.firstName} ${student.lastName}`)} · Расписание`
    const ref = ctx.transport.getMessageRef()
    if (ref) {
      await ctx.transport.editText(ref, msg, scheduleMenu())
    } else {
      const newRef = await ctx.transport.reply(msg, scheduleMenu())
      ctx.transport.setMessageRef(newRef)
    }
  } else {
    await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
  }
}

export async function enterHomeworkMenu (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)

  if (student) {
    const msg = `${ctx.transport.bold(`${student.firstName} ${student.lastName}`)} · Домашнее задание`
    const ref = ctx.transport.getMessageRef()
    if (ref) {
      await ctx.transport.editText(ref, msg, homeworkMenu())
    } else {
      const newRef = await ctx.transport.reply(msg, homeworkMenu())
      ctx.transport.setMessageRef(newRef)
    }
  } else {
    await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
  }
}

export async function enterGradesMenu (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)

  if (student) {
    const yearsResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'estimateYears', params: { studentId: student.id } } })
    if (yearsResult) {
      const schoolYear = yearsResult.currentYear.id

      const data = await Promise.all([
        fetchFromDnevnik({ godContext, ctx, request: { action: 'estimatePeriods', params: { studentId: student.id, schoolYear } } }),
        fetchFromDnevnik({ godContext, ctx, request: { action: 'classes', params: { studentId: student.id, schoolYear } } }),
      ])

      if (data && data[0] && data[1] && data[0].periods && data[1].currentClass) {
        const periods = data[0].periods
        const classId = data[1].currentClass.value

        const msg = `${ctx.transport.bold(`${student.firstName} ${student.lastName}`)} · Оценки`
        const keyboard: InlineKeyboard = {
          buttons: [
            ...chunk<TEstimatePeriod>(periods, 2).map((periods2) => periods2.map((p) => ({ text: p.name, callbackId: `period_${p.id}` }))),
            [{ text: '◀️ Назад', callbackId: 'menu_back' }],
          ],
        }

        const ref = ctx.transport.getMessageRef()
        if (ref) {
          await ctx.transport.editText(ref, msg, keyboard)
        } else {
          const newRef = await ctx.transport.reply(msg, keyboard)
          ctx.transport.setMessageRef(newRef)
        }

        // Store grades context in session state
        ctx.session.state = { name: 'VIEWING_GRADES', studentId: student.id, periods, schoolYear, classId }
      } else {
        await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
      }
    } else {
      await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
    }
  } else {
    await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
  }
}

// ─── State transition ───

export async function enterState (
  godContext: KeystoneContext,
  ctx: BotContext,
  state: import('./types').ConversationState,
  needNewMessage: boolean = false
): Promise<void> {
  ctx.session.state = state

  switch (state.name) {
    case 'AUTH_REQUIRED':
      await enterAuthRequired(godContext, ctx)
      break
    case 'SELECTING_STUDENT':
      await enterSelectStudent(godContext, ctx)
      break
    case 'MAIN_MENU':
      await enterMainMenu(godContext, ctx, needNewMessage)
      break
    case 'VIEWING_SCHEDULE':
      await enterScheduleMenu(godContext, ctx)
      break
    case 'VIEWING_HOMEWORK':
      await enterHomeworkMenu(godContext, ctx)
      break
    case 'VIEWING_GRADES':
      await enterGradesMenu(godContext, ctx)
      break
  }
}

// ─── Action handlers ───

export async function handleSelectStudent (godContext: KeystoneContext, ctx: BotContext, actionId: string): Promise<void> {
  const selectedStudentId = actionId.replace('select_', '')
  const students = ctx.session.students

  const selectedStudent = students.find((student) => student.id === selectedStudentId)

  if (selectedStudent) {
    ctx.session.selectedStudentId = selectedStudent.id
    await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: selectedStudent.id })
  } else {
    await ctx.transport.reply('🙀 Не удалось выбрать ученика из полученного списка. Это крайне странно О_о. Попробуйте начать сначала /start.')
  }
}

export async function handleMenuSchedule (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  await enterState(godContext, ctx, { name: 'VIEWING_SCHEDULE', studentId: ctx.session.state.name === 'MAIN_MENU' ? ctx.session.state.studentId : '' })
}

export async function handleMenuHomework (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  await enterState(godContext, ctx, { name: 'VIEWING_HOMEWORK', studentId: ctx.session.state.name === 'MAIN_MENU' ? ctx.session.state.studentId : '' })
}

export async function handleMenuGrades (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  await enterState(godContext, ctx, { name: 'VIEWING_GRADES', studentId: ctx.session.state.name === 'MAIN_MENU' ? ctx.session.state.studentId : '', periods: [], schoolYear: '', classId: '' })
}

export async function handleMenuSelectStudent (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const ref = ctx.transport.getMessageRef()
  if (ref) {
    await ctx.transport.deleteMessage(ref)
  }
  await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
}

export async function handleBackToMainMenu (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: ctx.session.selectedStudentId! })
}

// ─── Schedule actions ───

export async function handleScheduleToday (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const today = dayjs()
  const dayOfWeek = today.day()

  if (dayOfWeek === 0) {
    await ctx.transport.reply('Сегодня воскресенье. Уроков нет 😶‍🌫️')
  } else {
    const todayDateStr = today.format('YYYY-MM-DD')
    const scheduleResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'schedule', params: { studentId: student.id, date: todayDateStr } } })

    if (scheduleResult) {
      const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') === todayDateStr && day.scheduleDayLessonModels.length > 0)
      if (day) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nРасписание на сегодня, ${ctx.transport.escape(lowerCase(day.dayOfWeekName))}, ${ctx.transport.escape(dayjs(day.date.split('T', 2)[0]).format('D MMM'))}:\n${formatScheduleDay(day, ctx.transport)}`)
      } else {
        await ctx.transport.reply('Сегодня уроков нет 🥵')
      }
    } else {
      await ctx.transport.reply('Не удалось получить данные')
    }
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleScheduleTomorrow (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const tomorrow = dayjs().add(1, 'day')
  const dayOfWeek = tomorrow.day()

  if (dayOfWeek === 0) {
    await ctx.transport.reply('Завтра же воскресенье! Уроков нет 😶‍🌫️')
  } else {
    const tomorowDateStr = tomorrow.format('YYYY-MM-DD')
    const scheduleResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'schedule', params: { studentId: student.id, date: tomorowDateStr } } })

    if (scheduleResult) {
      const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') === tomorowDateStr && day.scheduleDayLessonModels.length > 0)
      if (day) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nРасписание на завтра, ${ctx.transport.escape(lowerCase(day.dayOfWeekName))}, ${ctx.transport.escape(dayjs(day.date.split('T', 2)[0]).format('D MMM'))}:\n${formatScheduleDay(day, ctx.transport)}`)
      } else {
        await ctx.transport.reply('Завтра уроков нет 🥵')
      }
    } else {
      await ctx.transport.reply('Не удалось получить данные')
    }
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleScheduleThisWeek (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const today = dayjs()
  const dayOfWeek = today.day()

  if (dayOfWeek === 0) {
    await ctx.transport.reply('На этой неделе осталось только воскресенье. Уроков больше нет 😶‍🌫️')
  } else {
    const scheduleResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'schedule', params: { studentId: student.id, date: today.format('YYYY-MM-DD') } } })

    if (scheduleResult) {
      const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') >= today.add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)
      if (days.length > 0) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nРасписание до конца недели\n\n${days.map((day) => `${ctx.transport.escape(day.dayOfWeekName)}, ${ctx.transport.escape(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day, ctx.transport)}`).join('\n\n')}`)
      } else {
        await ctx.transport.reply('На этой неделе уроков больше нет 🥵')
      }
    } else {
      await ctx.transport.reply('Не удалось получить данные')
    }
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleScheduleNextWeek (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const scheduleResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'schedule', params: { studentId: student.id, date: dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD') } } })

  if (scheduleResult) {
    const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') >= dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)
    if (days.length > 0) {
      await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nРасписание на следующую неделю\n\n${days.map((day) => `${ctx.transport.escape(day.dayOfWeekName)}, ${ctx.transport.escape(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day, ctx.transport)}`).join('\n\n')}`)
    } else {
      await ctx.transport.reply('На следующей неделе уроков нет 🥵')
    }
  } else {
    await ctx.transport.reply('Не удалось получить данные')
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

// ─── Homework actions ───

export async function handleHomeworkToday (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const today = dayjs()
  const homeworkResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'homework', params: { studentId: student.id, date: today.format('YYYY-MM-DD') } } })

  if (homeworkResult && homeworkResult.homeworks && homeworkResult.homeworks.length > 0) {
    await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nДомашнее задание на сегодня, ${ctx.transport.escape(today.format('dddd, D MMM'))}:\n\n${homeworkResult?.homeworks.map((hw) => formatHomeworkItem(hw, ctx.transport)).join('\n')}`)
  } else {
    await ctx.transport.reply('На сегодня домашнего задания нет 🥵')
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleHomeworkTomorrow (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const tomorow = dayjs().add(1, 'day')
  const homeworkResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'homework', params: { studentId: student.id, date: tomorow.format('YYYY-MM-DD') } } })

  if (homeworkResult && homeworkResult.homeworks && homeworkResult.homeworks.length > 0) {
    await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nДомашнее задание на завтра, ${ctx.transport.escape(tomorow.format('dddd, D MMM'))}:\n\n${homeworkResult?.homeworks.map((hw) => formatHomeworkItem(hw, ctx.transport)).join('\n')}`)
  } else {
    await ctx.transport.reply('На завтра домашнего задания нет 🥵')
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleHomeworkThisWeek (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const dates: string[] = []
  let startDayNumber = 1
  const currentWeekDay = dayjs().day()
  for (let i = currentWeekDay; i <= 6; i++) {
    dates.push(dayjs().add(startDayNumber++, 'days').format('YYYY-MM-DD'))
  }

  const homeworkResults = (await Promise.all(dates.map((date) => fetchFromDnevnik({ godContext, ctx, request: { action: 'homework', params: { studentId: student.id, date } } })))).filter((res) => res && res.homeworks.length > 0)

  if (homeworkResults.length > 0) {
    await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nДомашнее задание на эту неделю:\n\n${homeworkResults.map((res) => `🗓 ${ctx.transport.escape(dayjs(res!.date).format('dddd, D MMM'))}\n${res!.homeworks.map((hw) => formatHomeworkItem(hw, ctx.transport)).join('\n')}`).join('\n\n')}`)
  } else {
    await ctx.transport.reply('На этой неделе домашнего задания нет 🥵')
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

export async function handleHomeworkNextWeek (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const student = getSelectedStudent(ctx)
  if (!student) { await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' }); return }

  const dates: string[] = []
  let startDayNumber = 0
  for (let i = 0; i <= 6; i++) {
    dates.push(dayjs().add(1, 'week').startOf('week').add(startDayNumber++, 'days').format('YYYY-MM-DD'))
  }

  const homeworkResults = (await Promise.all(dates.map((date) => fetchFromDnevnik({ godContext, ctx, request: { action: 'homework', params: { studentId: student.id, date } } })))).filter((res) => res && res.homeworks.length > 0)

  if (homeworkResults.length > 0) {
    await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nДомашнее задание на следующую неделю:\n\n${homeworkResults.map((res) => `🗓 ${ctx.transport.escape(dayjs(res!.date).format('dddd, D MMM'))}\n${res!.homeworks.map((hw) => formatHomeworkItem(hw, ctx.transport)).join('\n')}`).join('\n\n')}`)
  } else {
    await ctx.transport.reply('На следующей неделе домашнего задания нет 🥵')
  }

  const ref = ctx.transport.getMessageRef()
  if (ref) { await ctx.transport.deleteMessage(ref) }
  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student.id }, true)
}

// ─── Grades actions ───

export async function handlePeriodSelect (godContext: KeystoneContext, ctx: BotContext, actionId: string): Promise<void> {
  if (ctx.session.state.name !== 'VIEWING_GRADES') {
    await enterState(godContext, ctx, { name: 'VIEWING_GRADES', studentId: '', periods: [], schoolYear: '', classId: '' })
    return
  }

  const state = ctx.session.state
  const student = getSelectedStudent(ctx)

  if (student) {
    const periodId = actionId.replace('period_', '')
    const periodName = lowerCase(state.periods.find(({ id }) => id === periodId)?.name)

    const { schoolYear, classId } = state

    const estimateResult = await fetchFromDnevnik({
      godContext, ctx, request: {
        action: 'estimate', params: {
          studentId: student.id,
          schoolYear,
          subjectId: '00000000-0000-0000-0000-000000000000',
          periodId,
          classId,
        }
      }
    })

    if (estimateResult?.weekGradesTable) {
      const w = estimateResult.weekGradesTable
      if (w.days.length > 0) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nОценки за неделю ${ctx.transport.escape(`${dayjs(w.beginDate).format('D MMM')} - ${dayjs(w.endDate).format('D MMM')}`)}\n\n${w.days.map((day) => ctx.transport.escape(`${dayjs(day.date).format('D MMMM')}\n${day.lessonGrades.map((l) => `${l.name}: ${l.grades.map((g) => g.join('/')).join(', ')}`).join('\n')}`)).join('\n\n')}`)
      } else {
        await ctx.transport.reply('На этой неделе оценок нет')
      }
    } else if (estimateResult?.periodGradesTable) {
      const disciplines = estimateResult.periodGradesTable.disciplines.filter((d) => d.grades.reduce((sum, next) => sum + next.grades.length, 0) > 0)
      if (disciplines.length > 0) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\nОценки за ${ctx.transport.escape(periodName)}\n\n${disciplines.map(
          (d) => `${ctx.transport.escape(d.name)}: ${ctx.transport.escape(d.grades.filter((x) => x.grades.length > 0).map((x) => x.grades.map((g) => g.join('/')).join(', ')).join(', '))} · ${ctx.transport.bold(round(d.averageGrade, 2).toString())} ${ctx.transport.escape(`(ср.взвеш. ${round(d.averageWeightedGrade, 2).toString()})`)}`
        ).join('\n')}`)
      } else {
        await ctx.transport.reply('Оценок пока нет')
      }
    } else if (estimateResult?.yearGradesTable) {
      const y = estimateResult.yearGradesTable
      if (y.lessonGrades.length > 0) {
        await ctx.transport.reply(`${ctx.transport.bold(getSelectedStudentName(ctx))}\n${ctx.transport.escape('Итоговые оценки (ср./ср.взвеш.)')}\n\n${y.lessonGrades.map((l) => formatYearGradesLesson(l, ctx.transport)).join('\n')}`)
      } else {
        await ctx.transport.reply('Итоговых оценок пока нет')
      }
    } else {
      await ctx.transport.reply('Пока оценок нет')
    }

    const ref = ctx.transport.getMessageRef()
    if (ref) { await ctx.transport.deleteMessage(ref) }
  }

  await enterState(godContext, ctx, { name: 'MAIN_MENU', studentId: student?.id || '' }, true)
}

// ─── Top-level event handlers ───

export async function onStart (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  const platformUserId = ctx.user?.platformUserId

  if (ctx.user) {
    if (ctx.user.dnevnikAccessToken && ctx.user.dnevnikRefreshToken) {
      await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
    } else {
      await ctx.transport.sendLoginPrompt(`Снова здравствуйте! Нужно повторно подключить дневник. Кнопка для этого уже внизу 👇`)
    }
  } else {
    // Create user — needs platform info from transport
    // This is handled by the transport's bot.ts which has access to ctx.from
    await ctx.transport.reply(`Здравствуйте, ${ctx.fromName ?? 'человек'}! Это бот для работы с дневником. Он подключается к дневнику, используя ваш аккаунт. Чтобы указать данные аккаунта, используйте команду /login.`)
  }
}

export async function onLogin (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  await ctx.transport.sendLoginPrompt(
    'Для подключения дневника нажмите кнопку "Подключить дневник" внизу. Там же откроется инструкция.',
  )
}

export async function onLogout (godContext: KeystoneContext, ctx: BotContext): Promise<void> {
  if (ctx.user) {
    await clearUserTokens(godContext, ctx.user.id)
  }

  await ctx.transport.removeKeyboard('Что ж, таков путь. Я удалил ваши токены и более не смогу получать данные. Но вы можете вернуть все обратно через команду /login')
}

export async function onSendTokens (godContext: KeystoneContext, ctx: BotContext, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  // The transport is responsible for finding/creating the user before calling this
  if (!ctx.user) {
    logger.error({ msg: 'onSendTokens: no user in context' })
    return
  }

  const dnevnikClientWithUserTokens = new DnevnikClient({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })

  try {
    const newTokens = await dnevnikClientWithUserTokens.refreshTokens()
    const dnevnikAccessTokenExpirationDate = getTokenExpirationDate(newTokens.accessToken)

    const updatedUser = await updateUserTokens(godContext, ctx.user.id, {
      accessToken: newTokens.accessToken,
      accessTokenExpirationDate: dnevnikAccessTokenExpirationDate,
      refreshToken: newTokens.refreshToken,
    })

    ctx.user = updatedUser

    await ctx.transport.removeKeyboard('Готово! Бот подключен к вашему аккаунту в дневнике. Чтобы отключить все это используйте команду /logout.')
    await enterState(godContext, ctx, { name: 'SELECTING_STUDENT' })
  } catch (err) {
    if (err instanceof DnevnikClientUnauthorizedError) {
      await ctx.transport.sendLoginPrompt('Ммм, похоже что токены, которые вы только что отправили, уже устарели. Или вы их перепутали. Или взяли не из того места. Давайте попробуем еще разок.')
    } else if (err instanceof DnevnikClientExternalServerError) {
      await ctx.transport.sendLoginPrompt('Похоже что-то случилось с сервером дневника. Попробуйте позже. Кнопка на том же месте.')
    } else {
      await ctx.transport.sendLoginPrompt('По моему вы отправили не токены. Попробуйте еще раз.')
    }
  }
}
