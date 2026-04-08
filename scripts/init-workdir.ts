import { copyDirToTmp } from '../src/shmastra/code/sync'

const tmpDir = await copyDirToTmp()
console.log(tmpDir)
