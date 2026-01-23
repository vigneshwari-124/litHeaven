const bcrypt = require('bcrypt');

(async () => {
  const hash = await bcrypt.hash("Varshini@12", 10);
  console.log(hash);
})();
