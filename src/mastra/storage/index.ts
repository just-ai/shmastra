import {LibSQLStore} from "@mastra/libsql";
import {getStorageDir} from "../../shmastra/files";

export const storage = new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into persistent file storage
    url: `file:${getStorageDir()}/mastra.db`,
});