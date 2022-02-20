import {ExitCode, setFailed} from '@actions/core'

import {Request} from './request'
import {run} from './promote'

async function main(): Promise<void> {
  const request = Request.fromAction()
  await run(request)
}

// eslint-disable-next-line github/no-then
main().then(
  () => {
    process.exit(ExitCode.Success)
  },
  error => {
    setFailed(error)
    process.exit(ExitCode.Failure)
  },
)
