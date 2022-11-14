# Cloud-native Experience Lab Workshop (for Node.js)

This lab will focus on the development and deployment of the Cloud-native weather service application
in Node. It will take you through the relevant phases and tasks reuired to go from source code to a 
fully deployed application on an integration environment.

## Prerequisites

Before you dive right into Cloud-native development with Node.js, make sure your local development
environment is setup properly!

- Modern Operating System (Windows 10, MacOS, ...) with terminal and shell
- IDE of your personal choice (with relevant plugins installed)
  - IntelliJ Ultimate
  - VS Code
- Local Docker / Kubernetes installation (Docker Desktop, Rancher Desktop, Minikube)
- [Node.js](https://nodejs.org/)
- [Kustomize](https://kustomize.io)
- [Tilt](https://tilt.dev)
- [Flux2](https://tilt.dev)

## Project setup

The focus of this lab is not on the actual implementation of the service itself. However, kicking off
a cloud-native project in Node.js is pretty straight forward.

```bash
npm init -y
npm install --save express
npm install --save axios
npm install --save-dev nodemon
```

With this, you can now start to implement the required business logic of the weather service application.

## Crosscutting Concerns

According to the [12-factor app principles](https://12factor.net), there are many cross-cutting concenrs that need to be addressed by a cloud-native application: configuration, observability and many more.

```bash
npm install --save morgan
npm install --save helmet
npm install --save cors
npm install --save express-rate-limit
npm install --save serve-favicon
```

### Configuration

The easiest option to introduce configurability is via ENV variables. So instead of using hard-coded
configuration values, a default value should always be superceded by the environment value.

**Lab Instructions**
1. Add support for the HTTP port via a PORT environment variable
2. (_optinal_) Add support for specific PostgreSQL configuration parameters using ENV variables
3. (_optinal_) Add support for specific OpenWeatherMap parameters using ENV variables

<details>
  <summary markdown="span">Click to expand solution ...</summary>

For each and every ENV variable create a constant in the following form:

```javascript
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

const pgHost = process.env.POSTGRES_HOST || "localhost"
const pgDatabase = process.env.POSTGRES_DB || "weather"
const pgPassword = process.env.POSTGRES_PASSWORD || "password"
const pgUser = process.env.POSTGRES_USER || "user"
```

</details>

### Observability

The 3 pillars of good observability are: Logging, Metrics and Tracing. Using the appropriate middleware
these traits can be introduced pretty easily into the weather service application.

**Lab Instructions**
1. Expose a /metrics endpoint that exposes Prometheus compatible data

<details>
  <summary markdown="span">Click to expand solution ...</summary>

  _TODO_ add Prometheus metrics

</details>

## Containerization

In this step we now need to containerize the application. With Node.js, we can leverage a multi-stage approach:
the final runtime artifacts are build during the image build stage and then used and copied into the final runtime
stage (very similar to Cloud-native Build Packs approach).

**Lab Instructions**
1. Create a `Dockerfile` and add at least following stages
    - Assemble and run the Node.js application using the `production` NODE_ENV in the first stage
    - Use the https://www.npmjs.com/package/pkg package to assemble a standalone binary in the second stage
    - Assemble the final runtime image from the standalone binary using `gcr.io/distroless/cc-debian11` as base

<details>
  <summary markdown="span">Click to expand solution ...</summary>

```dockerfile
ARG node_env=production

FROM node:16.16 as builder

ENV NODE_ENV $node_env
ENV HOST=0.0.0.0

RUN npm install --location=global npm@8.14.0
RUN npm install --location=global nodemon

WORKDIR /app

COPY *.json ./
RUN npm install --omit=dev

COPY favicon.ico .
COPY *.js ./

CMD [ "node", "index.js" ]

FROM node:16.16 as pkg

RUN npm install --location=global npm@8.14.0
RUN npm install --location=global pkg

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
WORKDIR /app

COPY --from=builder /app /app
RUN pkg package.json

CMD [ "/app/dist/cloud-native-weather-nodejs" ]

FROM gcr.io/distroless/cc-debian11 as runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000
WORKDIR /app

COPY --from=pkg /app/favicon.ico /app/favicon.ico
COPY --from=pkg /app/dist/cloud-native-weather-nodejs /app/cloud-native-weather-nodejs
CMD [ "/app/cloud-native-weather-nodejs" ]
```

</details>

## K8s Deployment

The application needs to be deployed, configured, run and exposed with Kubernetes. Several competing 
approaches exist, namely Kustomize and Helm. For this section, you only need to choose and use one of them.

### Option a) Kustomize

In this step we are going to use [Kustomize](https://kustomize.io) to handle the Kubernetes manifests required
to deploy, configure and expose the application to multiple Kubernetes environments.

**Lab Instructions**
1. Create directory structure for Kustomize `base/` and overlays for `dev/` and `prod/`
2. Create base Kubernetes resources for the application and adjust Kustomization
    - Create `Deployment` resource for application and add resource to `kustomization.yaml`
    - Create `Service` resource for application and add resource to `kustomization.yaml`
    - Create `ConfigMap` and `Secret` using Kustomize generators
3. Create PostgreSQL `Deployment` and `Service` resources in the `dev/` overlay and adjust Kustomization
4. Create the following Kustomize patches for the application in the `prod/` overlay
    - Patch the deployment and set `replicas: 2` with a dedicated file
    - Patch the service and set `type: LoadBalancer` as Json6902 patch file

<details>
  <summary markdown="span">Click to expand solution ...</summary>

The directory structure for the base and overlay Kustomization should follow the suggested [common layout](https://kubectl.docs.kubernetes.io/references/kustomize/glossary/#kustomization-root)

```bash
# create the suggested directory layout
mkdir -p k8s/base
mkdir -p k8s/overlays/dev
mkdir -p k8s/overlays/prod

# create initial kustomization.yaml
cd k8s/base && kustomize create && cd ...
cd k8s/overlays/dev && kustomize create && cd ....
cd k8s/overlays/prod && kustomize create && cd ....
```

Next, we create the **base** Kubernetes resizrces for the application and register these with the Kustomization.
```yaml
# add this to a new base/microservice-deployment.yaml file
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-service
  labels:
    type: microservice
spec:
  replicas: 1
  selector:
    matchLabels:
      app: weather-service
  template:
    metadata:
      labels:
        app: weather-service
    spec:
      containers:
      - name: weather-service
        image: cloud-native-weather-nodejs
        resources:
          requests:
            memory: "128Mi"
            cpu: "0.5"
          limits:
            memory: "256Mi"
            cpu: "1"
        livenessProbe:
          timeoutSeconds: 1
          initialDelaySeconds: 30
          periodSeconds: 30
          httpGet:
            port: http
            path: "/health/live"
        readinessProbe:
          timeoutSeconds: 1
          initialDelaySeconds: 5
          periodSeconds: 10
          httpGet:
            port: http
            path: "/health/ready"
        ports:
          - name: http
            containerPort: 3000
        envFrom:
          - configMapRef:
              name: database-configmap
          - secretRef:
              name: database-secrets

# add this to a new base/microservice-service.yaml file
---
apiVersion: v1
kind: Service
metadata:
  name: weather-service
  labels:
    type: microservice
spec:
  selector:
    app: weather-service
  type: ClusterIP
  sessionAffinity: None
  ports:
    - protocol: TCP
      port: 8080
      targetPort: http

# add these to the base/kustomization.yaml
---
commonLabels:
  app: weather-service
  framework: nodejs

buildMetadata: [managedByLabel]

resources:
  - microservice-deployment.yaml
  - microservice-service.yaml
```

The `ConfigMap` and `Secret` resources required to configure the application are generated by Kustomize.
Add the following definitions to the `base/kustomization.yaml`
```yaml
configMapGenerator:
  - name: database-configmap
    literals:
      - POSTGRES_HOST=weather-database
      - POSTGRES_DB=weather

secretGenerator:
  - name: database-secrets
    literals:
      - POSTGRES_PASSWORD=
      - POSTGRES_USER=
```

The **dev** overlay needs to define the Kubernetes resources for a locally deployed PostgreSQL database. The
`Deployment` and `Service` definitions need to be registered inside the `overlays/dev/kustomization.yaml`.

```yaml
# add this to a new overlays/dev/database-deployment.yaml file
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    type: database
  name: weather-database
spec:
  replicas: 1
  selector:
    matchLabels:
      type: database
  template:
    metadata:
      labels:
        type: database
    spec:
      containers:
        - name: database
          image: postgres:11.16
          imagePullPolicy: "IfNotPresent"
          resources:
            requests:
              memory: "128Mi"
              cpu: "0.5"
            limits:
              memory: "256Mi"
              cpu: "0.5"
          ports:
            - containerPort: 5432
          envFrom:
            - configMapRef:
                name: database-configmap
            - secretRef:
                name: database-secrets

# add this to the overlays/dev/database-service.yaml file
---
apiVersion: v1
kind: Service
metadata:
  labels:
    type: database
  name: weather-database
spec:
  ports:
    - name: "5432"
      port: 5432
      targetPort: 5432
  selector:
    type: database

# add these to the overlays/dev/kustomization.yaml
---
resources:
  - ../../base/
  - database-deployment.yaml
  - database-service.yaml

secretGenerator:
  - name: database-secrets
    behavior: merge
    literals:
      - POSTGRES_PASSWORD=1qay2wsx
      - POSTGRES_USER=nodejs
```

For the **prod** overlay we need to patch the **base** Kubernetes resources to only modify certain fields, like 
replica count of the `Deployment` or the `Service` type.

```yaml
# add the following YAML patch to the overlays/prod/2-replicas.yaml file
# the resource is identified by apiVersion + kind + name, everything under spec will be patched
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: weather-service
spec:
  replicas: 2

# add the following JSON 6902 patch to the overlays/prod/loadbalancer.yaml
---
- op: replace
  path: /spec/type
  value: LoadBalancer

# register the patches in the overlays/prod/kustomization.yaml
---
patchesStrategicMerge:
  - 2-replicas.yaml

patchesJson6902:
  - target:
      version: v1
      kind: Service
      name: weather-service
    path: loadbalancer.yaml
```

</details>

### Option b) Helm Chart

_TODO_

<details>
  <summary markdown="span">Click to expand solution ...</summary>

```bash
# prepare the gh-pages branch to serve the Helm chart
git checkout --orphan gh-pages
git reset --hard
git commit --allow-empty -m "fresh and empty gh-pages branch"
git push origin gh-pages
```
</details>

## Continuous Development

A good and efficient developer experience (DevEx) is of utmost importance for any cloud-native software
engineer. Rule 1: stay local as long as possible. Rule 2: automate all required steps: compile and package the source code, containerize the artifact and deploy the Kubernetes resources locally. Continuously. The tools _Tilt_ and _Skaffold_ can both be used to establish this continuous dev-loop. For this section, you
only need to choose and use one of them.

### Option a) Tilt

In this step we are going to use [Tilt](https://tilt.dev) to build, containerize and deploy the application
continuously to a local Kubernetes environment.

**Lab Instructions**
1. Make sure Tilt is installed locally on the development machine
2. Write a `Tiltfile` that performs the following steps
    - Build the required Docker image on every change to the source code
    - Apply the DEV overlay resources using Kustomize
    - Create a local port forward to the weather service HTTP port

<details>
  <summary markdown="span">Click to expand solution ...</summary>

Depending on your local K8s environment, the final `Tiltfile` might look slighty different.

```python
# -*- mode: Python -*

custom_build('cloud-native-weather-nodejs', 
    'docker build -t $EXPECTED_REF --target builder --build-arg node_env=development .', 
    ['.'],
    disable_push=True,
    entrypoint="npm run dev", 
    live_update=[
        sync('.', '/app'),
        run('cd /app && npm install', trigger=['./package.json', './package-lock.json'])
    ])
k8s_yaml(kustomize('./k8s/overlays/dev/'))
# this forwards to the pods (not the service) on port 3000
k8s_resource(workload='weather-service', 
    port_forwards=[port_forward(18080, 3000, 'HTTP API', link_path='/api/weather?city=Rosenheim')], 
    labels=['NodeJS'])
```

To see of everything is working as expected issue the following command: `tilt up`
</details>

### Option b) Skaffold

In this step we are going to use [Skaffold](https://skaffold.dev) to build, containerize and deploy the application
continuously to a local Kubernetes environment.

**Lab Instructions**
1. Make sure Skaffold is installed locally on the development machine
2. Write a `skaffold.yaml` that performs the following steps
    - Build the required Docker image on every change to the source code
    - Apply the DEV overlay resources using Kustomize
    - Create a local port forward to the weather service HTTP port

<details>
  <summary markdown="span">Click to expand solution ...</summary>

The 3 steps of building, deployment and port-forwarding can all be codified in the
`skaffold.yaml` descriptor file.

```yaml
apiVersion: skaffold/v2beta24
kind: Config
metadata:
  name: weather-service-nodejs

build:
  tagPolicy:
    gitCommit: {}
  artifacts:
    - image: cloud-native-weather-nodejs
      docker:
        dockerfile: Dockerfile
        target: builder
        buildArgs: 
          node_env: development 
  local:
    push: false
    useBuildkit: true
    useDockerCLI: false

deploy:
  kustomize:
    defaultNamespace: default
    paths: ["k8s/overlays/dev"]

portForward:
  - resourceName: weather-service
    resourceType: service
    namespace: default
    port: 3000
    localPort: 13000
```

To see of everything is working as expected issue the following command: `skaffold dev --no-prune=false --cache-artifacts=false`

</details>

## Continuous Integration

For any software project there must be a CI tool that takes care of continuously building and testing the produced software artifacts on every change.

### Github Actions

In this step we are going to use Github actions to build and test the application on every change. Also we are going to
leverage Github actions to perform 3rd party dependency checks as well as building and pushing the Docker image.

**Lab Instructions**
1. Create a Github action for each of the following tasks
    - Build the project on every change on main branch and every pull request
    - Build and push the Docker image to Github packages main branch, every pull request and tags
    - (_optional_) Perform CodeQL scans on main branch and every pull request
    - (_optional_) Perform a dependency review on every pull request

<details>
  <summary markdown="span">Click to expand solution ...</summary>

For each of the tasks, open the Github actions tab for the repository in your browser. Choose 'New workflow'. 

In the list of predefined actions, choose the **Node.js** action. Adjust the suggested YAML file content and commit.

```yaml
# This workflow will do a clean installation of node dependencies, cache/restore them, build the source code and run tests across different versions of node
# For more information see: https://help.github.com/actions/language-and-framework-guides/using-nodejs-with-github-actions

name: Node.js CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:

    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x]
        # See supported Node.js release schedule at https://nodejs.org/en/about/releases/

    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test --if-present
```

Next, choose the **Publish Docker Container** action from the Continuous integration section. Adjust the suggested YAML file content and commit.

```yaml
name: 'Docker Publish'

on:
  push:
    branches: [ "main" ]
    # Publish semver tags as releases.
    tags: [ 'v*.*.*' ]
  pull_request:
    branches: [ "main" ]

env:
  # Use docker.io for Docker Hub if empty
  REGISTRY: ghcr.io
  # github.repository as <account>/<repo>
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:

    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      # This is used to complete the identity challenge
      # with sigstore/fulcio when running outside of PRs.
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build --if-present
      - run: npm test --if-present

      # Install the cosign tool except on PR
      # https://github.com/sigstore/cosign-installer
      - name: Install cosign
        if: github.event_name != 'pull_request'
        uses: sigstore/cosign-installer@main
        with:
          cosign-release: 'v1.9.0'
      - name: Check cisgn install!
        if: github.event_name != 'pull_request'
        run: cosign version

      # Workaround: https://github.com/docker/build-push-action/issues/461
      - name: Setup Docker buildx
        uses: docker/setup-buildx-action@v2

      # Login against a Docker registry except on PR
      # https://github.com/docker/login-action
      - name: Log into registry ${{ env.REGISTRY }}
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Extract metadata (tags, labels) for Docker
      # https://github.com/docker/metadata-action
      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      # Build and push Docker image with Buildx (don't push on PR)
      # https://github.com/docker/build-push-action
      - name: Build and push Docker image
        id: build-and-push
        uses: docker/build-push-action@v3
        with:
          context: .
          target: runtime
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

Now repeat this process for the remaining two optional CI tasks of this lab.
</details>

## Continuous Deployment

## Flux2

In this step we are going to deploy the application using Flux2 onto the lab cluster. Flux will manage
the whole lifecycle, from initial deployment to automatic updates in case of changes and new versions.

**Lab Instructions**
1. Clone the Gitops repository for your cluster and create a dedicated apps directory
2. Create a dedicated K8s namespace resource
3. Install the weather service into the apps namespace using Kustomize
    - Patch the deployment and set `replicas: 2`
    - Patch the service and set `type: LoadBalancer`
4. (_optional_) Setup the image update automation workflow with suitable image repository and policy

<details>
  <summary markdown="span">Click to expand solution ...</summary>

First, we need to onboard and integrate the application with the Gitops workflow and repository.
```bash
# clone the experience lab Gitops repository
git clone https://github.com/qaware/cloud-native-explab.git
# create dedicated apps directory
take applications/bare/microk8s-cloudkoffer/weather-service-nodejs/
# initialize Kustomize descriptor
kustomize create
```

Create a `weather-namespace.yaml` file with the following content in the apps GitOps directory.
Do not forget to register the file resource in your `kustomization.yaml`.
```yaml
kind: Namespace
apiVersion: v1
metadata:
    name: weather-nodejs
```

Next, create the relevant Flux2 resources, such as `GitRepository` and `Kustomization` for the application.
```bash
flux create source git cloud-native-weather-nodejs \
    --url=https://github.com/qaware/cloud-native-weather-nodejs \
    --branch=main \
    --interval=5m0s \
    --export > weather-source.yaml

flux create kustomization cloud-native-weather-nodejs \
    --source=GitRepository/cloud-native-weather-nodejs \
    --path="./k8s/overlays/dev" \
    --prune=true \
    --interval=5m0s \
    --target-namespace=weather-nodejs \
    --export > weather-kustomization.yaml
```

The desired environment specific patches need to be added manually to the `weather-kustomization.yaml`, e.g.
```yaml
  images:
    - name: cloud-native-weather-nodejs
      newName: ghcr.io/qaware/cloud-native-weather-nodejs # {"$imagepolicy": "flux-system:cloud-native-weather-nodejs:name"}
      newTag: 1.3.0 # {"$imagepolicy": "flux-system:cloud-native-weather-nodejs:tag"}
  patchesStrategicMerge:
    - apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: weather-service
      spec:
        replicas: 2
    - apiVersion: v1
      kind: Service
      metadata:
        name: weather-service
      spec:
        type: LoadBalancer
```

Finally, add and configure image repository and policy for the image update automation to work.
```bash
flux create image repository cloud-native-weather-nodejs \
    --image=ghcr.io/qaware/cloud-native-weather-nodejs \
    --interval 1m0s \
    --export > weather-registry.yaml

flux create image policy cloud-native-weather-nodejs \
    --image-ref=cloud-native-weather-nodejs \
    --select-semver=">=1.2.0 <2.0.0" \
    --export > weather-policy.yaml
```

Once all files have been created and modified, Git commit and push everything and watch the cluster
and Flux do the magic.

```bash
# to manually trigger the GitOps process use the following commands
flux reconcile source git flux-system
flux reconcile kustomization applications
flux get all
```
</details>