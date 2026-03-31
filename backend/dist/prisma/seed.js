"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'admin@quantumcode.dev';
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
        console.log('Admin already exists:', email);
        return;
    }
    const hash = await bcrypt.hash('Admin2026!', 12);
    const admin = await prisma.user.create({
        data: {
            email,
            password: hash,
            name: 'Admin Quantum Code',
            role: 'SUPER_ADMIN',
        },
    });
    console.log('Admin created:', admin.email);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map