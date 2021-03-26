import {create as xmlCreate} from 'xmlbuilder2'
import {Config, RepoConfig, RepoPolicy} from './config'

function generateRepoPolicy(
  policy?: RepoPolicy
): {[key: string]: any} | undefined {
  if (policy && typeof policy.updatePolicy === 'number') {
    return {updatePolicy: `interval:${policy.updatePolicy}`, ...policy}
  } else {
    return policy
  }
}

function generateRepo(
  baseUrl: string,
  id: string,
  repo: RepoConfig
): {[key: string]: any} {
  return {
    id,
    url: `${baseUrl}/repository/${repo.repo}`,
    releases: generateRepoPolicy(repo.releases),
    snapshots: generateRepoPolicy(repo.snapshots)
  }
}

export function generate(config: Config): string {
  const repos = Object.entries(config.repos).map(([id, repo]) =>
    generateRepo(config.baseUrl, id, repo)
  )
  const pluginRepos = Object.entries(config.pluginRepos).map(([id, repo]) =>
    generateRepo(config.baseUrl, id, repo)
  )

  const servers = Object.entries(config.auth)
    .filter(([id]) => id !== 'default')
    .map(([id, cred]) => {
      return {
        id,
        username: `\${env.${cred.username}}`,
        password: `\${env.${cred.password}}`
      }
    })

  const xmlObj: {[key: string]: any} = {
    settings: {
      '@xmlns': 'http://maven.apache.org/SETTINGS/1.0.0',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xsi:schemaLocation':
        'http://maven.apache.org/SETTINGS/1.0.0 https://maven.apache.org/xsd/settings-1.0.0.xsd',

      activeProfiles: {
        activeProfile: ['nexus']
      },

      profiles: {
        profile: [
          {
            id: 'nexus',
            properties: {
              'nexus.url': config.baseUrl
            },
            repositories: {
              repository: repos
            },
            pluginRepositories: {
              pluginRepository: pluginRepos
            }
          }
        ]
      },

      servers: {
        server: servers
      }
    }
  }

  return xmlCreate(xmlObj).end({headless: true, prettyPrint: true, width: 80})
}
