## Docker Starter

A simple npm module that allows you to start and stop docker containers from node, using shelljs to pass docker commands to the command line.

Designed to work on Linux distributions, and Mac (Darwin).

Because this package works by passing commands to the unix command line - you must already have the docker client installed and on $PATH. i.e. if you can run `docker ps` on the command line - then you should be good to go.


Installation:
```
npm install docker-starter
```

Example:

```
const dockerStarter = require('docker-starter');

const mongo = dockerStarter({
  container: 'db-test',
  image: 'mongo:4.0.4',
  extraOptions: '--restart on-failure:5', // optional
  containerPort: 27017,
  publishedPort: 27019,
});

const work = async () => {
const { host, port, wasAlreadyRunning } = await mongo.ensureRunning();

// do some stuff requiring mongo

await mongo.stopAndRemove();
}

work();

```
