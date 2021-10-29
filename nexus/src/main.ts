import * as core from '@actions/core'
import * as fs from 'fs'
import * as io from '@actions/io'
import * as os from 'os'
import * as path from 'path'
import {Config, parse} from './config'
import {generate} from './generate'
import {dedent as ml} from 'ts-dedent'

const M2_DIR = '.m2'
const SETTINGS_FILE = 'settings.xml'

async function main(): Promise<void> {
  try {
    const url = core.getInput('url')
    const settingsPath = core.getInput('settings-path')

    const config = await parseConfig(url)

    core.info(ml`
      creating ${SETTINGS_FILE}
      base url: ${config.baseUrl}
      repos: ${JSON.stringify(config.repos, null, 2)}
      plugin-repos: ${JSON.stringify(config.pluginRepos, null, 2)}
      auth env vars: ${JSON.stringify(config.auth, null, 2)}
    `)

    // when an alternate m2 location is specified use only that location (no .m2 directory)
    // otherwise use the home/.m2/ path
    const settingsDir: string = path.join(
      settingsPath || os.homedir(),
      settingsPath ? '' : M2_DIR
    )
    await io.mkdirP(settingsDir)

    await write(settingsDir, generate(config))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function parseConfig(baseUrl: string): Promise<Config> {
  const ws = process.env['GITHUB_WORKSPACE'] || '.'
  const location = path.join(ws, '.github', 'nexus.yml')
  if (fs.existsSync(location)) {
    core.info(`using existing nexus config from ${location}`)
    const content = await fs.promises.readFile(location, {
      encoding: 'utf-8',
      flag: 'r'
    })
    return parse(content, baseUrl)
  } else {
    throw Error(`Nexus configuration not found at ${location}`)
  }
}

async function write(directory: string, settings: string): Promise<void> {
  const location = path.join(directory, SETTINGS_FILE)
  if (fs.existsSync(location)) {
    core.warning(`overwriting existing file ${location}`)
  } else {
    core.info(`writing ${location}`)
  }

  return fs.writeFileSync(location, settings, {
    encoding: 'utf-8',
    flag: 'w'
  })
}

main()
