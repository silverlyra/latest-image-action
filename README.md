# Latest image action

If you work on a project that publishes Docker images, you can add this action to your workflow to keep the Docker `latest` tag up to date.

Set either a label or `ENV` var containing your package’s version on your Docker images, and this action will update the `latest` tag _only if_ the new version is actually newer (according to [semver][semver]). This means that (e.g.) if you publish a patch release `1.2.4`, but `latest` is `1.3.0`, then `latest` won’t be “updated” to `1.2.4`.

Note that the `latest` tag **must already exist**; this action will not create the tag initially.

Local Docker authentication is used; any existing Docker auth action that you’re already using like [docker/login-action][docker-login] or [AWS ECR login][ecr-login] should work for this action, too.

```yaml
- uses: silverlyra/latest-image-action
  with:
    repository: your/project
    candidate-tag: ${{ github.ref_name }}
```

[semver]: https://semver.org/
[docker-login]: https://github.com/marketplace/actions/docker-login
[ecr-login]: https://github.com/aws-actions/amazon-ecr-login

## Inputs

The following [inputs][action-with] are available on the action:

[action-with]: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith

#### `repository` (required) 👈

The Docker image repository to update. If you image is published to multiple repositories, you can list each one on its own line:

```yaml
- uses: silverlyra/latest-image-action
  with:
    repository: |
      some/project
      ghcr.io/some/project/project
```

#### `candidate-tag` (required) 👈

The Docker image tag that should (maybe) be promoted to `latest`.

This tag must be available in your workflow context, either as a Git tag name (`${{ github.ref_name }}`), or an output from a prior step.

```yaml
with:
  candidate-tag: ${{ steps.current_version.outputs.version }}
```

#### `latest-tag`

> default: `latest`

The Docker image tag to (conditionally) update.

#### `version-source`

> default: `label:org.opencontainers.image.version`

Where the software version can be found in your Docker image metadata.

Use `label:...` to read an image label, or `env:...` to read a preset `ENV` var.

The default uses the version label from [OpenContainers][oc-attrs].

[oc-attrs]: https://github.com/opencontainers/image-spec/blob/main/annotations.md

#### `promote-prerelease`

> default: `false`

Allow a pre-release (e.g., alpha, beta, release-candidate) version to replace a non-pre-release latest.

#### `coerce-semver`

> default: `false`

Use a coercing [semver][semver] parser.

#### `manifest-platform`

> default: `linux/amd64`

When updating a tag that points to a multi-arch manifest list (or OCI index), read the image configuration from the manifest for this platform.

## Outputs

The action will set these outputs:

#### `updated`

Set to `true` if the latest tag was updated; `false` if not.

#### `latest-version`

Set to the version detected from the latest tag.

#### `candidate-version`

Set to the version detected from the candidate tag.