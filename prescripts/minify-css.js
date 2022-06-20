/*
Requirements:
- replace-in-file
- postcss
- cssnano
- autoprefixer
npm i replace-in-file postcss cssnano autoprefixer --save-dev

Usage:
- node minify-css.js minify
  - Changes references to .min.css
  - Creates .min.css files and minifies the css
- node minify-css.js clean
  - Changes references to .css
  - Removes .min.css files

For Remix.js projects, adding to the package.json scripts:
"scripts": {
  "dev": "node minify-css.js clean && remix dev",
  "start": "node minify-css.js minify && remix build && remix-serve build",
},
*/

const pathToCode = "app/**";
const pathToCSS = "app/styles";

const fs = require("fs");
const replace = require("replace-in-file");
const { resolve } = require("path");
const postcss = require("postcss");
const cssnano = require("cssnano");
const autoprefixer = require("autoprefixer");

async function getFilesFromDirectory(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFilesFromDirectory(res) : res;
        })
    );
    return files.flat();
}

/*
Changes the references in files to reference .min.css instead of .css

Path examples:
- /app/** (every file, recursively)
- /app/*.css (every file in app that ends in css)
- /app/global.css
*/
function changeReferencesToMin(path) {
    return replace.sync({
        files: path,
        from: /(?<!min)\.css/g,
        to: ".min.css",
        countMatches: true,
    });
}

/*
Path examples:
- __dirname + "/app/styles"
*/
async function minifyFiles(directoryPath) {
    const files = await getFilesFromDirectory(directoryPath);

    files.forEach(async (fn) => {
        if (fn.includes(".min.css")) return;
        try {
            const content = fs.readFileSync(fn);
            const output = await postcss([cssnano, autoprefixer]).process(
                content,
                {
                    from: undefined,
                }
            );
            fs.writeFileSync(
                fn.slice(0, fn.indexOf(".css")) + ".min.css",
                output.css
            );
        } catch (err) {
            console.error(err);
        }
    });
}

/*
Changes the references in files to reference .css instead of .min.css

Path examples:
- /app/** (every file, recursively)
- /app/*.css (every file in app that ends in css)
- /app/global.css
*/
function changeReferencesToCSS(path) {
    return replace.sync({
        files: path,
        from: /\.min\.css/g,
        to: ".css",
        countMatches: true,
    });
}

/*
Path examples:
- __dirname + "/app/styles"
*/
async function cleanMinifiedFiles(directoryPath) {
    const files = await getFilesFromDirectory(directoryPath);
    files.forEach((fileName) => {
        if (fileName.includes(".min.css")) {
            try {
                fs.unlinkSync(fileName);
            } catch (err) {
                console.error(err);
            }
        }
    });
}

const run = async () => {
    if (process.argv.length < 3) {
        console.log("[CSS Minify] Unrecongized option.");
        console.log("\tPlease use: [minify, clean]");
        return;
    }
    if (process.argv[2] === "minify") {
        console.log("Updating references");
        changeReferencesToMin(pathToCode); // Path to js/tsx
        console.log("Finished updating references.\n\nMinifying files");
        await minifyFiles(pathToCSS); // Path to css
        console.log("Finished minifying.");
    } else if (process.argv[2] === "clean") {
        console.log("Updating references.");
        changeReferencesToCSS(pathToCode);
        console.log("Finished updating references.\n\nCleaning minified files");
        await cleanMinifiedFiles(pathToCSS); // Path to css
        console.log("Finished cleaning minified files.");
    } else {
        console.log("[CSS Minify] Unrecongized option.");
        console.log("\tPlease use: [minify, clean]");
    }
};
run();
