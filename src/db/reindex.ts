import "dotenv/config";
import { buildPassages } from "../lib/knowledge";

buildPassages()
  .then((r) => { console.log(`Indexed ${r.sources} sources, ${r.passages} passages.`); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
