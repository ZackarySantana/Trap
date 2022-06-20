const fs = require("fs");

const envPath = ".env";
const SESSION_SECRET = [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

const defaultEnv = `# The following is given by the system admin (tech director):

# =================================================================
# Custom CMS
STRAPI_URL=https://flow-cms.fly.dev
STRAPI_TOKEN=

# SMTP Settings
SMTP_HOST=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_PORT=

# Cloudinary
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# =================================================================


# Prisma + SQLLite
DATABASE_URL="file:./data.db?connection_limit=1"
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
