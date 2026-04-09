import { copyProjectToWorkdir } from '../src/shmastra/code/sync'

const workDir = await copyProjectToWorkdir()
console.log(workDir)
