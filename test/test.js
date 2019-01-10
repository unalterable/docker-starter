const assert = require('assert');
const { exec } = require('shelljs');
const dockerStarter = require('../index.js');

const shellOpts = { silent: true }

const containerName =  'docker-starter-test-server'

const consoleInfo = console.info;

describe('', async () => {
  let testImage;

  before(() => {
    assert(exec('docker -v', shellOpts).code === 0, 'Docker not installed');
    const buildOutput = exec('docker build test', shellOpts).stdout.match(/Successfully built (.*)/);
    assert(buildOutput, 'Test image failed to build');
    testImage = buildOutput[1];
    assert(exec(`docker images | grep ${testImage}`, shellOpts).code === 0,
      `Image '${testImage}' has not been created`)
    console.info = () => {};
  });

  after(() => {
    exec(`docker image rm ${testImage}`, shellOpts);
    assert(exec(`docker images | grep ${testImage}`, shellOpts).code !== 0,
      `Image '${testImage}' has not been deleted`)
    console.info = consoleInfo;
  });

  it('starts and stops', async () => {
    const mongo = dockerStarter({
      container: containerName,
      image: testImage,
      containerPort: 8080,
      publishedPort: 8080,
    });

    const res = await mongo.ensureRunning();

    const dockerOutput = exec(`docker ps | grep ${testImage}`, shellOpts).stdout;
    assert(dockerOutput.includes(testImage), 'Image was not started as a container')
    assert(dockerOutput.includes(containerName), 'Image was not started with correct name')

    await mongo.stopAndRemove();

    assert(exec(`docker ps | grep ${testImage}`, shellOpts).code !== 0,
      `Container using image '${testImage}' has been left running`)
    assert(exec(`docker ps | grep ${containerName}`, shellOpts).code !== 0,
      `Container using container name '${containerName}' has been left running`)
  })

  it('should fail and tear down if readinessProbe fails', async () => {
    const mongo = dockerStarter({
      container: containerName,
      image: testImage,
      containerPort: 8080,
      publishedPort: 8080,
      readinessProbe: async ({ host, port }) => { throw 'blob' },
      readinessTimeout: 5,
    });

    let errorOccured = false;
    try {
      await mongo.ensureRunning();
    } catch (e) {
      errorOccured = true;
      assert(e.message.includes('Readiness probe failed'), 'Error message incorrect')
      assert(e.message.includes('blob'), 'Error message did not include readinessProbe error')
    }
    assert(errorOccured, 'The promise did not reject');

    assert(exec(`docker ps | grep ${testImage}`, shellOpts).code !== 0,
      `Container using image '${testImage}' has been left running`)
    assert(exec(`docker ps | grep ${containerName}`, shellOpts).code !== 0,
      `Container using container name '${containerName}' has been left running`)
  })

  it('should respect the readinessTimeout')
  it('should call the readinessProbe until it succeeds (barring timeout)')
  it('should succeed if readinessProbe succeeds')

  it('should receive host, port, and wasAlreadyRunning bool into readinessProbe function')
  it('should start a container listening on the right port which forwards to the right port')
  it('should start a container listening on the right port')
  it('should receive host, port, and wasAlreadyRunning bool into readinessProbe function')
});
