import pino from 'pino'

export function getLogger (name: string) {
  return pino({
    name,
    timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  })
}
