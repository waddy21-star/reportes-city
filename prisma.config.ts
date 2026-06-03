import { defineConfig } from 'prisma/config'
import path from 'path'

const dbPath = path.resolve('./prisma/dev.db')

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
})
