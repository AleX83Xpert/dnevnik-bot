import { KeystoneContext } from "@keystone-6/core/types"
import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { escapeMarkdown, formatScheduleDay } from "../../utils/messageMarkdownV2Formatters"
import dayjs from "dayjs"

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

export function getStudentScheduleScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const scene = new Scenes.BaseScene<DnevnikContext>('student_schedule_scene')

  scene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)
    await ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Расписание`, { ...scheduleMenu(), parse_mode: 'MarkdownV2' })
  })

  scene.action('schedule_today', async (ctx) => {
    const student = getSelectedStudent(ctx)
    const telegramUser = ctx.session.telegramUser

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
      await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на сегодня, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' })
    } else {
      await ctx.reply('Сегодня уроков нет 🥵')
    }

    await ctx.deleteMessage()
    await ctx.scene.enter('student_scene', { isStart: true })
  })

  scene.action('schedule_tomorrow', async (ctx) => {
    const student = getSelectedStudent(ctx)
    const telegramUser = ctx.session.telegramUser

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
      await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на завтра, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' })
    } else {
      await ctx.reply('Завтра уроков нет 🥵')
    }

    await ctx.deleteMessage()
    await ctx.scene.enter('student_scene', { isStart: true })
  })

  scene.action('schedule_week', async (ctx) => {
    const student = getSelectedStudent(ctx)
    const telegramUser = ctx.session.telegramUser

    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().format('YYYY-MM-DD') }
      }
    })

    const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date).format('YYYY-MM-DD') >= dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)

    if (days.length > 0) {
      await ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание до конца недели\n\n${days.map((day) => `${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
    } else {
      await ctx.reply('На этой неделе уроков больше нет 🥵')
    }

    await ctx.deleteMessage()
    await ctx.scene.enter('student_scene', { isStart: true })
  });

  return scene
}
