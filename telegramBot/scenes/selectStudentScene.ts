import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { KeystoneContext } from "@keystone-6/core/types"

export function getSelectStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const selectStudentScene = new Scenes.BaseScene<DnevnikContext>('select_student')

  selectStudentScene.enter(async (ctx) => {
    const telegramUser = ctx.telegramUser
    if (telegramUser) {
      // TODO cache result. Add cache settings to fetchFromDnevnik
      const studentsResult = await fetchFromDnevnik({ telegramUser, godContext, ctx, request: { action: 'students' } })

      if (studentsResult && studentsResult.students) {
        if (!studentsResult.isParent) {
          await ctx.reply('Ой ой, кажется вы подключили не родительскую учетную запись. Есть вероятность что что-то не сработает. Но почему бы и не попробовать, верно?', Markup.removeKeyboard())
        }

        ctx.session.students = studentsResult.students
        if (studentsResult.students.length === 1) {
          // There is no choice if only one student
          ctx.session.selectedStudentId = studentsResult.students[0].id
          // needMessage is true because there is no message (with student choice) to edit in next scene
          await ctx.scene.enter('student_scene', { needNewMessage: true })
        } else {
          const studentKeyboard = Markup.inlineKeyboard(
            studentsResult.students.map((student) => [Markup.button.callback(`${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, `select_${student.id}`)])
          )
          await ctx.reply('Выберите ученика:', studentKeyboard)
        }
      } else {
        await ctx.reply('🙀 Не удалось получить список учеников. Попробуйте начать сначала: /start.')
      }
    } else {
      await ctx.reply('🙀 Что-то пошло не так. Давайте начнем сначала: /start.')
    }
  })

  selectStudentScene.action(/select_(.+)/, async (ctx) => {
    const selectedStudentId = ctx.match[1]
    const students = ctx.session.students

    const selectedStudent = students.find((student) => student.id === selectedStudentId)

    if (selectedStudent) {
      ctx.session.selectedStudentId = selectedStudent.id
      await ctx.scene.enter('student_scene')
    } else {
      await ctx.reply('🙀 Не удалось выбрать ученика из полученного списка. Это крайне странно О_о. Попробуйте начать сначала /start.')
    }
  })

  return selectStudentScene
}
