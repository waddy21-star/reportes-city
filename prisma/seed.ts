import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.resolve('./prisma/dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

// Agrega ítems de checklist a una tarea existente sin duplicar los que ya tiene.
async function ensureChecklist(taskId: string, labels: string[]) {
  const existing = await prisma.checklistItem.findMany({
    where: { taskId },
    select: { label: true },
  })
  const have = new Set(existing.map((i) => i.label))
  let order = existing.length
  for (const label of labels) {
    if (!have.has(label)) {
      await prisma.checklistItem.create({ data: { label, taskId, order: order++ } })
    }
  }
}

// Aplica un mapa de "nombre de tarea -> checklist" a las tareas de un depto.
async function applyChecklists(department: string, map: Record<string, string[]>) {
  const tasks = await prisma.task.findMany({ where: { department } })
  for (const task of tasks) {
    const labels = map[task.name]
    if (labels) await ensureChecklist(task.id, labels)
  }
}

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

  // === Checklists para tareas de ELÉCTRICO que aún no tenían ===
  const subestacionChecklist = [
    'Revisión de transformador',
    'Medición de voltaje',
    'Medición de amperaje',
    'Estado de tableros y breakers',
    'Temperatura de equipos',
    'Revisión de conexiones',
    'Limpieza general',
  ]
  const elevadorChecklist = [
    'Funcionamiento de puertas',
    'Botoneras operativas',
    'Nivelación de cabina',
    'Iluminación interior',
    'Sistema de emergencia y alarma',
    'Sin ruidos anormales',
  ]
  const gradasChecklist = [
    'Funcionamiento de pasamanos',
    'Peines en buen estado',
    'Iluminación operativa',
    'Botón de paro de emergencia',
    'Sin ruidos anormales',
    'Sentido de marcha correcto',
  ]

  const electricTasksDb = await prisma.task.findMany({ where: { department: 'ELECTRICO' } })
  for (const task of electricTasksDb) {
    if (task.name.startsWith('SubEstación')) {
      await ensureChecklist(task.id, subestacionChecklist)
    } else if (task.name.startsWith('Elevador')) {
      await ensureChecklist(task.id, elevadorChecklist)
    } else if (task.name.startsWith('Gradas Eléctricas')) {
      await ensureChecklist(task.id, gradasChecklist)
    } else if (task.name === 'Sistema de Iluminación') {
      await ensureChecklist(task.id, [
        'Iluminación general operativa',
        'Sin luminarias fundidas',
        'Sensores funcionando',
        'Tableros de control en buen estado',
      ])
    } else if (task.name === 'Cuartos eléctricos') {
      // Además del listado de CT, agregar limpieza general.
      await ensureChecklist(task.id, ['Limpieza general'])
    }
  }

  // Reordenar los recorridos de ELÉCTRICO para intercalar el de las 6:00
  // (gradas) entre las 4:00 y las 8:00 de iluminación.
  const electricOrder: { name: string; timeSlot: string; order: number }[] = [
    { name: 'Recorrido de Iluminación', timeSlot: '04:00', order: 102 },
    { name: 'Recorrido de Gradas Eléctricas', timeSlot: '06:00', order: 103 },
    { name: 'Recorrido de Iluminación', timeSlot: '08:00', order: 104 },
    { name: 'Recorrido de Gradas Eléctricas', timeSlot: '08:00', order: 105 },
    { name: 'Recorrido de Iluminación', timeSlot: '09:00', order: 106 },
    { name: 'Recorrido de Gradas Eléctricas', timeSlot: '09:00', order: 107 },
    { name: 'Recorrido de Iluminación (Manual)', timeSlot: '17:00', order: 108 },
    { name: 'Recorrido de Iluminación', timeSlot: '21:00', order: 109 },
    { name: 'Recorrido de Gradas Eléctricas', timeSlot: '21:00', order: 110 },
    { name: 'Recorrido de Iluminación', timeSlot: '00:00', order: 111 },
    { name: 'Recorrido de Gradas Eléctricas', timeSlot: '00:00', order: 112 },
  ]
  for (const o of electricOrder) {
    await prisma.task.updateMany({
      where: { department: 'ELECTRICO', name: o.name, timeSlot: o.timeSlot },
      data: { order: o.order },
    })
  }

  // === Checklists para CIVIL ===
  await applyChecklists('CIVIL', {
    'Azoteas Limpieza e Impermeabilización': ['Limpieza de azotea', 'Estado del impermeabilizante', 'Drenajes despejados', 'Sin filtraciones', 'Sin acumulación de agua'],
    'Remplazo de Porcelanato': ['Identificar piezas dañadas', 'Disponibilidad de material', 'Reemplazo realizado', 'Fraguado y limpieza', 'Acabado uniforme'],
    'Pintura General Cielos y Paredes': ['Identificar áreas a pintar', 'Preparación de superficie', 'Aplicación de pintura', 'Acabado uniforme', 'Limpieza del área'],
    'Revisión de Varandales y Vidrios Comercial': ['Varandales firmes', 'Vidrios sin fisuras', 'Fijaciones en buen estado', 'Sin oxidación'],
    'Revisión Juntas Sísmicas': ['Estado de juntas', 'Sellos en buen estado', 'Sin desprendimientos', 'Cubrejuntas firmes'],
    'Revisión de Loza Sanitarias y Grifos Lavamanos': ['Lozas sin fugas', 'Grifos operativos', 'Sin filtraciones', 'Sellos en buen estado', 'Limpieza general'],
    'Revisión Jardinería': ['Riego funcionando', 'Poda realizada', 'Plantas en buen estado', 'Limpieza de áreas verdes'],
    'Revisión de Cubos': ['Estado estructural', 'Limpieza', 'Iluminación', 'Sin obstrucciones'],
    'Revisión Puertas de Emergencias': ['Apertura correcta', 'Barras antipánico operativas', 'Señalización visible', 'Sin obstrucciones', 'Cierrapuertas funcionando'],
    'Parqueo Pintura Topes': ['Topes pintados', 'Señalización visible', 'Numeración legible', 'Demarcación de líneas'],
    'Mallas Colindantes': ['Mallas firmes', 'Sin roturas', 'Postes en buen estado', 'Sin oxidación'],
    'Revisión Parrillas Entradas': ['Parrillas firmes', 'Sin obstrucciones', 'Drenaje funcionando', 'Limpieza realizada'],
    'Puertas Lobbys': ['Apertura automática operativa', 'Sensores funcionando', 'Vidrios en buen estado', 'Sin ruidos anormales'],
  })

  // === Checklists para REFRIGERACIÓN ===
  await applyChecklists('REFRIGERACION', {
    'Mantenimiento UMAs': ['Limpieza de filtros', 'Revisión de bandas', 'Lubricación de rodamientos', 'Revisión de motor', 'Medición de amperaje', 'Estado de serpentines'],
    'Mantenimiento Chillers': ['Presiones de refrigerante', 'Temperatura de agua', 'Revisión de compresor', 'Estado de condensador', 'Medición de amperaje', 'Sin fugas'],
    'Mantenimiento Torres de Enfriamiento': ['Limpieza de relleno', 'Nivel de agua', 'Estado de ventilador', 'Revisión de bomba', 'Tratamiento de agua', 'Sin obstrucciones'],
    'Mantenimiento Bombas de Agua': ['Sin fugas', 'Medición de presión', 'Lubricación', 'Medición de amperaje', 'Sin ruidos anormales'],
    'Mantenimiento Inyectores y Extractores': ['Limpieza de aspas', 'Revisión de motor', 'Estado de bandas', 'Medición de amperaje', 'Sin ruidos anormales'],
    'Revisión de Rejillas (Baños y Centro Comercial)': ['Rejillas limpias', 'Sin obstrucciones', 'Flujo de aire correcto', 'Fijación correcta'],
    'Revisión de Temperatura': ['Temperatura áreas comunes', 'Temperatura food court', 'Registro de mediciones', 'Sin desviaciones'],
  })

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
