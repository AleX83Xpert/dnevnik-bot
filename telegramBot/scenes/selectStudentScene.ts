import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { fmt, bold, italic, underline } from "telegraf/format"

export function getSelectStudentScene(): BaseScene<DnevnikContext> {
  const selectStudentScene = new Scenes.BaseScene<DnevnikContext>('select_student')

  selectStudentScene.enter(async (ctx) => {
    const students = ctx.session.students

    if (students) {
      const studentKeyboard = Markup.inlineKeyboard(
        students.map((student) => [Markup.button.callback(`${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, `select_${student.id}`)])
      )
      // Need to reply with markdown because this message will be edited within student scene
      await ctx.reply(fmt`Выберите ученика`, studentKeyboard)
    } else {
      await ctx.reply(fmt`🙀 Не удалось получить список учеников. Попробуйте начать сначала /start.`)
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
      await ctx.reply(fmt`🙀 Не удалось выбрать ученика из полученного списка. Это крайне странно О_о. Попробуйте начать сначала /start.`)
    }
  })

  return selectStudentScene
}
