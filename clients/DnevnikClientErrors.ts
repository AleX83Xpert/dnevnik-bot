export class DnevnikClientHttpResponseError extends Error {
  status: number
  statusText: string
  
  constructor(status: number, statusText: string) {
    super()
    this.status = status
    this.statusText = statusText
  }
}

export class DnevnikClientUnauthorizedError extends DnevnikClientHttpResponseError { }

export class DnevnikClientExternalServerError extends DnevnikClientHttpResponseError { }
