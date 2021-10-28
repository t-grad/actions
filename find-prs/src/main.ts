import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'
import {GitHub} from '@actions/github/lib/utils'

async function main(): Promise<void> {
  try {
    const token = core.getInput('github-token', {required: true})
    const github = getOctokit(token)

    const commit_sha = core.getInput('commit-sha', {required: true})
    const prs = await github.rest.repos.listPullRequestsAssociatedWithCommit({
      ...context.repo,
      commit_sha
    })

    const result = []
    for (const pr of prs.data) {
      const merged = await checkIfMerged(github, pr.number)
      result.push({pr: pr.number, merged})
    }

    core.setOutput('prs', JSON.stringify(result))
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function checkIfMerged(
  github: InstanceType<typeof GitHub>,
  pr: number
): Promise<boolean> {
  try {
    await github.rest.pulls.checkIfMerged({
      ...context.repo,
      pull_number: pr
    })
  } catch (e) {
    if (e.status === 404) {
      return false
    } else {
      throw e
    }
  }
  return true
}

main()
