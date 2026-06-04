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

  // Parking Sport tasks
  const parkingTasks = [
    // Área de parqueos
    {
      name: 'Ventanas abiertas con artículos expuestos',
      order: 1,
      checklist: ['Verificar ventanas de vehículos', 'Notificar a propietario si aplica', 'Registrar incidencia'],
    },
    {
      name: 'Derrame de aceites/gasolina',
      order: 2,
      checklist: ['Identificar área afectada', 'Colocar señalización', 'Notificar a mantenimiento', 'Registrar incidencia'],
    },
    {
      name: 'Objetos olvidados en cajeros',
      order: 3,
      checklist: ['Verificar cajeros automáticos', 'Registrar objetos encontrados', 'Entregar a custodia', 'Emitir reporte'],
    },
    {
      name: 'Insistentes',
      order: 4,
      checklist: [
        'Choches',
        'Averías',
        'Pérdidas de llave',
        'Motos saltando agujas',
        'Señales en mal estado',
        'Topes',
        'Capacidad en días de alto flujo',
        'Dinero en cajeros',
      ],
    },
    {
      name: 'En época de lluvia: conos por piso mojado',
      order: 5,
      checklist: ['Identificar áreas con piso mojado', 'Colocar conos de señalización', 'Verificar colocación correcta', 'Registrar áreas señalizadas'],
    },
    // Parte administrativa del parqueo
    {
      name: 'Revisión de validadoras',
      order: 6,
      checklist: ['Validadora nivel 1 operativa', 'Validadora nivel 2 operativa', 'Validadora nivel 3 operativa', 'Registrar incidencias'],
    },
    {
      name: 'Revisión en monitoreo de equipos',
      order: 7,
      checklist: ['Cajeros operativos', 'Agujas operativas', 'Compass operativo'],
    },
    {
      name: 'Verificación y monitoreo continuo de cajeros',
      order: 8,
      checklist: ['Billetes atorados', 'Falta de papel', 'Dispensadores de tickets'],
    },
    {
      name: 'Revisión vehicular para asignación de cuota diferenciada en aeropuertos',
      order: 9,
      checklist: ['Verificar vehículos con cuota diferenciada', 'Confirmar documentos habilitantes', 'Registrar asignaciones', 'Actualizar registro'],
    },
  ]

  const parkingCount = await prisma.task.count({ where: { department: 'PARKING_SPORT' } })
  if (parkingCount === 0) {
    for (const taskData of parkingTasks) {
      await prisma.task.create({
        data: {
          name: taskData.name,
          department: 'PARKING_SPORT',
          order: taskData.order,
          isCustom: false,
          checkItems: {
            create: taskData.checklist.map((label, idx) => ({ label, order: idx })),
          },
        },
      })
    }
  }

  // New Electrical tasks
  const newElectricTasks = [
    {
      name: 'Cuartos eléctricos',
      timeSlot: null as string | null,
      order: 100,
      checklist: [
        'CT-1A', 'CT-2A', 'CT-3A',
        'CT-1B', 'CT-2B', 'CT-3B',
        'CT-1C', 'CT-2C',
        'CT-1D', 'CT-2D', 'CT-3D',
        'CT-1E', 'CT-2E', 'CT-3E', 'CT-4E',
        'CT-1F', 'CT-2F', 'CT-3F',
        'CT-P1F', 'CT-P1B',
        'CT-CTC', 'CT-CTS2', 'CT-CTN2', 'CT-CTN3',
      ],
    },
    {
      name: 'Iluminación exterior y fachada',
      timeSlot: null as string | null,
      order: 101,
      checklist: [
        'Fachada norte operativa',
        'Fachada sur operativa',
        'Fachada este operativa',
        'Fachada oeste operativa',
        'Iluminación exterior parqueo operativa',
        'Letreros luminosos operativos',
        'Sin luminarias fundidas',
      ],
    },
    // Recorrido de Iluminación — una tarea por hora
    {
      name: 'Recorrido de Iluminación',
      timeSlot: '04:00',
      order: 102,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    {
      name: 'Recorrido de Iluminación',
      timeSlot: '08:00',
      order: 103,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    {
      name: 'Recorrido de Iluminación',
      timeSlot: '09:00',
      order: 104,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    {
      name: 'Recorrido de Iluminación (Manual)',
      timeSlot: '17:00',
      order: 105,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    {
      name: 'Recorrido de Iluminación',
      timeSlot: '21:00',
      order: 106,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    {
      name: 'Recorrido de Iluminación',
      timeSlot: '00:00',
      order: 107,
      checklist: ['Encendido ON', 'Verificar apagado OFF'],
    },
    // Recorrido de gradas eléctricas — una tarea por hora
    {
      name: 'Recorrido de Gradas Eléctricas',
      timeSlot: '06:00',
      order: 108,
      checklist: ['Gradas S2 norte', 'Gradas S2 sur'],
    },
    {
      name: 'Recorrido de Gradas Eléctricas',
      timeSlot: '08:00',
      order: 109,
      checklist: ['City Towers'],
    },
    {
      name: 'Recorrido de Gradas Eléctricas',
      timeSlot: '09:00',
      order: 110,
      checklist: [
        'Gradas S1 norte',
        'Gradas S1 sur',
        'Gradas N1 norte',
        'Gradas N1 sur',
        'Argento',
        'Universal',
        'Gastronómica',
        'Food Court',
        'N2 sur',
        'N3 sur',
        'Banana Este',
        'Banana Oeste',
      ],
    },
    {
      name: 'Recorrido de Gradas Eléctricas',
      timeSlot: '21:00',
      order: 111,
      checklist: [
        'Argento',
        'Universal',
        'Food Court',
        'Banana Este',
        'Banana Oeste',
        'S3 norte',
        'N3 sur al S3 sur (Suben)',
      ],
    },
    {
      name: 'Recorrido de Gradas Eléctricas',
      timeSlot: '00:00',
      order: 112,
      checklist: [
        'N3 sur al S3 sur (Bajan)',
        'Zona gastronómica',
        'N1 norte',
        'S1 norte',
        'S2 norte',
        'S3 norte',
        'City Towers',
      ],
    },
  ]

  for (const taskData of newElectricTasks) {
    const existing = await prisma.task.findFirst({
      where: { name: taskData.name, department: 'ELECTRICO', timeSlot: taskData.timeSlot ?? null, order: taskData.order },
    })
    if (!existing) {
      await prisma.task.create({
        data: {
          name: taskData.name,
          department: 'ELECTRICO',
          timeSlot: taskData.timeSlot ?? null,
          order: taskData.order,
          isCustom: false,
          checkItems: {
            create: taskData.checklist.map((label, idx) => ({ label, order: idx })),
          },
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
