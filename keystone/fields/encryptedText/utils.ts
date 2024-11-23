import crypto from 'crypto'

const CIPHER_SEPARATOR = ':'

export function encrypt (text: string, secretKey: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + CIPHER_SEPARATOR + encrypted
}

export function decrypt (text: string, secretKey: string) {
  const [iv, encryptedText] = text.split(CIPHER_SEPARATOR, 2)
  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, Buffer.from(iv, 'hex'))
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
