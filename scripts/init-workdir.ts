import { copyDirToTmp } from '../src/shmastra/files.js'

const tmpDir = await copyDirToTmp()
console.log(`Workdir initialized at ${tmpDir}`)
