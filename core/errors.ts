export class NoUserError extends Error {
  override name = 'NoUserError'
}
export class NoTokensError extends Error {
  override name = 'NoTokensError'
}
export class AuthenticationExpiredError extends Error {
  override name = 'AuthenticationExpiredError'
}
export class DiaryUnavailableError extends Error {
  override name = 'DiaryUnavailableError'
}
