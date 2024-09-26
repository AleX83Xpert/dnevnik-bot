import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'

export function getSelectStudentScene(): BaseScene<DnevnikContext> {
  const selectStudentScene = new Scenes.BaseScene<DnevnikContext>('select_student')

  selectStudentScene.enter(async (ctx) => {
    const students = ctx.session.students

    if (students) {
      if (students.length === 1) {
        // There is no choice if only one student
        ctx.session.selectedStudentId = students[0].id
        // needMessage is true because there is no message (with student choice) to edit in next scene
        await ctx.scene.enter('student_scene', { needNewMessage: true })
      } else {
        const studentKeyboard = Markup.inlineKeyboard(
          students.map((student) => [Markup.button.callback(`${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, `select_${student.id}`)])
        )
        // Need to reply with markdown because this message will be edited within student scene
        await ctx.reply('Выберите ученика:', studentKeyboard)
      }
    } else {
      await ctx.reply('🙀 Не удалось получить список учеников. Попробуйте начать сначала /start.')
    }
  });

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
