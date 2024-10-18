import { KeystoneContext } from "@keystone-6/core/types"
import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { escMd } from "../../utils/messageMdV2Formatters"
import dayjs from "dayjs"
import { chunk, lowerCase, round } from "lodash"
import { TEstimatePeriod } from "../../clients/dnevnik/DnevnikClientTypes"

export function getStudentGradesScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const scene = new Scenes.BaseScene<DnevnikContext>('student_grades_scene')

  // Some global variables for current scene
  // TODO try to move to the scene init
  let gPeriods: TEstimatePeriod[]
  let gEstimate: { schoolYear: string, classId: string } | undefined = undefined

  scene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)

    if (student) {
      const yearsResult = await fetchFromDnevnik({ godContext, ctx, request: { action: 'estimateYears', params: { studentId: student.id } } })
      if (yearsResult) {
        const schoolYear = yearsResult.currentYear.id

        const data = await Promise.all([
          fetchFromDnevnik({ godContext, ctx, request: { action: 'estimatePeriods', params: { studentId: student.id, schoolYear } } }),
          fetchFromDnevnik({ godContext, ctx, request: { action: 'classes', params: { studentId: student.id, schoolYear } } }),
        ])

        if (data && data[0] && data[1] && data[0].periods && data[1].currentClass) {
          const periods = data[0].periods
          const classId = data[1].currentClass.value
          gPeriods = periods

          gEstimate = { schoolYear, classId }

          await ctx.editMessageText(`*${student.firstName} ${student.lastName}* · Оценки`, { ...Markup.inlineKeyboard([...chunk<TEstimatePeriod>(periods, 2).map((periods2) => periods2.map((p) => Markup.button.callback(p.name, `period_${p.id}`))), [Markup.button.callback('◀️ Назад', 'menu_back')]]), parse_mode: 'MarkdownV2' })
        } else {
          await ctx.scene.enter('select_student')
        }
      } else {
        await ctx.scene.enter('select_student')
      }
    } else {
      await ctx.scene.enter('select_student')
    }
  })


  scene.action(/period_(.+)/, async (ctx) => {
    if (!gPeriods || !gEstimate) {
      return await ctx.scene.enter('student_grades_scene')
    }

    const student = getSelectedStudent(ctx)

    if (student) {
      const periodId = ctx.match[1]
      const periodName = lowerCase(gPeriods.find(({ id }) => id === periodId)?.name)

      const { schoolYear, classId } = gEstimate

      const estimateResult = await fetchFromDnevnik({
        godContext, ctx, request: {
          action: 'estimate', params: {
            studentId: student.id,
            schoolYear,
            subjectId: '00000000-0000-0000-0000-000000000000', // means all subjects
            periodId,
            classId,
          }
        }
      })

      if (estimateResult?.weekGradesTable) {
        const w = estimateResult.weekGradesTable
        if (w.days.length > 0) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nОценки за неделю ${escMd(`${dayjs(w.beginDate).format('D MMM')} - ${dayjs(w.endDate).format('D MMM')}`)}\n\n${w.days.map((day) => escMd(`${dayjs(day.date).format('D MMMM')}\n${day.lessonGrades.map((l) => `${l.name}: ${l.grades.map((g) => g.join('/')).join(', ')}`).join('\n',)}`)).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('На этой неделе оценок нет')
        }
      } else if (estimateResult?.periodGradesTable) {
        const disciplines = estimateResult.periodGradesTable.disciplines.filter((d) => d.grades.reduce((sum, next) => sum + next.grades.length, 0) > 0)
        if (disciplines.length > 0) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\nОценки за ${escMd(periodName)}\n\n${disciplines.map(
            (d) => `${escMd(d.name)}: ${escMd(d.grades.filter((x) => x.grades.length > 0).map((x) => x.grades.map((g) => g.join('/')).join(', ')).join(', '))} · *${escMd(round(d.averageGrade, 2).toString())}* ${escMd(`(ср.взвеш. ${round(d.averageWeightedGrade, 2).toString()})`)}`
          ).join('\n')}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('Оценок пока нет')
        }
      } else if (estimateResult?.yearGradesTable) {
        const y = estimateResult.yearGradesTable
        if (y.lessonGrades.length > 0) {
          await ctx.reply(`*${getSelectedStudentName(ctx)}*\n${escMd('Итоговые оценки (ср./ср.взвеш.)')}\n\n${y.lessonGrades.map((l) => `${escMd(l.lesson.name)}\n${l.grades.map((g) => g.finallygrade ? `*${escMd(String(g.finallygrade))}*` : escMd(`${round(g.averageGrade, 2).toString()}/${round(g.averageWeightedGrade, 2).toString()}`)).join(' · ')}`).join('\n')}`, { parse_mode: 'MarkdownV2' })
        } else {
          await ctx.reply('Итоговых оценок пока нет')
        }
      } else {
        await ctx.reply('Пока оценок нет')
      }

      await ctx.deleteMessage()
    }

    await ctx.scene.enter('student_scene', { needNewMessage: true })
  })

  scene.action('menu_back', async (ctx) => {
    await ctx.scene.enter('student_scene')
  })

  return scene
}
