import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { findTelegramUser, getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { Scenes, Markup } from 'telegraf'
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { KeystoneContext } from "@keystone-6/core/types"
import dayjs from "dayjs"
import { escapeMarkdown, formatHomeworkItem, formatScheduleDay, formatStudentMainMenuTitle } from "../../utils/messageMarkdownV2Formatters"
import { chunk } from 'lodash'
import { TEstimatePeriod } from "../../clients/DnevnikClientTypes"

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Расписание', 'menu_schedule'),
      Markup.button.callback('📚 ДЗ', 'menu_homework'),
      Markup.button.callback('📊 Оценки', 'menu_grades')
    ],
    [
      Markup.button.callback('◀️ Выбрать другого ученика', 'menu_select_student')
    ],
  ])
}

function scheduleMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🙉 Сегодня', 'schedule_today'),
      Markup.button.callback('🙈 Завтра', 'schedule_tomorrow'),
      Markup.button.callback('🙊 Эта неделя', 'schedule_week'),
    ],
    [
      Markup.button.callback('◀️ Назад', 'menu_back'),
    ],
  ])
}

function homeworkMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('😲 Завтра', 'homework_tomorrow'),
      Markup.button.callback('🫣 Эта неделя', 'homework_this_week'),
      Markup.button.callback('😵 След. неделя', 'homework_next_week'),
    ],
    [
      Markup.button.callback('◀️ Назад', 'menu_back'),
    ],
  ])
}

export function getStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const mainScene = new Scenes.BaseScene('student_scene')
  let telegramUser

  mainScene.enter(async (ctx: DnevnikContext) => {
    const telegramId = String(ctx.from.id)
    telegramUser = await findTelegramUser(godContext, telegramId)
    ctx.editMessageText(formatStudentMainMenuTitle(getSelectedStudent(ctx)), { ...mainMenu(), parse_mode: 'MarkdownV2' })
  })

  //
  // Schedule
  //
  mainScene.action('menu_schedule', (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Расписание`, { ...scheduleMenu(), parse_mode: 'MarkdownV2'})
  })

  mainScene.action('schedule_today', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().add(1, 'day').format('YYYY-MM-DD') }
      }
    })

    const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD'))

    if (day) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на сегодня, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('Сегодня уроков нет 🥵')
    }
  })

  mainScene.action('schedule_tomorrow', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().add(1, 'day').format('YYYY-MM-DD') }
      }
    })

    const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date).format('YYYY-MM-DD') === dayjs().add(1, 'day').format('YYYY-MM-DD'))

    if (day) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на завтра, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('Завтра уроков нет 🥵')
    }
  })

  mainScene.action('schedule_week', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().format('YYYY-MM-DD') }
      }
    })

    const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date).format('YYYY-MM-DD') > dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)

    if (days.length > 0) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание до конца недели\n\n${days.map((day) => `${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('На этой неделе уроков больше нет 🥵')
    }
  });

  //
  // Homework
  //
  mainScene.action('menu_homework', (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Домашнее задание`, { ...homeworkMenu(), parse_mode: 'MarkdownV2'})
  });

  mainScene.action('homework_tomorrow', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const tomorow = dayjs().add(1, 'day')
    const homeworkResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'homework',
        params: {
          studentId: student.id,
          date: tomorow.format('YYYY-MM-DD')
        },
      },
    })

    if (homeworkResult.homeworks.length > 0) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на завтра, ${escapeMarkdown(tomorow.format('dddd, D MMM'))}:\n\n${homeworkResult?.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('На завтра домашнего задания нет 🥵')
    }
  });

  mainScene.action('homework_this_week', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const dates: string[] = []
    let startDayNumber = 1
    const currentWeekDay = dayjs().day()
    for (let i = currentWeekDay; i<=6; i++) {
      dates.push(dayjs().add(startDayNumber++, 'days').format('YYYY-MM-DD'))
    }

    const homeworkResults = (await Promise.all(dates.map((date) => fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'homework',
        params: {
          studentId: student.id,
          date
        },
      },
    })))).filter((res) => res && res.homeworks.length > 0)

    if (homeworkResults.length > 0) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на эту неделю:\n\n${homeworkResults.map((res) => `🗓 ${escapeMarkdown(dayjs(res.date).format('dddd, D MMM'))}\n${res.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('На этой неделе домашнего задания нет 🥵')
    }
  });

  mainScene.action('homework_next_week', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const dates: string[] = []
    let startDayNumber = 0
    const currentWeekDay = 0
    for (let i = currentWeekDay; i<=6; i++) {
      dates.push(dayjs().add(1, 'week').startOf('week').add(startDayNumber++, 'days').format('YYYY-MM-DD'))
    }

    const homeworkResults = (await Promise.all(dates.map((date) => fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'homework',
        params: {
          studentId: student.id,
          date
        },
      },
    })))).filter((res) => res && res.homeworks.length > 0)

    if (homeworkResults.length > 0) {//${homeworkResult?.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на следующую неделю:\n\n${homeworkResults.map((res) => `🗓 ${escapeMarkdown(dayjs(res.date).format('dddd, D MMM'))}\n${res.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.answerCbQuery()
      ctx.reply('На следующей неделе домашнего задания нет 🥵')
    }
  });

  // Оценки
  mainScene.action('menu_grades', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)

    const yearsResult = await fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'estimateYears', params: { studentId: student.id } } })
    const schoolYear = yearsResult.currentYear.id

    const data = await Promise.all([
      fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'estimatePeriods', params: { studentId: student.id, schoolYear } } }),
      fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'classes', params: { studentId: student.id, schoolYear } } }),
    ])

    const periods = data[0].periods
    const classId = data[1].currentClass.value

    if (ctx.session && !ctx.session.estimate) {
      ctx.session.estimate = { schoolYear, classId }
    }

    ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Оценки`, { ...Markup.inlineKeyboard(chunk<TEstimatePeriod>(periods, 2).map((periods2) => periods2.map((p) => Markup.button.callback(p.name, `period_${p.id}`)))), parse_mode: 'MarkdownV2' })
  });

  mainScene.action(/period_(.+)/, async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const periodId = ctx.match[1]

    if (ctx.session && ctx.session.estimate) {
      const { schoolYear, classId } = ctx.session.estimate

      const estimateResult = await fetchFromDnevnik({
        godContext, ctx, telegramUser, request: {
          action: 'estimate', params: {
            studentId: student.id,
            schoolYear,
            subjectId: '00000000-0000-0000-0000-000000000000', // means all subjects
            periodId,
            classId,
          }
        }
      })

      if (estimateResult?.weekGradesTable) {
        // ctx.reply(`*${getSelectedStudentName(ctx)}*\nОценки\n`, { parse_mode: 'MarkdownV2' }).then(() => {
        //   ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        //   ctx.deleteMessage()
        // })
        ctx.answerCbQuery()
        ctx.reply('За неделю')
      } else if (estimateResult?.yearGradesTable) {
        ctx.answerCbQuery()
        ctx.reply('За год')
      } else if (estimateResult?.periodGradesTable) {
        ctx.answerCbQuery()
        ctx.reply('За четверть')
      } else {
        ctx.answerCbQuery()
        ctx.reply('Пока оценок нет')
      }
    }
  })

  // Возврат к главному меню
  mainScene.action('menu_back', (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    ctx.editMessageText(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' });
  });

  // Обработчик для кнопки "Выбрать другого ученика"
  mainScene.action('menu_select_student', (ctx: DnevnikContext) => {
    ctx.deleteMessage().then(() => {
      ctx.scene.enter('select_student')
    })
  })

  return mainScene
}
