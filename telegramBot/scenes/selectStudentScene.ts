import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { KeystoneContext } from "@keystone-6/core/types"

const { Scenes, Markup } = require('telegraf')

export function getSelectStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const selectStudentScene = new Scenes.BaseScene('select_student')

  selectStudentScene.enter((ctx: DnevnikContext) => {
    const students = ctx.session?.students

    const studentKeyboard = Markup.inlineKeyboard(
      students?.map((student) => [Markup.button.callback(`${student.firstName} ${student.lastName}, ${student.orgName}, ${student.className}`, `select_${student.id}`)])
    )

    // Need to reply with markdown because this message will be edited within student scene
    ctx.replyWithMarkdownV2('Выберите ученика:', studentKeyboard)
  });

  selectStudentScene.action(/select_(.+)/, (ctx: DnevnikContext) => {
    const selectedStudentId = ctx.match[1]
    const students = ctx.session?.students

    const selectedStudent = students?.find((student) => student.id === selectedStudentId)

    if (selectedStudent) {
      if (ctx.session) {
        ctx.session.selectedStudentId = selectedStudent.id
        ctx.answerCbQuery()
        return ctx.scene?.enter('student_scene')
      }
    } else {
      return ctx.reply('Ошибка: Ученик не найден')
    }
  })

  return selectStudentScene
}
