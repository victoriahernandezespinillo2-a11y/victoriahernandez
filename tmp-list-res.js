require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
(async () => {
  const prisma = new PrismaClient();
  await prisma.$connect();
  const email = "gabbx.nlfn@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, email: true, name: true,
      reservations: {
        orderBy: { startTime: 'desc' },
        select: { id: true, startTime: true, endTime: true, status: true, totalPrice: true, court: { select: { name: true } } }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
