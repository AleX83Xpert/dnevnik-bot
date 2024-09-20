import { KeystoneContext } from "@keystone-6/core/types"
import { getLogger } from "./logger"

const logger = getLogger('dnevnikTokensRefresher')

export function startTokensRefresher(godContext: KeystoneContext) {
  setInterval(async () => {
    logger.info({ msg: 'refresh tokens' })
  }, 300000)
}
