// Seed dummy data for the POC. Idempotent: safe to re-run.
const { PrismaClient } = require("@prisma/client");

// Expand a small set of key [lng, lat] waypoints into `count` evenly-spaced points.
function expandWaypoints(keyPoints, count) {
  const segments = keyPoints.length - 1;
  const result = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const scaled = t * segments;
    const idx = Math.min(Math.floor(scaled), segments - 1);
    const frac = scaled - idx;
    const [lng1, lat1] = keyPoints[idx];
    const [lng2, lat2] = keyPoints[idx + 1];
    result.push([
      +(lng1 + (lng2 - lng1) * frac).toFixed(6),
      +(lat1 + (lat2 - lat1) * frac).toFixed(6),
    ]);
  }
  return result;
}

const prisma = new PrismaClient();

async function main() {
  // Users
  await prisma.user.upsert({
    where: { username: "max" },
    update: {},
    create: {
      username: "max",
      password: "max",
      role: "USER",
      firstName: "Maximiliano",
      lastName: "Torres Vega",
      phone: "+52 442 100 2001",
      age: 32,
      position: "Operador logístico",
    },
  });
  await prisma.user.upsert({
    where: { username: "yahel" },
    update: {},
    create: {
      username: "yahel",
      password: "yahel",
      role: "ROOT",
      firstName: "Yahel",
      lastName: "Carrillo",
      phone: "+52 442 200 9988",
      age: 22,
      position: "Administrador de logistica",
    },
  });

  // Trucks
  const trucksData = [
    { plate: "UKG-001", model: "Volvo FH16",        driverName: "Pepe Papas.",  boxes: 1, licenseNumber: "LIC-001", driverFirst: "José",     driverLast: "Papas Ríos",    driverPhone: "+52 442 300 1001" },
    { plate: "ADF-002", model: "Scania R450",        driverName: "Ricardo A.",  boxes: 1, licenseNumber: "LIC-002", driverFirst: "Ricardo",   driverLast: "Arreola",        driverPhone: "+52 442 300 1002" },
    { plate: "JFK-003", model: "Mercedes Actros",    driverName: "Andres B.",   boxes: 2, licenseNumber: "LIC-003", driverFirst: "Andrés",    driverLast: "Becerra Soto",   driverPhone: "+52 442 300 1003" },
  ];

  const trucks = [];
  for (const t of trucksData) {
    const { boxes: boxCount, licenseNumber, driverFirst, driverLast, driverPhone, ...truckFields } = t;

    // Upsert driver
    const driver = await prisma.driver.upsert({
      where: { licenseNumber },
      update: {},
      create: { firstName: driverFirst, lastName: driverLast, licenseNumber, phone: driverPhone },
    });

    trucks.push(
      await prisma.truck.upsert({
        where: { plate: truckFields.plate },
        update: { driverId: driver.id },
        create: { ...truckFields, driverId: driver.id },
      }),
    );
    trucks[trucks.length - 1]._boxCount = boxCount;
  }

  // Variable boxes per truck
  const boxes = [];
  for (const tr of trucks) {
    for (let i = 1; i <= (tr._boxCount ?? 2); i++) {
      const code = `${tr.plate}-B${i}`;
      boxes.push(
        await prisma.box.upsert({
          where: { code },
          update: {},
          create: {
            code,
            truckId: tr.id,
            // Cold chain spec: -20 to -18 °C, 60-80 % RH
            targetTempMin: -20,
            targetTempMax: -18,
            targetHumMin: 60,
            targetHumMax: 80,
          },
        }),
      );
    }
  }

  // Ruta compleja: San Juan del Río -> Querétaro Capital (Vía Carretera 57)
  const existingRoute = await prisma.route.findFirst({
    where: { truckId: trucks[0].id, originName: "San Juan del Río, Qro" },
  });

  if (!existingRoute) {
    await prisma.route.create({
      data: {
        truckId: trucks[0].id,
        originName: "San Juan del Río, Qro",
        destinationName: "Querétaro Capital, Qro",
        status: "PENDING",
        // 100 interpolated [lng, lat] points along Carretera 57
        waypoints: expandWaypoints([
          [-100.0,    20.3889],
          [-100.025,  20.405],
          [-100.063,  20.432],
          [-100.102,  20.465],
          [-100.138,  20.498],
          [-100.185,  20.515],
          [-100.235,  20.538],
          [-100.282,  20.555],
          [-100.321,  20.572],
          [-100.355,  20.584],
          [-100.375,  20.591],
          [-100.3885, 20.5935],
          [-100.405,  20.5925],
        ], 100),
      },
    });
  }

  // Branches (Querétaro)
  const branchesData = [
    { name: "CEDIS Querétaro Norte",     city: "Querétaro", address: "Blvd. Bernardo Quintana 2001, Col. Prados del Milenio", type: "DISTRIBUTION_CENTER" },
    { name: "Farmacia Central Corregidora", city: "Querétaro", address: "Av. Corregidora Norte 155, Col. Centro Histórico", type: "PHARMACY" },
    { name: "Hospital Star Médica Querétaro", city: "Querétaro", address: "Av. 5 de Febrero 1703, Col. Prados del Parque", type: "HOSPITAL" },
    { name: "Almacén Frío San Juan del Río", city: "San Juan del Río", address: "Carretera 57 Km 168, Parque Industrial", type: "WAREHOUSE" },
  ];
  const branches = [];
  for (const b of branchesData) {
    const existing = await prisma.branch.findFirst({ where: { name: b.name } });
    if (existing) { branches.push(existing); continue; }
    branches.push(await prisma.branch.create({ data: b }));
  }

  // Products (pharmaceutical)
  const productsData = [
    { sku: "VAC-COVID-001",  name: "Vacuna COVID-19 (ARNm)",       category: "Vacunas",       description: "Conservar entre -80 °C y -60 °C" },
    { sku: "INS-GLAR-001",   name: "Insulina Glargina 100 UI/mL",  category: "Insulinas",     description: "Conservar entre 2 °C y 8 °C" },
    { sku: "VAC-INFLU-001",  name: "Vacuna Influenza Trivalente",  category: "Vacunas",       description: "Conservar entre 2 °C y 8 °C" },
    { sku: "BIO-TRAS-001",   name: "Trastuzumab 440 mg",           category: "Biológicos",    description: "Refrigerado 2–8 °C, no congelar" },
    { sku: "INS-ASPART-001", name: "Insulina Aspart 100 UI/mL",    category: "Insulinas",     description: "Conservar entre 2 °C y 8 °C" },
    { sku: "BIO-BEVA-001",   name: "Bevacizumab 400 mg/16 mL",     category: "Biológicos",    description: "Refrigerado 2–8 °C, no agitar" },
    { sku: "VAC-NEUM-001",   name: "Vacuna Neumocócica 13v",       category: "Vacunas",       description: "Conservar entre 2 °C y 8 °C" },
    { sku: "HOR-EPO-001",    name: "Eritropoyetina 4000 UI",       category: "Hormonas",      description: "Refrigerado, proteger de la luz" },
    { sku: "BIO-ADAL-001",   name: "Adalimumab 40 mg/0.8 mL",     category: "Biológicos",    description: "Refrigerado 2–8 °C" },
    { sku: "VAC-ROTA-001",   name: "Vacuna Rotavirus (pentav.)",   category: "Vacunas",       description: "Conservar entre 2 °C y 8 °C, no congelar" },
  ];
  const products = [];
  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) { products.push(existing); continue; }
    products.push(await prisma.product.create({ data: p }));
  }

  // Assign loads to the first route (if it exists and has no loads yet)
  const seedRoute = await prisma.route.findFirst({ where: { truckId: trucks[0].id } });
  if (seedRoute) {
    const existingLoads = await prisma.boxLoad.count({ where: { routeId: seedRoute.id } });
    if (existingLoads === 0) {
      // boxes[0] → first 5 products, boxes[1] → next 5 products
      const loadsData = [
        { boxId: boxes[0].id, productId: products[0].id, quantity: 200, unit: "dosis" },
        { boxId: boxes[0].id, productId: products[1].id, quantity: 50,  unit: "viales" },
        { boxId: boxes[0].id, productId: products[2].id, quantity: 300, unit: "dosis" },
        { boxId: boxes[0].id, productId: products[3].id, quantity: 10,  unit: "viales" },
        { boxId: boxes[0].id, productId: products[4].id, quantity: 80,  unit: "viales" },
        { boxId: boxes[1].id, productId: products[5].id, quantity: 6,   unit: "viales" },
        { boxId: boxes[1].id, productId: products[6].id, quantity: 400, unit: "dosis" },
        { boxId: boxes[1].id, productId: products[7].id, quantity: 120, unit: "jeringas" },
        { boxId: boxes[1].id, productId: products[8].id, quantity: 24,  unit: "plumas" },
        { boxId: boxes[1].id, productId: products[9].id, quantity: 500, unit: "dosis" },
      ];
      for (const ld of loadsData) {
        await prisma.boxLoad.create({ data: { ...ld, routeId: seedRoute.id } });
      }
    }
  }

  // A few historical readings per box (just to have data on the dashboard)
  for (const b of boxes) {
    const count = await prisma.reading.count({ where: { boxId: b.id } });
    if (count > 0) continue;
    const now = Date.now();
    const rows = Array.from({ length: 10 }).map((_, i) => ({
      boxId: b.id,
      temperature: -19 + Math.random() * 0.8 - 0.4,
      humidity: 70 + Math.random() * 6 - 3,
      recordedAt: new Date(now - (10 - i) * 60_000),
    }));
    await prisma.reading.createMany({ data: rows });
  }

  // One sample alert
  const sampleAlert = await prisma.alert.findFirst({
    where: { boxId: boxes[0].id },
  });
  if (!sampleAlert) {
    await prisma.alert.create({
      data: {
        boxId: boxes[0].id,
        type: "TEMP",
        severity: "WARNING",
        message: "Temperatura por encima del rango (-17.2 °C)",
      },
    });
  }

  // FAQs
  const faqsData = [
    { question: "¿Cómo inicio una simulación de ruta?",          answer: "Ve a 'Más → Panel de simulación' (solo administradores), selecciona una ruta de la lista y presiona 'Simular ruta'. La posición del camión se actualizará en tiempo real en la pantalla de Monitores.",         category: "Simulación",  sortOrder: 1 },
    { question: "¿Qué significan las alertas de temperatura?",   answer: "Cada caja tiene un rango de temperatura objetivo. Cuando el sensor detecta una lectura fuera de ese rango, se genera una alerta de tipo TEMP con severidad WARNING o CRITICAL.",                                 category: "Alertas",     sortOrder: 2 },
    { question: "¿Cómo creo una nueva ruta?",                    answer: "Ve a 'Más → Rutas → Nueva ruta'. Escribe el nombre del origen y destino, presiona 'Calcular ruta por carretera' y luego guárdala asignándola a un camión.",                                                      category: "Rutas",       sortOrder: 3 },
    { question: "¿Qué es una caja (box)?",                       answer: "Una caja es el contenedor refrigerado montado sobre el camión donde viajan los productos farmacéuticos. Cada caja tiene sensores de temperatura y humedad.",                                                      category: "Inventario",  sortOrder: 4 },
    { question: "¿Puedo simular varias rutas al mismo tiempo?",  answer: "Sí. El simulador puede correr múltiples rutas en paralelo. Cada una se muestra como una polilínea independiente en el mapa de Monitores.",                                                                       category: "Simulación",  sortOrder: 5 },
    { question: "¿Los datos son reales?",                        answer: "No. Esta es una aplicación de demostración (POC). Las posiciones GPS, lecturas de sensores y alertas son generadas por un simulador. No hay hardware real conectado.",                                            category: "General",     sortOrder: 6 },
    { question: "¿Qué es una sucursal (branch)?",                answer: "Una sucursal representa un punto físico de la cadena de frío: almacén, farmacia, hospital o centro de distribución.",                                                                                            category: "Inventario",  sortOrder: 7 },
    { question: "¿Cómo se reconoce una alerta?",                 answer: "En la pantalla de Alertas, presiona el botón 'Reconocer' junto a la alerta. Esto la marca como resuelta y deja de aparecer en los contadores activos.",                                                          category: "Alertas",     sortOrder: 8 },
  ];
  const existingFaqCount = await prisma.faq.count();
  if (existingFaqCount === 0) {
    await prisma.faq.createMany({ data: faqsData });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
