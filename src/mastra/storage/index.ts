import {LibSQLStore} from "@mastra/libsql";
import {getStorageDir} from "../../shmastra/files";
import {MastraCompositeStore} from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";

export const storage = new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
        id: "mastra-storage",
        // stores observability, scores, ... into persistent file storage
        url: `file:${getStorageDir()}/mastra.db`,
    }),
    domains: {
        observability: await new DuckDBStore({
            path: `${getStorageDir()}/mastra.duckdb`,
        }).getStore('observability')
    }
}) ;