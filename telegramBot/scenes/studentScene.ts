import { BaseScene } from "telegraf/typings/scenes"
import { DnevnikContext } from "../types";
import { findTelegramUser, getSelectedStudent, getSelectedStudentName } from "../botUtils";
import { Scenes, Markup } from 'telegraf';
import { fetchFromDnevnik } from "../../utils/dnevnikFetcher";
import { KeystoneContext } from "@keystone-6/core/types";
import dayjs from "dayjs";
import { escapeMarkdown, formatScheduleDay, formatStudentMainMenuTitle } from "../../utils/messageMarkdownV2Formatters";

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Расписание', 'menu_schedule'),
      Markup.button.callback('📚 Домашка', 'menu_homework'),
      Markup.button.callback('📊 Оценки', 'menu_grades')
    ],
    [
      Markup.button.callback('◀️ Выбрать другого ученика', 'menu_select_student')
    ],
  ])
}

function scheduleMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🙉 Сегодня', 'schedule_today'),
      Markup.button.callback('🙈 Завтра', 'schedule_tomorrow'),
      Markup.button.callback('🙊 Неделя', 'schedule_week'),
    ],
    [
      Markup.button.callback('◀️ Назад', 'menu_back'),
    ],
  ])
}

function homeworkMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('😲 Завтра', 'homework_tomorrow'),
      Markup.button.callback('🫣 Неделя', 'homework_this_week'),
      Markup.button.callback('😵 След. неделя', 'homework_next_week'),
    ],
    [
      Markup.button.callback('◀️', 'menu_back'),
    ],
  ])
}

export function getStudentScene(godContext: KeystoneContext): BaseScene<DnevnikContext> {
  const mainScene = new Scenes.BaseScene('student_scene')
  let telegramUser

  mainScene.enter(async (ctx: DnevnikContext) => {
    const telegramId = String(ctx.from.id)
    telegramUser = await findTelegramUser(godContext, telegramId)
    ctx.editMessageText(formatStudentMainMenuTitle(getSelectedStudent(ctx)), { ...mainMenu(), parse_mode: 'MarkdownV2' })
  })

  // Меню расписания
  mainScene.action('menu_schedule', (ctx: DnevnikContext) => {
    ctx.editMessageText('Выберите расписание', scheduleMenu())
  })

  mainScene.action('schedule_today', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().add(1, 'day').format('YYYY-MM-DD') }
      }
    })

    const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD'))

    if (day) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на сегодня, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.reply('Сегодня уроков нет 🥵')
    }
  })

  mainScene.action('schedule_tomorrow', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().add(1, 'day').format('YYYY-MM-DD') }
      }
    })

    const day = scheduleResult.scheduleModel.days.find((day) => dayjs(day.date).format('YYYY-MM-DD') === dayjs().add(1, 'day').format('YYYY-MM-DD'))

    if (day) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание на завтра, ${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.reply('Завтра уроков нет 🥵')
    }
  })

  mainScene.action('schedule_week', async (ctx: DnevnikContext) => {
    const student = getSelectedStudent(ctx)
    const scheduleResult = await fetchFromDnevnik({
      godContext,
      ctx,
      telegramUser,
      request: {
        action: 'schedule',
        params: { studentId: student.id, date: dayjs().format('YYYY-MM-DD') }
      }
    })

    const days = scheduleResult.scheduleModel.days.filter((day) => dayjs(day.date).format('YYYY-MM-DD') > dayjs().add(1, 'day').format('YYYY-MM-DD') && day.scheduleDayLessonModels && day.scheduleDayLessonModels.length > 0)

    if (days.length > 0) {
      ctx.reply(`*${getSelectedStudentName(ctx)}*\nРасписание до конца недели\n\n${days.map((day) => `${escapeMarkdown(day.dayOfWeekName)}, ${escapeMarkdown(dayjs(day.date).format('D MMM'))}:\n${formatScheduleDay(day)}`).join('\n\n')}`, { parse_mode: 'MarkdownV2' }).then(() => {
        ctx.reply(formatStudentMainMenuTitle(student), { ...mainMenu(), parse_mode: 'MarkdownV2' })
        ctx.deleteMessage()
      })
    } else {
      ctx.reply('На этой неделе уроков больше нет 🥵')
    }
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
      ctx.scene.enter('select_student')
    })
  })

  return mainScene
}
