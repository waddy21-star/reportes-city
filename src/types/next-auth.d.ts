import { DefaultSession } from 'next-auth'

// Campos propios que añadimos al usuario autenticado (rol y departamento).
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      department: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    department: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    department: string | null
  }
}
