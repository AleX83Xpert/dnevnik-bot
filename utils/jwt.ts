import dayjs from "dayjs"
import { get } from "lodash"
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export function getTokenExpirationDate (token: string): string {
  const forceAccessTokenTtl = config.forceAccessTokenTtl
  let tokenExpirationDate = dayjs().add(config.tokensTtlSec, 'seconds').toISOString()

  if (forceAccessTokenTtl) {
    return tokenExpirationDate
  }
  
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
