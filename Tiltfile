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
