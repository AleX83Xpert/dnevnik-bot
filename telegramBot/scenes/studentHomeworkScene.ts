import { KeystoneContext } from "@keystone-6/core/types"
import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { escapeMarkdown, formatHomeworkItem, formatScheduleDay } from "../../utils/messageMarkdownV2Formatters"
import dayjs from "dayjs"
import { fmt, bold, italic, underline, quote } from "telegraf/format"

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

export function getStudentHomeworkScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const scene = new Scenes.BaseScene<DnevnikContext>('student_homework_scene')

  scene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)
    if (student) {
      // TODO move scene title to common place
      await ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Домашнее задание`, { ...homeworkMenu(), parse_mode: 'MarkdownV2' })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('homework_tomorrow', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const telegramUser = ctx.session.telegramUser
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

      if (homeworkResult && homeworkResult.homeworks && homeworkResult.homeworks.length > 0) {
        await ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на завтра, ${escapeMarkdown(tomorow.format('dddd, D MMM'))}:\n\n${homeworkResult?.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`, { parse_mode: 'MarkdownV2' })
      } else {
        await ctx.reply('На завтра домашнего задания нет 🥵')
      }

      await ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('homework_this_week', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const telegramUser = ctx.session.telegramUser

      const dates: string[] = []
      let startDayNumber = 1
      const currentWeekDay = dayjs().day()
      for (let i = currentWeekDay; i <= 6; i++) {
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
        ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на эту неделю:\n\n${homeworkResults.map((res) => `🗓 ${escapeMarkdown(dayjs(res.date).format('dddd, D MMM'))}\n${res.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
      } else {
        ctx.reply('На этой неделе домашнего задания нет 🥵')
      }

      ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('homework_next_week', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const telegramUser = ctx.session.telegramUser

      const dates: string[] = []
      let startDayNumber = 0
      const currentWeekDay = 0
      for (let i = currentWeekDay; i <= 6; i++) {
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

      if (homeworkResults.length > 0) {
        await ctx.reply(`*${getSelectedStudentName(ctx)}*\nДомашнее задание на следующую неделю:\n\n${homeworkResults.map((res) => `🗓 ${escapeMarkdown(dayjs(res.date).format('dddd, D MMM'))}\n${res.homeworks.map((hw) => formatHomeworkItem(hw)).join('\n')}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
      } else {
        await ctx.reply('На следующей неделе домашнего задания нет 🥵')
      }

      await ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('menu_back', async (ctx) => {
    await ctx.scene.enter('student_scene')
  })

  return scene
}
