type TDnevnikClientArgs = {
  accessToken: string
  refreshToken: string
}

type TRefreshTokenBody = {
  refreshToken: string
}

type TRefreshTokenResult = {
  accessToken: string
  accessTokenExpirationDate: string
  refreshToken: string
}

export class DnevnikClient {

  private apiUrl = 'https://dnevnik.egov66.ru/api'
  private dnevnikAccessToken: string
  private dnevnikRefreshToken: string

  constructor(args: TDnevnikClientArgs) {
    this.dnevnikAccessToken = args.accessToken
    this.dnevnikRefreshToken = args.refreshToken
  }

  private async fetch<TBody = object, TResult = object>(path: string, body: TBody) {
    const result = await fetch(`${this.apiUrl}${path}`, {
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${this.dnevnikAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      method: "POST"
    })

    if (result.status !== 200) {
      throw new Error(`Error status: ${result.status}`)
    }

    const data: TResult = await result.json()

    return data
  }

  public async refreshToken() {
    return await this.fetch<TRefreshTokenBody, TRefreshTokenResult>('/auth/Token/Refresh', { refreshToken: this.dnevnikRefreshToken })
  }

  public getHomeWork() { }
}
