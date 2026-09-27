/* eslint-disable */

export type UserWhereUniqueInput = {
  readonly id?: string | null
  readonly email?: string | null
}

export type UserWhereInput = {
  readonly AND?: ReadonlyArray<UserWhereInput> | UserWhereInput | null
  readonly OR?: ReadonlyArray<UserWhereInput> | UserWhereInput | null
  readonly NOT?: ReadonlyArray<UserWhereInput> | UserWhereInput | null
  readonly id?: IDFilter | null
  readonly name?: StringFilter | null
  readonly email?: StringFilter | null
  readonly isAdmin?: BooleanFilter | null
  readonly createdAt?: DateTimeNullableFilter | null
  readonly updatedAt?: DateTimeNullableFilter | null
}

export type IDFilter = {
  readonly equals?: string | null
  readonly in?: ReadonlyArray<string> | string | null
  readonly notIn?: ReadonlyArray<string> | string | null
  readonly lt?: string | null
  readonly lte?: string | null
  readonly gt?: string | null
  readonly gte?: string | null
  readonly not?: IDFilter | null
}

export type StringFilter = {
  readonly equals?: string | null
  readonly in?: ReadonlyArray<string> | string | null
  readonly notIn?: ReadonlyArray<string> | string | null
  readonly lt?: string | null
  readonly lte?: string | null
  readonly gt?: string | null
  readonly gte?: string | null
  readonly contains?: string | null
  readonly startsWith?: string | null
  readonly endsWith?: string | null
  readonly mode?: QueryMode | null
  readonly not?: NestedStringFilter | null
}

export type QueryMode =
  | 'default'
  | 'insensitive'

export type NestedStringFilter = {
  readonly equals?: string | null
  readonly in?: ReadonlyArray<string> | string | null
  readonly notIn?: ReadonlyArray<string> | string | null
  readonly lt?: string | null
  readonly lte?: string | null
  readonly gt?: string | null
  readonly gte?: string | null
  readonly contains?: string | null
  readonly startsWith?: string | null
  readonly endsWith?: string | null
  readonly not?: NestedStringFilter | null
}

export type BooleanFilter = {
  readonly equals?: boolean | null
  readonly not?: BooleanFilter | null
}

export type DateTimeNullableFilter = {
  readonly equals?: any | null
  readonly in?: ReadonlyArray<any> | any | null
  readonly notIn?: ReadonlyArray<any> | any | null
  readonly lt?: any | null
  readonly lte?: any | null
  readonly gt?: any | null
  readonly gte?: any | null
  readonly not?: DateTimeNullableFilter | null
}

export type UserOrderByInput = {
  readonly id?: OrderDirection | null
  readonly name?: OrderDirection | null
  readonly email?: OrderDirection | null
  readonly isAdmin?: OrderDirection | null
  readonly createdAt?: OrderDirection | null
  readonly updatedAt?: OrderDirection | null
}

export type OrderDirection =
  | 'asc'
  | 'desc'

export type UserUpdateInput = {
  readonly name?: string | null
  readonly email?: string | null
  readonly password?: string | null
  readonly isAdmin?: boolean | null
  readonly createdAt?: any | null
  readonly updatedAt?: any | null
}

export type UserUpdateArgs = {
  readonly where: UserWhereUniqueInput
  readonly data: UserUpdateInput
}

export type UserCreateInput = {
  readonly name?: string | null
  readonly email?: string | null
  readonly password?: string | null
  readonly isAdmin?: boolean | null
  readonly createdAt?: any | null
  readonly updatedAt?: any | null
}

export type MessengerUserWhereUniqueInput = {
  readonly id?: string | null
}

export type MessengerUserWhereInput = {
  readonly AND?: ReadonlyArray<MessengerUserWhereInput> | MessengerUserWhereInput | null
  readonly OR?: ReadonlyArray<MessengerUserWhereInput> | MessengerUserWhereInput | null
  readonly NOT?: ReadonlyArray<MessengerUserWhereInput> | MessengerUserWhereInput | null
  readonly id?: IDFilter | null
  readonly platform?: StringFilter | null
  readonly platformUserId?: StringFilter | null
  readonly dnevnikAccessToken?: EncryptedTextFilter | null
  readonly dnevnikAccessTokenExpirationDate?: DateTimeNullableFilter | null
  readonly dnevnikRefreshToken?: EncryptedTextFilter | null
  readonly dnevnikTokensUpdatedAt?: DateTimeNullableFilter | null
  readonly isBlocked?: BooleanFilter | null
  readonly createdAt?: DateTimeNullableFilter | null
  readonly updatedAt?: DateTimeNullableFilter | null
}

export type EncryptedTextFilter = {
  readonly equals?: string | null
  readonly not?: EncryptedTextFilter | null
}

export type MessengerUserOrderByInput = {
  readonly id?: OrderDirection | null
  readonly platform?: OrderDirection | null
  readonly platformUserId?: OrderDirection | null
  readonly dnevnikAccessToken?: OrderDirection | null
  readonly dnevnikAccessTokenExpirationDate?: OrderDirection | null
  readonly dnevnikRefreshToken?: OrderDirection | null
  readonly dnevnikTokensUpdatedAt?: OrderDirection | null
  readonly isBlocked?: OrderDirection | null
  readonly createdAt?: OrderDirection | null
  readonly updatedAt?: OrderDirection | null
}

export type MessengerUserUpdateInput = {
  readonly platform?: string | null
  readonly platformUserId?: string | null
  readonly dnevnikAccessToken?: string | null
  readonly dnevnikAccessTokenExpirationDate?: any | null
  readonly dnevnikRefreshToken?: string | null
  readonly dnevnikTokensUpdatedAt?: any | null
  readonly isBlocked?: boolean | null
  readonly meta?: import('@keystone-6/core/types').JSONValue | null
  readonly createdAt?: any | null
  readonly updatedAt?: any | null
}

export type MessengerUserUpdateArgs = {
  readonly where: MessengerUserWhereUniqueInput
  readonly data: MessengerUserUpdateInput
}

export type MessengerUserCreateInput = {
  readonly platform?: string | null
  readonly platformUserId?: string | null
  readonly dnevnikAccessToken?: string | null
  readonly dnevnikAccessTokenExpirationDate?: any | null
  readonly dnevnikRefreshToken?: string | null
  readonly dnevnikTokensUpdatedAt?: any | null
  readonly isBlocked?: boolean | null
  readonly meta?: import('@keystone-6/core/types').JSONValue | null
  readonly createdAt?: any | null
  readonly updatedAt?: any | null
}

export type KeystoneAdminUIFieldMetaIsNonNull =
  | 'read'
  | 'create'
  | 'update'

export type KeystoneAdminUIFieldMetaItemViewFieldPosition =
  | 'form'
  | 'sidebar'

export type KeystoneAdminUIFieldMetaListViewFieldMode =
  | 'read'
  | 'hidden'

export type KeystoneAdminUIActionMetaItemViewNavigation =
  | 'follow'
  | 'refetch'
  | 'return'

export type KeystoneAdminUISortDirection =
  | 'ASC'
  | 'DESC'

type ResolvedUserCreateInput = {
  id?: import('../prisma/client.js').Prisma.UserCreateInput['id']
  name?: import('../prisma/client.js').Prisma.UserCreateInput['name']
  email?: import('../prisma/client.js').Prisma.UserCreateInput['email']
  password: import('../prisma/client.js').Prisma.UserCreateInput['password']
  isAdmin?: import('../prisma/client.js').Prisma.UserCreateInput['isAdmin']
  createdAt?: import('../prisma/client.js').Prisma.UserCreateInput['createdAt']
  updatedAt?: import('../prisma/client.js').Prisma.UserCreateInput['updatedAt']
}
type ResolvedUserUpdateInput = {
  id?: undefined
  name?: import('../prisma/client.js').Prisma.UserUpdateInput['name']
  email?: import('../prisma/client.js').Prisma.UserUpdateInput['email']
  password?: import('../prisma/client.js').Prisma.UserUpdateInput['password']
  isAdmin?: import('../prisma/client.js').Prisma.UserUpdateInput['isAdmin']
  createdAt?: import('../prisma/client.js').Prisma.UserUpdateInput['createdAt']
  updatedAt?: import('../prisma/client.js').Prisma.UserUpdateInput['updatedAt']
}
type ResolvedMessengerUserCreateInput = {
  id?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['id']
  label?: undefined
  platform?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['platform']
  platformUserId?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['platformUserId']
  isTokenActual?: undefined
  dnevnikAccessToken?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['dnevnikAccessToken']
  dnevnikAccessTokenExpirationDate?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['dnevnikAccessTokenExpirationDate']
  dnevnikRefreshToken?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['dnevnikRefreshToken']
  dnevnikTokensUpdatedAt?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['dnevnikTokensUpdatedAt']
  isBlocked?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['isBlocked']
  meta?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['meta']
  createdAt?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['createdAt']
  updatedAt?: import('../prisma/client.js').Prisma.MessengerUserCreateInput['updatedAt']
}
type ResolvedMessengerUserUpdateInput = {
  id?: undefined
  label?: undefined
  platform?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['platform']
  platformUserId?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['platformUserId']
  isTokenActual?: undefined
  dnevnikAccessToken?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['dnevnikAccessToken']
  dnevnikAccessTokenExpirationDate?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['dnevnikAccessTokenExpirationDate']
  dnevnikRefreshToken?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['dnevnikRefreshToken']
  dnevnikTokensUpdatedAt?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['dnevnikTokensUpdatedAt']
  isBlocked?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['isBlocked']
  meta?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['meta']
  createdAt?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['createdAt']
  updatedAt?: import('../prisma/client.js').Prisma.MessengerUserUpdateInput['updatedAt']
}

export declare namespace Lists {
  export type User<Session = any> = import('@keystone-6/core/types').ListConfig<Lists.User.TypeInfo<Session>>
  namespace User {
    export type Item = import('../prisma/client.js').User
    export type TypeInfo<Session = any> = {
      key: 'User'
      isSingleton: false
      fields: 'id' | 'name' | 'email' | 'password' | 'isAdmin' | 'createdAt' | 'updatedAt'
      actions: never
      item: Item
      inputs: {
        where: UserWhereInput
        uniqueWhere: UserWhereUniqueInput
        create: UserCreateInput
        update: UserUpdateInput
        orderBy: UserOrderByInput
      }
      prisma: {
        create: ResolvedUserCreateInput
        update: ResolvedUserUpdateInput
      }
      all: __TypeInfo<Session>
    }
  }
  export type MessengerUser<Session = any> = import('@keystone-6/core/types').ListConfig<Lists.MessengerUser.TypeInfo<Session>>
  namespace MessengerUser {
    export type Item = import('../prisma/client.js').MessengerUser
    export type TypeInfo<Session = any> = {
      key: 'MessengerUser'
      isSingleton: false
      fields: 'id' | 'label' | 'platform' | 'platformUserId' | 'isTokenActual' | 'dnevnikAccessToken' | 'dnevnikAccessTokenExpirationDate' | 'dnevnikRefreshToken' | 'dnevnikTokensUpdatedAt' | 'isBlocked' | 'meta' | 'createdAt' | 'updatedAt'
      actions: never
      item: Item
      inputs: {
        where: MessengerUserWhereInput
        uniqueWhere: MessengerUserWhereUniqueInput
        create: MessengerUserCreateInput
        update: MessengerUserUpdateInput
        orderBy: MessengerUserOrderByInput
      }
      prisma: {
        create: ResolvedMessengerUserCreateInput
        update: ResolvedMessengerUserUpdateInput
      }
      all: __TypeInfo<Session>
    }
  }
}
export type Context<Session = any> = import('@keystone-6/core/types').KeystoneContext<TypeInfo<Session>>
export type Config<Session = any> = import('@keystone-6/core/types').KeystoneConfig<TypeInfo<Session>>

export type TypeInfo<Session = any> = {
  lists: {
    readonly User: Lists.User.TypeInfo<Session>
    readonly MessengerUser: Lists.MessengerUser.TypeInfo<Session>
  }
  prisma: import('../prisma/client.js').PrismaClient
  prismaClientOptions: import('../prisma/client.js').Prisma.PrismaClientOptions
  session: Session
  dbProvider: 'postgresql'
}

type __TypeInfo<Session = any> = TypeInfo<Session>

export type Lists<Session = any> = {
  [Key in keyof TypeInfo['lists']]?: import('@keystone-6/core/types').ListConfig<TypeInfo<Session>['lists'][Key]>
} & Record<string, import('@keystone-6/core/types').ListConfig<any>>

export {}
