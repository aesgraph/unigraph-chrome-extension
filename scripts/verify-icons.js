const fs = require("fs");
const path = require("path");

// Paths to check
const iconPaths = [
  path.join(__dirname, "../icons/icon16.png"),
  path.join(__dirname, "../icons/icon48.png"),
  path.join(__dirname, "../icons/icon128.png"),
];

console.log("Verifying icon files...");

// Check if each file exists
let allFound = true;
iconPaths.forEach((iconPath) => {
  if (fs.existsSync(iconPath)) {
    console.log(`✅ Found: ${iconPath}`);
  } else {
    console.log(`❌ Missing: ${iconPath}`);
    allFound = false;
  }
});

if (!allFound) {
  console.log(
    "\nSome icon files are missing. Please ensure all icons exist at the correct paths."
  );
  console.log(
    "If you have moved the icons, make sure the directory structure is:"
  );
  console.log("- /icons");
  console.log("  |- icon16.png");
  console.log("  |- icon48.png");
  console.log("  |- icon128.png");
}

// Extra checks for Chrome extension debugging
console.log("\nTroubleshooting tips:");
console.log(
  "1. After updating icons, refresh the extension in chrome://extensions/"
);
console.log('2. Make sure "Developer mode" is enabled');
console.log('3. Try clicking "Update" on the extension');
console.log(
  "4. Check browser console for any errors related to loading resources"
);
