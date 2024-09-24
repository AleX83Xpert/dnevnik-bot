export class DnevnikClientHttpResponseError extends Error {
  constructor(status: number, statusText: string) {
    super()
  }
}

export class DnevnikClientUnauthorizedError extends DnevnikClientHttpResponseError { }

export class DnevnikClientExternalServerError extends DnevnikClientHttpResponseError { }
