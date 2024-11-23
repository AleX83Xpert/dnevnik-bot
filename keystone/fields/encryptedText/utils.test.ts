import { faker } from '@faker-js/faker'
import { decrypt, encrypt } from './utils'

describe('encryptedText', () => {
  test('shold get same value after encrypt-decrypt', () => {
    const key = faker.string.alphanumeric(32)
    const originalText = faker.string.alphanumeric(200)
    const encryptedText = encrypt(originalText, key)
    const decryptedText = decrypt(encryptedText, key)

    expect(decryptedText).toBe(originalText)
  })

  describe('should throw an error on invalid key length', () => {
    const cases = [12, 16, 31, 33, 48, 64, 100, 127]

    test.each(cases)('key length %p should throw an error', (keyLen) => {
      const key = faker.string.alphanumeric(keyLen)
      const originalText = faker.string.alphanumeric(200)
      expect(() => encrypt(originalText, key)).toThrow('Invalid key length')
    })
  })
})