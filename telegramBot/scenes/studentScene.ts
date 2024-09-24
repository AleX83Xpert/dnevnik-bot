import { BaseScene } from "telegraf/typings/scenes";
import { DnevnikContext } from "../types";
import { findOrCreateTelegramUser, getSelectedStudent, getSelectedStudentName } from "../botUtils";

import { Scenes, Markup } from 'telegraf';
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher";
import { KeystoneContext } from "@keystone-6/core/types";
import dayjs from "dayjs";

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Расписание', 'menu_schedule')],
    [Markup.button.callback('Домашка', 'menu_homework')],
    [Markup.button.callback('Оценки', 'menu_grades')],
    [Markup.button.callback('Выбрать другого ученика', 'menu_select_student')] // Кнопка для выбора другого ученика
  ])
}

function scheduleMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Завтра', 'schedule_tomorrow')],
    [Markup.button.callback('Неделя', 'schedule_week')],
    [Markup.button.callback('Назад', 'menu_back')],
  ])
}

function homeworkMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('На завтра', 'homework_tomorrow')],
    [Markup.button.callback('На эту неделю', 'homework_this_week')],
    [Markup.button.callback('На следующую неделю', 'homework_next_week')],
    [Markup.button.callback('Назад', 'menu_back')],
  ])
}

export function getStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const mainScene = new Scenes.BaseScene('student_scene')
  let telegramUser

  mainScene.enter(async (ctx: DnevnikContext) => {
    const telegramId = String(ctx.from.id)
    telegramUser = await findOrCreateTelegramUser(godContext, telegramId, ctx.from)
    ctx.editMessageText(`Главное меню для ученика: ${getSelectedStudentName(ctx)}`, mainMenu())
  })

  // Меню расписания
  mainScene.action('menu_schedule', (ctx: DnevnikContext) => {
    ctx.editMessageText('Меню расписания:', scheduleMenu())
  });

  mainScene.action('schedule_tomorrow', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    ctx.deleteMessage()
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().add(1, 'day').format('YYYY-MM-DD') }
      }
    })
    ctx.reply(`Расписание на завтра для ${getSelectedStudentName(ctx)}`).then(() => {
      ctx.reply(`Главное меню для ученика: ${student?.firstName}`, mainMenu())
    })
  })

  mainScene.action('schedule_week', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.reply(`Расписание на неделю для ${studentName}`);
  });

  // Меню домашки
  mainScene.action('menu_homework', (ctx: DnevnikContext) => {
    ctx.editMessageText('Меню домашки:', homeworkMenu());
  });

  mainScene.action('homework_tomorrow', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.reply(`Домашка на завтра для ${studentName}`);
  });

  mainScene.action('homework_this_week', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.reply(`Домашка на эту неделю для ${studentName}`);
  });

  mainScene.action('homework_next_week', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.reply(`Домашка на следующую неделю для ${studentName}`);
  });

  // Оценки
  mainScene.action('menu_grades', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.reply(`Оценки для ${studentName}`);
  });

  // Возврат к главному меню
  mainScene.action('menu_back', (ctx: DnevnikContext) => {
    const studentName = ctx.session.studentName;
    ctx.editMessageText(`Главное меню для ученика: ${studentName}`, mainMenu(studentName));
  });

  // Обработчик для кнопки "Выбрать другого ученика"
  mainScene.action('menu_select_student', (ctx: DnevnikContext) => {
    ctx.deleteMessage().then(() => {
      ctx.scene.enter('select_student'); // Переход обратно в сцену выбора ученика
    })
  })

  return mainScene
}
