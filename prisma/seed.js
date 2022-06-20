//import { PrismaClient } from "@prisma/client";
const { PrismaClient } = require("@prisma/client");
const { AddEvents } = require("./seed.events");
const { AddUsersAndDummyPosts } = require("./seed.users");

const prisma = new PrismaClient();

async function seed() {
    await AddUsersAndDummyPosts(prisma);
    await AddEvents(prisma);
    console.log(`Database has been seeded. 🌱`);
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
