const bcrypt = require("bcrypt");

(async () => {
  const plain = process.argv[2];
  if (!plain) {
    console.log("Uso: node scripts/create-admin-hash.js TU_PASSWORD");
    process.exit(1);
  }
  const hash = await bcrypt.hash(plain, 12);
  console.log(hash);
})();
