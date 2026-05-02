// Seed dummy data for the POC. Idempotent: safe to re-run.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Users
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: 'admin', role: 'USER' },
  });
  await prisma.user.upsert({
    where: { username: 'root' },
    update: {},
    create: { username: 'root', password: 'root', role: 'ROOT' },
  });

  // Trucks
  const trucksData = [
    { plate: 'ABC-123', model: 'Volvo FH16', driverName: 'Juan Pérez' },
    { plate: 'XYZ-789', model: 'Scania R450', driverName: 'María López' },
    { plate: 'JKL-456', model: 'Mercedes Actros', driverName: 'Carlos Ruiz' },
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

  // One demo route CDMX -> Puebla for the first truck
  const existingRoute = await prisma.route.findFirst({
    where: { truckId: trucks[0].id, originName: 'CDMX' },
  });
  if (!existingRoute) {
    await prisma.route.create({
      data: {
        truckId: trucks[0].id,
        originName: 'CDMX',
        destinationName: 'Puebla',
        status: 'PENDING',
        // Approx waypoints CDMX -> Puebla
        waypoints: [
          [19.4326, -99.1332],
          [19.3500, -98.9000],
          [19.2800, -98.6000],
          [19.1800, -98.3000],
          [19.0414, -98.2063],
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
  const sampleAlert = await prisma.alert.findFirst({ where: { boxId: boxes[0].id } });
  if (!sampleAlert) {
    await prisma.alert.create({
      data: {
        boxId: boxes[0].id,
        type: 'TEMP',
        severity: 'WARNING',
        message: 'Temperatura por encima del rango (-17.2 °C)',
      },
    });
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
