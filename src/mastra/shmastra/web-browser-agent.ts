/**
 * Agent that automates all operations in headless browser like navigating, scraping, screenshots, etc.
 * Use this as sub-agent for any of your agents and workflows if needed.
 *
 * ```
 * import {webBrowserAgent} from "../shmastra/web-browser-agent";
 *
 * export const myAgent = new Agent({
 *   ...
 *   agents: { webBrowserAgent },
 * })
 * ```
 */
export {webBrowserAgent} from "../../shmastra/agents/web-browser-agent";