type TDnevnikClientError = {
  path: string
  status: number
  statusText: string
}

export class DnevnikClientHttpResponseError extends Error {
  path: string
  status: number
  statusText: string
  
  constructor(args: TDnevnikClientError) {
    super()
    this.path = args.path
    this.status = args.status
    this.statusText = args.statusText
  }
}

export class DnevnikClientUnauthorizedError extends DnevnikClientHttpResponseError { }

export class DnevnikClientExternalServerError extends DnevnikClientHttpResponseError { }
