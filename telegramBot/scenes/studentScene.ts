import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { getSelectedStudent } from "../botUtils"
import { Scenes, Markup } from 'telegraf'
import { KeystoneContext } from "@keystone-6/core/types"
import { formatStudentMainMenuTitle } from "../../utils/messageMarkdownV2Formatters"

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

  mainScene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const msg = formatStudentMainMenuTitle(student)
      // @ts-ignore NOTE the state's type is an `object` without ability to override
      if (ctx.scene.state.needNewMessage) {
        await ctx.reply(msg, mainMenu())
      } else {
        await ctx.editMessageText(msg, mainMenu())
      }
    } else {
      await ctx.scene.enter('select_student')
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
  mainScene.action('menu_homework', async (ctx) => {
    await ctx.scene.enter('student_homework_scene')
  })

  //
  // grades
  //
  mainScene.action('menu_grades', async (ctx) => {
    await ctx.scene.enter('student_grades_scene')
  })

  // Обработчик для кнопки "Выбрать другого ученика"
  mainScene.action('menu_select_student', (ctx) => {
    ctx.deleteMessage().then(async () => {
      await ctx.scene.enter('select_student')
    })
  })

  return mainScene
}
