import { KeystoneContext } from "@keystone-6/core/types"
import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types"
import { Scenes, Markup } from 'telegraf'
import { getSelectedStudent, getSelectedStudentName } from "../botUtils"
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher"
import { escapeMarkdown, formatScheduleDay, formatStudentMainMenuTitle } from "../../utils/messageMarkdownV2Formatters"
import dayjs from "dayjs"
import { chunk, lowerCase, round } from "lodash"
import { TEstimatePeriod } from "../../clients/DnevnikClientTypes"

export function getStudentGradesScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const scene = new Scenes.BaseScene<DnevnikContext>('student_grades_scene')

  let gPeriods: TEstimatePeriod[] // TODO move to scene init

  scene.enter(async (ctx) => {
    const student = getSelectedStudent(ctx)
    const telegramUser = ctx.session.telegramUser

    if (student) {
      const yearsResult = await fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'estimateYears', params: { studentId: student.id } } })
      if (yearsResult) {
        const schoolYear = yearsResult.currentYear.id

        const data = await Promise.all([
          fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'estimatePeriods', params: { studentId: student.id, schoolYear } } }),
          fetchFromDnevnik({ godContext, ctx, telegramUser, request: { action: 'classes', params: { studentId: student.id, schoolYear } } }),
        ])

        if (data && data[0] && data[1] && data[0].periods && data[1].currentClass) {
          const periods = data[0].periods
          const classId = data[1].currentClass.value
          gPeriods = periods

          if (ctx.session && !ctx.session.estimate) {
            ctx.session.estimate = { schoolYear, classId }
          }

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
    const student = getSelectedStudent(ctx)

    if (student) {
      const telegramUser = ctx.session.telegramUser
      const periodId = ctx.match[1]
      const periodName = lowerCase(gPeriods.find(({ id }) => id === periodId)?.name)

      if (ctx.session && ctx.session.estimate) {
        const { schoolYear, classId } = ctx.session.estimate

        const estimateResult = await fetchFromDnevnik({
          godContext, ctx, telegramUser, request: {
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
            await ctx.reply(`*${getSelectedStudentName(ctx)}*\nОценки за неделю ${escapeMarkdown(`${dayjs(w.beginDate).format('D MMM')} - ${dayjs(w.endDate).format('D MMM')}`)}\n\n${w.days.map((day) => escapeMarkdown(`${dayjs(day.date).format('D MMMM')}\n${day.lessonGrades.map((l) => `${l.name}: ${l.grades.map((g) => g.join('/')).join(', ')}`).join('\n',)}`)).join('\n\n')}`, { parse_mode: 'MarkdownV2' })
          } else {
            await ctx.reply('На этой неделе оценок нет')
          }
        } else if (estimateResult?.periodGradesTable) {
          const disciplines = estimateResult.periodGradesTable.disciplines.filter((d) => d.grades.reduce((sum, next) => sum + next.grades.length, 0) > 0)
          if (disciplines.length > 0) {
            await ctx.reply(`*${getSelectedStudentName(ctx)}*\nОценки за ${escapeMarkdown(periodName)}\n\n${disciplines.map(
              (d) => `${escapeMarkdown(d.name)}: ${escapeMarkdown(d.grades.filter((x) => x.grades.length > 0).map((x) => x.grades.map((g) => g.join('/')).join(', ')).join(', '))} · *${escapeMarkdown(round(d.averageGrade, 2).toString())}* ${escapeMarkdown(`(ср.взвеш. ${round(d.averageWeightedGrade, 2).toString()})`)}`
            ).join('\n')}`, { parse_mode: 'MarkdownV2' })
          } else {
            await ctx.reply('Оценок пока нет')
          }
        } else if (estimateResult?.yearGradesTable) {
          const y = estimateResult.yearGradesTable
          if (y.lessonGrades.length > 0) {
            await ctx.reply(`*${getSelectedStudentName(ctx)}*\n${escapeMarkdown('Итоговые оценки (ср./ср.взвеш.)')}\n\n${escapeMarkdown(y.lessonGrades.map((l) => `${l.lesson.name}\n${l.grades.map((g) => g.finallygrade ? `*${g.finallygrade}*` : `${round(g.averageGrade, 2).toString()}/${round(g.averageWeightedGrade, 2).toString()}`).join(' · ')}`).join('\n'))}`, { parse_mode: 'MarkdownV2' })
          } else {
            await ctx.reply('Итоговых оценок пока нет')
          }
        } else {
          await ctx.reply('Пока оценок нет')
        }

        await ctx.deleteMessage()
      }
    }

    await ctx.scene.enter('student_scene', { needNewMessage: true })
  })

  scene.action('menu_back', async (ctx) => {
    await ctx.scene.enter('student_scene')
  })

  return scene
}
