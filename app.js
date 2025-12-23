const express = require("express");
const app = express();

const busboy = require("connect-busboy");
const fileUpload = require("express-fileupload");

const createTables = require("./dump/createTable");
const userRouter = require("./routes/UserRouter");
const mediaRouter = require("./routes/MediaRouter");
const viewRouter = require("./routes/ViewRouter");
const simulationRouter = require("./routes/SimulationRouter");

app.use(busboy());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 1000 * 1024 * 1024 } }));
app.use(express.urlencoded({ extended: true }));

// health для балансировщика
app.get("/health", (req, res) => res.status(200).send("ok"));

app.use("/users", userRouter);
app.use("/media", mediaRouter);
app.use("/simulation", simulationRouter);
app.use("/", viewRouter);

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

(async () => {
  try {
    /**
     * Важно для масштабирования:
     * - Либо убери createTables отсюда совсем и делай миграции отдельным one-shot сервисом (ниже покажу),
     * - Либо оставь, но запускай миграции только в одном экземпляре (через env-флаг).
     */
    if (process.env.RUN_MIGRATIONS === "true") {
      await createTables();
    }

    app.listen(PORT, HOST, () => {
      console.log(`Server listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

process.on("SIGINT", () => process.exit());
process.on("SIGTERM", () => process.exit());

module.exports = app;
