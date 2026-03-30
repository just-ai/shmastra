import connections from "../../shmastra/connections";

/**
 * Get tools from connected toolkits for your agents.
 *
 * @param tools - array of tool names you need to connect to your agent
 * @returns Promise<{[name: string]: Tool}> - promise with tools object
 */
export const getConnectedTools = (tools: string[]) =>
    connections.getSessionTools(tools);