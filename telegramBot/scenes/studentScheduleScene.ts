import { KeystoneContext } from "@keystone-6/core/types"
import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { escMd, formatScheduleDay } from "../../utils/messageMdV2Formatters"
import dayjs from "dayjs"
import { lowerCase } from 'lodash'

function scheduleMenu () {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🙉 Сегодня', 'schedule_today'),
      Markup.button.callback('🙈 Завтра', 'schedule_tomorrow'),
    ],
    [
      Markup.button.callback('🙊 Эта неделя', 'schedule_this_week'),
      Markup.button.callback('🙊 След. неделя', 'schedule_next_week'),
    ],
    [
      Markup.button.callback('◀️ Назад', 'menu_back'),
    ],
  ])
}

export function getStudentScheduleScene (godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const scene = new Scenes.BaseScene<DnevnikContext>('student_schedule_scene')

  scene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      await ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Расписание`, { ...scheduleMenu(), parse_mode: 'MarkdownV2' })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('schedule_today', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const todayDateStr = dayjs().format('YYYY-MM-DD')

      const scheduleResult = await fetchFromDnevnik({
        godContext,
        ctx,
        request: {
          action: 'schedule',
          params: { studentId: student.id, date: todayDateStr }
        }
      })

      if (scheduleResult) {
        const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') === todayDateStr && day.scheduleDayLessonModels.length > 0)

        if (day) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на сегодня, ${escMd(lowerCase(day.dayOfWeekName))}, ${escMd(dayjs(day.date.split('T', 2)[0]).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('Сегодня уроков нет 🥵')
        }
      } else {
        await ctx.reply('Не удалось получить данные')
      }

      await ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('schedule_tomorrow', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const tomorowDateStr = dayjs().add(1, 'day').format('YYYY-MM-DD')

      const scheduleResult = await fetchFromDnevnik({
        godContext,
        ctx,
        request: {
          action: 'schedule',
          params: { studentId: student.id, date: tomorowDateStr }
        }
      })

      if (scheduleResult) {
        const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') === tomorowDateStr && day.scheduleDayLessonModels.length > 0)

        if (day) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на завтра, ${escMd(lowerCase(day.dayOfWeekName))}, ${escMd(dayjs(day.date.split('T', 2)[0]).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('Завтра уроков нет 🥵')
        }
      } else {
        await ctx.reply('Не удалось получить данные')
      }

      await ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('schedule_this_week', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const scheduleResult = await fetchFromDnevnik({
        godContext,
        ctx,
        request: {
          action: 'schedule',
          params: { studentId: student.id, date: dayjs().startOf('week').format('YYYY-MM-DD') }
        }
      })

      if (scheduleResult) {
        const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') >= dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)

        if (days.length > 0) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание до конца недели\n\n${days.map((day) => `${escMd(day.dayOfWeekName)}, ${escMd(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('На этой неделе уроков больше нет 🥵')
        }
      } else {
        await ctx.reply('Не удалось получить данные')
      }

      await ctx.deleteMessage()
      await ctx.scene.enter('student_scene', { needNewMessage: true })
    } else {
      await ctx.scene.enter('select_student')
    }
  })

  scene.action('schedule_next_week', async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const scheduleResult = await fetchFromDnevnik({
        godContext,
        ctx,
        request: {
          action: 'schedule',
          params: { studentId: student.id, date: dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD') }
        }
      })

      if (scheduleResult) {
        const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date.split('T', 2)[0]).format('YYYY-MM-DD') >= dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)

        if (days.length > 0) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на следующую неделю\n\n${days.map((day) => `${escMd(day.dayOfWeekName)}, ${escMd(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('На следующей неделе уроков нет 🥵')
        }
      } else {
        await ctx.reply('Не удалось получить данные')
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
