import {error, info, setOutput} from '@actions/core'
import {Client, DockerAuthenticator, Repository, Reference} from 'dockside'
import * as semver from 'semver'

import type {Request} from './request'

export const run = async (request: Request) => {
  const client = new Client({auth: new DockerAuthenticator()})

  const results = await Promise.allSettled(
    request.repos.map((repo, i) => runRepository(client, repo, request, i === 0)),
  )

  const errors: PromiseRejectedResult[] = results.filter(rejected)
  if (!errors.length) {
    return
  } else if (errors.length === 1) {
    throw errors[0].reason
  } else {
    for (const err of errors) {
      error(err.reason)
    }

    throw new Error(`Failed to update ${errors.length}/${request.repos.length} repositories`)
  }
}

export const runRepository = async (
  client: Client,
  repoSpec: string,
  request: Request,
  first: boolean,
) => {
  const repo = Repository.parse(repoSpec)

  const read = async (name: string, tag: string): Promise<[Reference, string]> => {
    const ref = new Reference(repo, {type: 'tag', value: tag})
    const config = await client.getConfig(ref, request.options.manifestPlatform)
    const version = request.versionSource.readVersion(config)
    if (version == null) {
      throw new Error(`${ref} has no ${request.versionSource} in its image config`)
    }

    if (first) {
      setOutput(`${name}-version`, version)
    }

    return [ref, request.options.coerceSemver ? coerceVersion(version) : cleanVersion(version)]
  }

  const [latestRef, latestVersion] = await read('latest', request.latestTag)
  const [candidateRef, candidateVersion] = await read('candidate', request.candidateTag)

  if (!request.options.promotePrerelease) {
    if (semver.prerelease(candidateVersion) && !semver.prerelease(latestVersion)) {
      info(`Not promoting ${candidateVersion} over ${latestVersion} (promote-prerealse is false)`)
      if (first) setOutput('updated', 'false')
      return
    }
  }

  if (!semver.gt(candidateVersion, latestVersion)) {
    info(`Candidate ${candidateVersion} ≤ ${request.latestTag} ${latestVersion}`)
    if (first) setOutput('updated', 'false')
    return
  }

  if (first) {
    info(
      `Promoting candidate version ${candidateVersion} to ${request.latestTag} (was ${latestVersion})`,
    )
  }

  await client.copy(candidateRef, latestRef)

  info(`Copied ${candidateRef} to ${latestRef}`)
  if (first) setOutput('updated', 'true')
}

const coerceVersion = (version: string): string => {
  const coerced = semver.coerce(version)
  if (!coerced) throw new Error(`Failed to coerce ${JSON.stringify(version)} to semver`)

  return String(coerced)
}

const cleanVersion = (version: string): string => {
  const cleaned = semver.clean(version)
  if (!cleaned) throw new Error(`Failed to clean ${JSON.stringify(version)} to semver`)

  return String(cleaned)
}

const rejected = <T>(result: PromiseSettledResult<T>): result is PromiseRejectedResult =>
  result.status === 'rejected'
