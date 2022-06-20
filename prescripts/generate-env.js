const fs = require("fs");

const envPath = ".env";
const SESSION_SECRET = [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

const defaultEnv = `# Prisma + SQLLite
DATABASE_URL="file:./data.db?connection_limit=1"

# Session secret. Used as encryption on cookie storage
SESSION_SECRET=${SESSION_SECRET}

# Metrics
ENABLE_METRICS=true
`;

try {
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, defaultEnv);
        console.log(".env\n\t- Created default!");
    } else {
        console.log(".env\n\t- Unable to create. Already exists");
    }
} catch (e) {
    console.error(e);
}
