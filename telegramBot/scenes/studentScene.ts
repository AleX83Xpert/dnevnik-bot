import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { findTelegramUser, getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { Scenes, Markup } from 'telegraf'
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { KeystoneContext } from "@keystone-6/core/types"
import dayjs from "dayjs"
import { escapeMarkdown, formatHomeworkItem, formatScheduleDay, formatStudentMainMenuTitle } from "../../utils/messageMarkdownV2Formatters"
import { chunk, lowerCase, round } from 'lodash'
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

export function getStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const mainScene = new Scenes.BaseScene<DnevnikContext>('student_scene')
  let telegramUser

  mainScene.enter(async (ctx) => {
    const telegramId = String(ctx.from.id)
    telegramUser = await findTelegramUser(godContext, telegramId)
    const msg = formatStudentMainMenuTitle(getSelectedStudent(ctx))
    if (ctx.scene.state.isStart) {
      await ctx.reply(msg, { ...mainMenu(), parse_mode: 'MarkdownV2' })
    } else {
      await ctx.editMessageText(msg, { ...mainMenu(), parse_mode: 'MarkdownV2' })
    }
  })

  //
  // Schedule
  //
  mainScene.action('menu_schedule', async (ctx) => {
    await ctx.scene.enter('student_schedule_scene')
  })

  //
  // Homework
  //
  mainScene.action('menu_homework', async (ctx: DnevnikContext) => {
    await ctx.scene.enter('student_homework_scene')
  })

  //
  // grades
  //
  mainScene.action('menu_grades', async (ctx: DnevnikContext) => {
    await ctx.scene.enter('student_grades_scene')
  })

  // Возврат к главному меню
  mainScene.action('menu_back', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    await ctx.editMessageText(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
  });

  // Обработчик для кнопки "Выбрать другого ученика"
  mainScene.action('menu_select_student', (ctx: DnevnikContext) => {
    ctx.deleteMessage().then(async () => {
      await ctx.scene.enter('select_student')
    })
  })

  return mainScene
}
