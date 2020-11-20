const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join("./data");
const DATA_FILE = "cfna.json";

let exist = fs.existsSync(path.join(DATA_PATH, DATA_FILE));

console.log("Data file exist: %s", exist);

if (!exist) {
  let data = {
    test: "lalala"
  };

  fs.mkdirSync(DATA_PATH);
  fs.writeFileSync(path.join(DATA_PATH, DATA_FILE), JSON.stringify(data));
} else {
  let data = fs.readFileSync(path.join(DATA_PATH, DATA_FILE), "utf-8");

  console.log("Data: %s", JSON.stringify(data));
}