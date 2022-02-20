import {getInput} from '@actions/core'
import type {ImageConfig} from 'dockside'

export class Request {
  constructor(
    public repos: string[],
    public candidateTag: string,
    public latestTag: string,
    public versionSource: VersionSource,
    public options: Options,
  ) {}

  public static fromAction(): Request {
    return new Request(
      getMultilineInput('repository'),
      getInput('candidate-tag', {required: true}),
      getInput('latest-tag', {required: true}),
      VersionSource.fromAction(),
      {
        promotePrerelease: getBooleanInput('promote-prerelease'),
        coerceSemver: getBooleanInput('coerce-semver'),
        manifestPlatform: getInput('manifest-platform', {required: true}),
      },
    )
  }
}

export interface Options {
  promotePrerelease: boolean
  coerceSemver: boolean
  manifestPlatform: string
}

export abstract class VersionSource {
  public abstract readVersion(config: ImageConfig): string | undefined

  public static fromAction(): VersionSource {
    const source = getInput('version-source', {required: true})
    const sep = source.indexOf(':')
    if (sep < 0)
      throw new Error(
        `Invalid version-source ${JSON.stringify(source)}: expected "label:..." or "env:..."`,
      )

    const [reader, value] = [source.slice(0, sep), source.slice(sep + 1)]
    const factory = VersionSource.readers[reader]
    if (!factory)
      throw new Error(
        `Invalid version-source ${JSON.stringify(source)}: expected "label:..." or "env:..."`,
      )

    return factory(value)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static readers: Record<string, (value: string) => VersionSource> = {
    env: (variable: string) => new EnvVersionSource(variable),
    label: (label: string) => new LabelVersionSource(label),
  }
}

export class LabelVersionSource extends VersionSource {
  constructor(public readonly label: string) {
    super()
  }

  public readVersion(config: ImageConfig): string | undefined {
    const labels = config.config.Labels
    return labels ? labels[this.label] : undefined
  }

  public toString(): string {
    return `${this.label} label`
  }
}

export class EnvVersionSource extends VersionSource {
  constructor(public readonly variable: string) {
    super()
  }

  public readVersion(config: ImageConfig): string | undefined {
    const env = config.config.Env
    if (env == null) return

    const prefix = `${this.variable}=`
    for (const pair of env) {
      if (pair.startsWith(prefix)) {
        return pair.slice(prefix.length)
      }
    }
  }

  public toString(): string {
    return `${this.variable} env var`
  }
}

const getMultilineInput = (name: string): string[] => {
  return getInput(name, {required: true})
    .split('\n')
    .map(line => line.trim().replace(/#.*$/, ''))
    .filter(Boolean)
}

const getBooleanInput = (name: string): boolean => {
  const rawValue = getInput(name, {required: true})
  const value = booleanValues[rawValue]

  if (value == null)
    throw new Error(`Expected "true" or "false" for ${name}; got ${JSON.stringify(rawValue)}`)

  return value
}

const booleanValues: Record<string, boolean> = {
  true: true,
  enable: true,
  enabled: true,
  yes: true,
  on: true,
  1: true,

  false: false,
  disable: false,
  disabled: false,
  no: false,
  off: false,
  0: false,
}
