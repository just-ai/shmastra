import {CloudExporter, DefaultExporter, Observability, SensitiveDataFilter} from "@mastra/observability";

export const observability = new Observability({
    configs: {
        default: {
            serviceName: 'mastra',
            exporters: [
                new DefaultExporter(), // Persists traces to storage for Mastra Studio
                new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
            ],
            spanOutputProcessors: [
                new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
            ],
        },
    },
});