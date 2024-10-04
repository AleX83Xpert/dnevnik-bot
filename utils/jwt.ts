import dayjs from "dayjs"
import { get } from "lodash"
import jwt from 'jsonwebtoken'
import { DEFAULT_TELEGRAM_TOKENS_TTL_SEC } from "./constants"

export function getTokenExpirationDate (token: string): string {
  let tokenExpirationDate = dayjs().add(Number(get(process.env, 'TELEGRAM_TOKENS_TTL_SEC', DEFAULT_TELEGRAM_TOKENS_TTL_SEC)), 'seconds').toISOString()
  
  const decodedToken = jwt.decode(token)
  if (decodedToken) {
    const exp = get(decodedToken, ['payload', 'exp'], get(decodedToken, 'exp'))
    if (exp) {
      const expDate = dayjs(exp * 1e3)
      if (expDate && expDate.isAfter(dayjs())) {
        tokenExpirationDate = expDate.toISOString()
      }
    }
  }

  return tokenExpirationDate
}
