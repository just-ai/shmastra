import {Agent} from "@mastra/core/agent";
import {getAgentModel} from "../providers";
import {createAgentMemory} from "../memory";
import {createAgentBrowser} from "../browser";


export const webBrowserAgent = new Agent({
    id: "web-browser-agent",
    name: "Web Browser Agent",
    description: "Performs actions in headless browser - navigates to any websites, clicks any buttons and links, takes screenshots, fills forms and etc. Screenshots are returned as a relative web URL - do not append 'sandbox:' to it, compose markdown image link instead. Use this agent if you need to take website screenshots, discover UX, make some actions on website, get some info from website.",
    instructions: `You are a browser automation agent with access to Playwright tools. You can navigate websites, interact with page elements, fill forms, click buttons, take screenshots, and extract information from web pages.

When given a task:
1. Use the available Playwright tools to control a browser and complete the task
2. Navigate to URLs, interact with elements, and extract data as needed
3. Handle errors gracefully and retry actions when appropriate
4. Provide clear summaries of what actions were taken and what was found

Make all operations automatically from start to end to solve the task and return only final result.
Do not ask user for each step. Accept all cookies.
`,

    model: getAgentModel("general"),
    memory: createAgentMemory(),
    browser: createAgentBrowser(),
});