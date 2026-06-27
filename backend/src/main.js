const app = require('./app');

const PORT = process.env.BACKEND_PORT || 3003;

app.listen(PORT, () => {
  console.log(`GridRunner API running on http://localhost:${PORT}`);
  console.log(`Modules: auth, player, geo, payment`);
});
