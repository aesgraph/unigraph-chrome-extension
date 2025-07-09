// scripts/replace-env.js
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env
const envPath = path.resolve(__dirname, "../.env");
const env = dotenv.parse(fs.readFileSync(envPath));

const DIST_DIR = path.resolve(__dirname, "../package/dist");
const MANIFEST_PATH = path.resolve(__dirname, "../package/manifest.json");

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    if (regex.test(content)) {
      content = content.replace(regex, value);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${filePath}`);
  }
}

// Prepare replacements
const replacements = {
  "process.env.SUPABASE_URL": JSON.stringify(env.SUPABASE_URL),
  "process.env.SUPABASE_ANON_KEY": JSON.stringify(env.SUPABASE_ANON_KEY),
  __GOOGLE_CLIENT_ID__: env.GOOGLE_CLIENT_ID,
};

// Replace in all .js files in dist
fs.readdirSync(DIST_DIR).forEach((file) => {
  if (file.endsWith(".js")) {
    replaceInFile(path.join(DIST_DIR, file), replacements);
  }
});

// Replace in manifest.json
replaceInFile(MANIFEST_PATH, replacements);
