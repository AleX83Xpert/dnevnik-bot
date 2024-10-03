import { getContext } from '@keystone-6/core/context'
import { resetDatabase } from '@keystone-6/core/testing'
import * as PrismaModule from '.prisma/client'
import config from '../keystone'

export const createTestGodContext = async () => {
  return getContext(config, PrismaModule).sudo()
}
