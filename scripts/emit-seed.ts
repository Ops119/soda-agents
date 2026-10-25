import { writeFileSync } from "fs";
import { renderSeedSql } from "../lib/catalog";

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), renderSeedSql());
console.log("wrote supabase/seed.sql");
