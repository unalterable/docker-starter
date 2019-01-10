const shell = require('shelljs');

const exec = (cmd, options) => {
  if (options && options.log) console.info(cmd);
  return shell.exec(cmd, { silent: true, ...options });
};
const isRunningOnMac = () => exec('uname -a').toString().includes('Darwin');
const logOldImage = container => console.info(`Container ${container} running but with outdated image`);

const wait = (seconds) => new Promise(res => setTimeout(res, seconds * 1000))
const pollWithTimeout = (func, timeout) => Promise.resolve().then(()=> {
  const isTimedOut = ((start) => () => Date.now() - start > timeout * 1000)(Date.now());
  const poll = () => func().catch(err => wait(1).then(() => !isTimedOut() ? poll() : Promise.reject(err)))
  return poll()
})

const dockerHandle = ({
  container,
  image,
  extraOptions,
  containerPort,
  publishedPort,
  readinessProbe,
  readinessTimeout,
}) => {
  let host;
  let port;
  let wasAlreadyRunning;

  const runContainerCmd = `docker run -d -p ${publishedPort}:${containerPort} --name ${container} ${extraOptions || ''} ${image}`;

  const isContainerNameExisting = () => exec(`docker ps -a --format "{{.Names}}" | grep ${container}`).code === 0;
  const isContainerFromCorrectImage = () => exec(`docker inspect ${container} --format "{{ .Config.Image }}"`).toString().trim() === image;
  const isContainerRunning = () => exec(`docker ps --format "{{.Names}}" | grep ${container}`).code === 0;
  const startContainer = () => exec(`docker start ${container}`, { log: true });
  const getContainerIP = () => exec(`docker inspect --format "{{ .NetworkSettings.IPAddress }}" ${container}`).toString().trim();

  const stopContainer = () => (isContainerRunning() && exec(`docker stop ${container}`, { log: true }));
  const removeContainer = () => (isContainerNameExisting() && exec(`docker rm ${container}`, { log: true }));

  const isContainerAvailable = () => (isContainerNameExisting() && (isContainerFromCorrectImage() || logOldImage(container)));
  const ensureContainersRemoved = () => ((stopContainer(), removeContainer()));
  const runContainer = () => ((ensureContainersRemoved(), exec(runContainerCmd, { log: true, silent: false })));
  const ensureContainerStarted = () => (isContainerRunning() || (startContainer(), false));
  const ensureContainerRunning = () => (isContainerAvailable() ? ensureContainerStarted() : (runContainer(), false));

  const getHostAndPort = () => (isRunningOnMac() ? { host: 'localhost', port: publishedPort } : { host: getContainerIP(), port: containerPort });

  return {
    ensureRunning: () => Promise.resolve()
      .then(() => {
        if (!host) {
          wasAlreadyRunning = ensureContainerRunning();
          ({ host, port } = getHostAndPort());
        }
      })
      .then(() => readinessProbe && pollWithTimeout(() => readinessProbe({ host, port, wasAlreadyRunning }), readinessTimeout || 30))
      .catch(err => {
        ensureContainersRemoved();
        throw Error(`Readiness probe failed: ${err}`);
      })
      .then(() => console.info(`Container "${container}" is running, and can be controlled on: ${host}:${port}`))
      .then(() => ({ host, port, wasAlreadyRunning })),
    stopAndRemove: () => Promise.resolve(ensureContainersRemoved()),
  };
};

module.exports = dockerHandle;


