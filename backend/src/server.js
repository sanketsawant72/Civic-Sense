require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const app = require("./app");

app.listen(process.env.PORT, () => {
    console.log(`Civic AI server running on port ${process.env.PORT}`);
});