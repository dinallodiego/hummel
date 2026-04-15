const bcrypt = require("bcrypt");

(async () => {
  const hash = await bcrypt.hash("Roxbel#Hummel_2026!Zp7@Qv19$Lm", 10);
  console.log(hash);
})();
