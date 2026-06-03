import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.resolve('./prisma/dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Admin user
  const hashedPassword = await bcrypt.hash('Admin2024!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@citymall.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@citymall.com',
      password: hashedPassword,
      role: 'ADMIN',
      department: null,
      active: true,
    },
  })

  // Security tasks
  const securityTasks = [
    {
      name: 'Reportar Apertura Parcial del CC',
      timeSlot: '04:30',
      order: 1,
      checklist: ['Confirmar apertura parcial', 'Registrar hora de inicio', 'Notificar a personal'],
    },
    {
      name: 'Verificar Portones',
      timeSlot: '04:30',
      order: 2,
      checklist: ['Portón norte abierto', 'Portón sur abierto', 'Portón este abierto', 'Portón oeste abierto'],
    },
    {
      name: 'Verificar Gradas Encendidas',
      timeSlot: '04:30',
      order: 3,
      checklist: ['Gradas norte encendidas', 'Gradas sur encendidas', 'Gradas este encendidas', 'Gradas oeste encendidas'],
    },
    {
      name: 'Recorrido Puestos de Ingreso y Salida',
      timeSlot: '06:00',
      order: 4,
      checklist: ['Puesto norte revisado', 'Puesto sur revisado', 'Puesto este revisado', 'Equipo en buen estado', 'Personal presente'],
    },
    {
      name: 'Revisión de Pasillos',
      timeSlot: '06:00',
      order: 5,
      checklist: ['Pasillo principal libre', 'Pasillo norte libre', 'Pasillo sur libre', 'Sin obstáculos'],
    },
    {
      name: 'Recibir Oficiales y Entrega de Equipos',
      timeSlot: '09:00',
      order: 6,
      checklist: ['Personal recibido', 'Radios entregados', 'Equipos en buen estado', 'Registro firmado'],
    },
    {
      name: 'Apertura del CC',
      timeSlot: '10:00',
      order: 7,
      checklist: ['Puertas principales abiertas', 'Sistema de alarma desactivado', 'Iluminación activa'],
    },
    {
      name: 'Revisión de Áreas Comunes',
      timeSlot: '10:00',
      order: 8,
      checklist: ['Área de food court ok', 'Área de juegos ok', 'Baños operativos', 'Sin incidencias'],
    },
    {
      name: 'Revisión de Parqueos',
      timeSlot: '12:00',
      order: 9,
      checklist: ['Parqueo nivel 1 ok', 'Parqueo nivel 2 ok', 'Cámaras funcionando', 'Accesos libres'],
    },
    {
      name: 'Recorrido por Comerciales',
      timeSlot: '13:00',
      order: 10,
      checklist: ['Locales cerrados correctamente', 'Sin locales abiertos fuera de horario', 'Sin anomalías'],
    },
    {
      name: 'Recorrido Food Court y Zona Gastronómica',
      timeSlot: '15:00',
      order: 11,
      checklist: ['Food court en orden', 'Mesas limpias', 'Zona gastronómica ok', 'Sin incidencias'],
    },
    {
      name: 'Recorrido General',
      timeSlot: '16:00',
      order: 12,
      checklist: ['Recorrido completado', 'Sin anomalías detectadas', 'Reporte de novedades'],
    },
    {
      name: 'Cierre Parcial del CC',
      timeSlot: '21:00',
      order: 13,
      checklist: ['Portones parcialmente cerrados', 'Personal notificado', 'Áreas restringidas aseguradas'],
    },
    {
      name: 'Revisión de Locales y Quioscos',
      timeSlot: '21:10',
      order: 14,
      checklist: ['Todos los locales cerrados', 'Quioscos cerrados y seguros', 'Sin personal ajeno'],
    },
    {
      name: 'Reportar Cierre Total',
      timeSlot: '01:00',
      order: 15,
      checklist: ['Cierre total confirmado', 'Sistemas de seguridad activos', 'Reporte firmado'],
    },
    {
      name: 'Revisión de Azotea',
      timeSlot: '02:30',
      order: 16,
      checklist: ['Accesos a azotea revisados', 'Sin personas no autorizadas', 'Equipos ok'],
    },
    {
      name: 'Levantamiento de Placas',
      timeSlot: '04:00',
      order: 17,
      checklist: ['Placas registradas', 'Vehículos identificados', 'Reporte generado'],
    },
  ]

  for (const taskData of securityTasks) {
    const existing = await prisma.task.findFirst({
      where: { name: taskData.name, department: 'SEGURIDAD' },
    })
    if (!existing) {
      await prisma.task.create({
        data: {
          name: taskData.name,
          department: 'SEGURIDAD',
          timeSlot: taskData.timeSlot,
          order: taskData.order,
          isCustom: false,
          checkItems: {
            create: taskData.checklist.map((label, idx) => ({
              label,
              order: idx,
            })),
          },
        },
      })
    }
  }

  // Electrical tasks
  const electricalTasks = [
    'SubEstación A',
    'SubEstación B',
    'SubEstación C',
    'SubEstación E',
    'SubEstación F',
    'SubEstación G',
    'SubEstación 4F',
    'Elevador de Carga E1',
    'Elevador de Carga E2',
    'Elevador de Carga E3',
    'Elevador de Carga E4',
    'Elevador de Carga E5',
    'Elevador de Carga E6',
    'Elevador de Clientes Norte',
    'Elevador de Clientes Sur',
    'Gradas Eléctricas Norte',
    'Gradas Eléctricas Sur',
    'Gradas Eléctricas Este',
    'Gradas Eléctricas Oeste',
    'Sistema de Iluminación',
  ]

  for (let i = 0; i < electricalTasks.length; i++) {
    const name = electricalTasks[i]
    const existing = await prisma.task.findFirst({
      where: { name, department: 'ELECTRICO' },
    })
    if (!existing) {
      await prisma.task.create({
        data: {
          name,
          department: 'ELECTRICO',
          order: i + 1,
          isCustom: false,
        },
      })
    }
  }

  // Civil tasks
  const civilTaskNames = [
    'Azoteas Limpieza e Impermeabilización',
    'Remplazo de Porcelanato',
    'Pintura General Cielos y Paredes',
    'Revisión de Varandales y Vidrios Comercial',
    'Revisión Juntas Sísmicas',
    'Revisión de Loza Sanitarias y Grifos Lavamanos',
    'Revisión Jardinería',
    'Revisión de Cubos',
    'Revisión Puertas de Emergencias',
    'Parqueo Pintura Topes',
    'Mallas Colindantes',
    'Revisión Parrillas Entradas',
    'Puertas Lobbys',
  ]

  const civilCount = await prisma.task.count({ where: { department: 'CIVIL' } })
  if (civilCount === 0) {
    for (let i = 0; i < civilTaskNames.length; i++) {
      await prisma.task.create({
        data: {
          name: civilTaskNames[i],
          department: 'CIVIL',
          order: i + 1,
          isCustom: false,
        },
      })
    }
  }

  // Refrigeration Mall tasks
  const refrigMallTaskNames = [
    'Mantenimiento UMAs',
    'Mantenimiento Chillers',
    'Mantenimiento Torres de Enfriamiento',
    'Mantenimiento Bombas de Agua',
    'Mantenimiento Inyectores y Extractores',
    'Revisión de Rejillas (Baños y Centro Comercial)',
    'Revisión de Temperatura',
  ]

  const refrigCount = await prisma.task.count({ where: { department: 'REFRIGERACION' } })
  if (refrigCount === 0) {
    for (let i = 0; i < refrigMallTaskNames.length; i++) {
      await prisma.task.create({
        data: {
          name: refrigMallTaskNames[i],
          department: 'REFRIGERACION',
          timeSlot: 'MALL',
          order: i + 1,
          isCustom: false,
        },
      })
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
