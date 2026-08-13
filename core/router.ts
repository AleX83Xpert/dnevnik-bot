import { KeystoneContext } from '@keystone-6/core/types'
import { BotContext, ConversationState, DomainEvent } from './types'
import {
  onStart, onLogin, onLogout, onSendTokens,
  enterState,
  handleSelectStudent,
  handleMenuSchedule, handleMenuHomework, handleMenuGrades, handleMenuSelectStudent,
  handleScheduleToday, handleScheduleTomorrow, handleScheduleThisWeek, handleScheduleNextWeek,
  handleHomeworkToday, handleHomeworkTomorrow, handleHomeworkThisWeek, handleHomeworkNextWeek,
  handlePeriodSelect, handleBackToMainMenu,
} from './handlers'

type ActionHandler = (godContext: KeystoneContext, ctx: BotContext, actionId: string) => Promise<void>

interface Scene {
  actions: Record<string, ActionHandler>
  actionPatterns?: { pattern: RegExp; handler: ActionHandler }[]
}

const scenes: Record<string, Scene> = {
  AUTH_REQUIRED: { actions: {} },
  SELECTING_STUDENT: {
    actions: {},
    actionPatterns: [{ pattern: /^select_(.+)/, handler: handleSelectStudent }],
  },
  MAIN_MENU: {
    actions: {
      menu_schedule: handleMenuSchedule,
      menu_homework: handleMenuHomework,
      menu_grades: handleMenuGrades,
      menu_select_student: handleMenuSelectStudent,
    },
  },
  VIEWING_SCHEDULE: {
    actions: {
      schedule_today: handleScheduleToday,
      schedule_tomorrow: handleScheduleTomorrow,
      schedule_this_week: handleScheduleThisWeek,
      schedule_next_week: handleScheduleNextWeek,
      menu_back: handleBackToMainMenu,
    },
  },
  VIEWING_HOMEWORK: {
    actions: {
      homework_today: handleHomeworkToday,
      homework_tomorrow: handleHomeworkTomorrow,
      homework_this_week: handleHomeworkThisWeek,
      homework_next_week: handleHomeworkNextWeek,
      menu_back: handleBackToMainMenu,
    },
  },
  VIEWING_GRADES: {
    actions: {},
    actionPatterns: [
      { pattern: /^period_(.+)/, handler: handlePeriodSelect },
      { pattern: /^menu_back$/, handler: handleBackToMainMenu },
    ],
  },
}

export async function handleAction (
  godContext: KeystoneContext,
  ctx: BotContext,
  actionId: string
): Promise<void> {
  const stateName = ctx.session.state.name
  const scene = scenes[stateName]
  if (!scene) return

  // Try exact match first
  const handler = scene.actions[actionId]
  if (handler) {
    await handler(godContext, ctx, actionId)
    return
  }

  // Try pattern match
  if (scene.actionPatterns) {
    for (const { pattern, handler } of scene.actionPatterns) {
      if (pattern.test(actionId)) {
        await handler(godContext, ctx, actionId)
        return
      }
    }
  }
}

export { enterState }

export async function handleEvent (
  godContext: KeystoneContext,
  ctx: BotContext,
  event: DomainEvent
): Promise<void> {
  switch (event.type) {
    case 'START':
      return onStart(godContext, ctx)
    case 'COMMAND':
      if (event.command === 'login') return onLogin(godContext, ctx)
      if (event.command === 'logout') return onLogout(godContext, ctx)
      return
    case 'BUTTON_CLICKED':
      return handleAction(godContext, ctx, event.actionId)
    case 'TOKENS_RECEIVED':
      return onSendTokens(godContext, ctx, event.tokens)
    case 'MESSAGE':
      return  // ignore plain messages for now
  }
}
