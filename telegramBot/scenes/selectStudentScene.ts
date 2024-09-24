import { BaseScene as TBaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { KeystoneContext } from "@keystone-6/core/types"

const { Scenes, Markup } = require('telegraf')
const { BaseScene } = Scenes

export function getSelectStudentScene(godContext: KeystoneContext): TBaseScene<DnevnikContext> {
  const selectStudentScene = new BaseScene('select_student')

  selectStudentScene.enter((ctx: DnevnikContext) => {
    const students = ctx.session?.students

    const studentKeyboard = Markup.inlineKeyboard(
      students?.map((student) => Markup.button.callback(`${student.firstName} ${student.lastName}`, `select_${student.id}`))
    );
    ctx.reply('Выберите ученика:', studentKeyboard);
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
