import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { KeystoneContext } from "@keystone-6/core/types"
import { Scenes, Markup } from 'telegraf'

export function getSelectStudentScene(): BaseScene<DnevnikContext> {
  const selectStudentScene = new Scenes.BaseScene<DnevnikContext>('select_student')

  selectStudentScene.enter((ctx) => {
    const students = ctx.session.students

    // if (students) {
      const studentKeyboard = Markup.inlineKeyboard(
        students.map((student) => [Markup.button.callback(`${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, `select_${student.id}`)])
      )
      // Need to reply with markdown because this message will be edited within student scene
      ctx.replyWithMarkdownV2('Выберите ученика:', studentKeyboard)
    // } else {
      // TODO go to /start
    // }
  });

  selectStudentScene.action(/select_(.+)/, (ctx) => {
    const selectedStudentId = ctx.match[1]
    const students = ctx.session.students

    const selectedStudent = students.find((student) => student.id === selectedStudentId)

    if (selectedStudent) {
      if (ctx.session) {
        ctx.session.selectedStudentId = selectedStudent.id
        // ctx.answerCbQuery()
        ctx.scene.enter('student_scene')
      }
    } else {
      ctx.reply('Ошибка: Ученик не найден')
    }
  })

  return selectStudentScene
}
