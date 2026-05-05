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
            [-100.0, 20.3889],
            [-100.025, 20.405],
            [-100.063, 20.432],
            [-100.102, 20.465],
            [-100.138, 20.498],
            [-100.185, 20.515],
            [-100.235, 20.538],
            [-100.282, 20.555],
            [-100.321, 20.572],
            [-100.355, 20.584],
            [-100.375, 20.591],
            [-100.3885, 20.5935],
            [-100.405, 20.5925],
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
