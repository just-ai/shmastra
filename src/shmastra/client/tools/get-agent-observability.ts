import {createTool} from "@mastra/core/tools";
import {z} from "zod";
import {mastraClient} from "../client";

const filtersSchema = z.object({
    entityName: z.string().optional().describe("Agent display name to filter by (e.g. 'Test Agent', not the agent ID). Use breakdown with groupBy=['entityName'] to discover actual names."),
    model: z.string().optional().describe("Model name to filter by (e.g. gpt-4o, claude-sonnet-4-6)"),
    provider: z.string().optional().describe("Provider to filter by (e.g. openai, anthropic, google)"),
    timestampStart: z.string().optional().describe("Start of time range (ISO 8601)"),
    timestampEnd: z.string().optional().describe("End of time range (ISO 8601)"),
    threadId: z.string().optional().describe("Thread ID to filter by"),
    runId: z.string().optional().describe("Run ID to filter by"),
    userId: z.string().optional().describe("User ID to filter by"),
}).optional().describe("Common filters for metrics queries");

function buildFilters(input?: z.infer<typeof filtersSchema>) {
    if (!input) return undefined;
    const filters: Record<string, unknown> = {
        entityType: "agent" as const,
    };
    if (input.entityName) filters.entityName = input.entityName;
    if (input.model) filters.model = input.model;
    if (input.provider) filters.provider = input.provider;
    if (input.threadId) filters.threadId = input.threadId;
    if (input.runId) filters.runId = input.runId;
    if (input.userId) filters.userId = input.userId;
    if (input.timestampStart || input.timestampEnd) {
        filters.timestamp = {
            ...(input.timestampStart ? {start: input.timestampStart} : {}),
            ...(input.timestampEnd ? {end: input.timestampEnd} : {}),
        };
    }
    return filters;
}

export const getAgentObservabilityTool = createTool({
    id: "get_agent_observability",
    description: `Query agent observability metrics (tokens, cost, latency, etc.) with OLAP-style operations.
Operations:
- "names": list available metric names (use prefix to filter, e.g. "mastra_model")
- "aggregate": get a single aggregated value (sum/avg/min/max/count) for metrics
- "breakdown": group metrics by dimensions (e.g. by model, provider, entityName)
- "timeseries": get metric values over time buckets
- "percentiles": get percentile distribution over time
- "traces": list recent traces for the agent`,
    inputSchema: z.object({
        operation: z.enum(["names", "aggregate", "breakdown", "timeseries", "percentiles", "traces"])
            .describe("The OLAP operation to perform"),
        metricNames: z.array(z.string()).optional()
            .describe("Metric name(s) to query. Required for aggregate/breakdown/timeseries. For percentiles pass single name."),
        aggregation: z.enum(["sum", "avg", "min", "max", "count", "last"]).optional()
            .describe("Aggregation function. Required for aggregate/breakdown/timeseries."),
        groupBy: z.array(z.string()).optional()
            .describe("Dimensions to group by (e.g. ['model', 'entityName', 'provider']). Required for breakdown."),
        interval: z.enum(["1m", "5m", "15m", "1h", "1d"]).optional()
            .describe("Time bucket interval. Required for timeseries/percentiles."),
        percentiles: z.array(z.string()).optional()
            .describe("Percentile values as strings (e.g. ['50', '90', '99']). Required for percentiles."),
        comparePeriod: z.enum(["previous_period", "previous_day", "previous_week"]).optional()
            .describe("Compare with a previous period (only for aggregate)."),
        prefix: z.string().optional()
            .describe("Prefix filter for metric names (only for 'names' operation)."),
        filters: filtersSchema,
    }),
    execute: async (input) => {
        const percentiles = input.percentiles?.map(Number);
        const client = await mastraClient();
        const filters = buildFilters(input.filters);

        switch (input.operation) {
            case "names": {
                return client.getMetricNames({
                    prefix: input.prefix,
                });
            }
            case "aggregate": {
                if (!input.metricNames?.length) return {error: "metricNames required for aggregate"};
                if (!input.aggregation) return {error: "aggregation required for aggregate"};
                return client.getMetricAggregate({
                    name: input.metricNames,
                    aggregation: input.aggregation,
                    filters,
                    comparePeriod: input.comparePeriod,
                } as any);
            }
            case "breakdown": {
                if (!input.metricNames?.length) return {error: "metricNames required for breakdown"};
                if (!input.aggregation) return {error: "aggregation required for breakdown"};
                if (!input.groupBy?.length) return {error: "groupBy required for breakdown"};
                return client.getMetricBreakdown({
                    name: input.metricNames,
                    aggregation: input.aggregation,
                    groupBy: input.groupBy,
                    filters,
                } as any);
            }
            case "timeseries": {
                if (!input.metricNames?.length) return {error: "metricNames required for timeseries"};
                if (!input.aggregation) return {error: "aggregation required for timeseries"};
                if (!input.interval) return {error: "interval required for timeseries"};
                return client.getMetricTimeSeries({
                    name: input.metricNames,
                    aggregation: input.aggregation,
                    interval: input.interval,
                    filters,
                    groupBy: input.groupBy,
                } as any);
            }
            case "percentiles": {
                if (!input.metricNames?.length) return {error: "metricNames[0] required for percentiles"};
                if (!percentiles?.length) return {error: "percentiles required"};
                if (!input.interval) return {error: "interval required for percentiles"};
                return client.getMetricPercentiles({
                    name: input.metricNames[0],
                    percentiles,
                    interval: input.interval,
                    filters,
                } as any);
            }
            case "traces": {
                const perPage = 50;
                return client.listTraces({
                    filters: {
                        entityType: "agent",
                        ...(input.filters?.entityName ? {entityName: input.filters.entityName} : {}),
                    },
                    pagination: {page: 1, perPage},
                    orderBy: {field: "startedAt", direction: "DESC"},
                } as any);
            }
            default:
                return {error: `Unknown operation: ${input.operation}`};
        }
    }
});
