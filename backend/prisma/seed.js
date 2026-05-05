// Seed dummy data for the POC. Idempotent: safe to re-run.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Users
  await prisma.user.upsert({
    where: { username: "max" },
    update: {},
    create: { username: "max", password: "max", role: "USER" },
  });
  await prisma.user.upsert({
    where: { username: "yahel" },
    update: {},
    create: { username: "yahel", password: "yahel", role: "ROOT" },
  });

  // Trucks
  const trucksData = [
    { plate: "UKG-001", model: "Volvo FH16", driverName: "Pepe Papas." },
    { plate: "ADF-002", model: "Scania R450", driverName: "Ricardo A." },
    { plate: "JFK-003", model: "Mercedes Actros", driverName: "Andres B." },
  ];

  const trucks = [];
  for (const t of trucksData) {
    trucks.push(
      await prisma.truck.upsert({
        where: { plate: t.plate },
        update: {},
        create: t,
      }),
    );
  }

  // Two boxes per truck
  const boxes = [];
  for (const tr of trucks) {
    for (let i = 1; i <= 2; i++) {
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
    where: { truckId: trucks[0].id, originName: "San Juan del Río" },
  });

  if (!existingRoute) {
    await prisma.route.create({
      data: {
        truckId: trucks[0].id,
        originName: "San Juan del Río, Qro",
        destinationName: "Querétaro Capital, Qro",
        status: "PENDING",
        // Trayectoria detallada siguiendo la curva de la autopista
        waypoints: [
          [20.3889, -100.0000], // Salida de San Juan del Río (Centro)
          [20.4050, -100.0250], // Incorporación a la Autopista 57
          [20.4320, -100.0630], // Pasando Loma Linda
          [20.4650, -100.1020], // Cercanías de la caseta auxiliar
          [20.4980, -100.1380], // Pedro Escobedo
          [20.5150, -100.1850], // Zona industrial de El Sauz
          [20.5380, -100.2350], // Entrada a El Colorado
          [20.5550, -100.2820], // Parque Industrial El Marqués
          [20.5720, -100.3210], // Monumento a Conín
          [20.5840, -100.3550], // Inicio de la Cuesta China
          [20.5910, -100.3750], // Vista Alegre / Bernardo Quintana
          [20.5935, -100.3885], // Los Arcos de Querétaro
          [20.5925, -100.4050], // Centro Histórico (Destino final)
        ],
      },
    });
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
