import { describe, beforeAll, test, expect } from "vitest"
import { createTestGodContext, createTestUser } from './testUtils/lists.test.utils.ts'
import { faker } from "@faker-js/faker"

describe('User', () => {
  let context: any

  beforeAll(async () => {
    context = await createTestGodContext()
  })

  test('can create a user with required fields', async () => {
    const name = faker.person.fullName()
    const email = faker.internet.email()
    const password = faker.internet.password()

    const user = await createTestUser(context, { name, email, password })

    expect(user.name).toBe(name)
    expect(user.email).toBe(email)
    expect(user.password).toBe(password)
    expect(user.isAdmin).toBe(false)
  })

  test('can create an admin user', async () => {
    const user = await createTestUser(context, { isAdmin: true })
    expect(user.isAdmin).toBe(true)
  })

  test('email is unique', async () => {
    const email = faker.internet.email()
    await createTestUser(context, { email })
    await expect(createTestUser(context, { email })).rejects.toThrow()
  })

  test('can delete a user', async () => {
    const user = await createTestUser(context)
    await context.query.User.deleteOne({ where: { id: user.id } })
    const deletedUser = await context.query.User.findOne({ where: { id: user.id }, query: 'id' })
    expect(deletedUser).toBeNull()
  })
})
