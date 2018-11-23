const shell = require('shelljs');

const andPause = '&& sleep 5';
const exec = (cmd, options) => {
  if (options && options.log) console.info(cmd);
  return shell.exec(cmd, { silent: true, ...options });
};
const isRunningOnMac = () => exec('uname -a').toString().includes('Darwin');
const logOldImage = container => console.info(`Container ${container} running but with outdated image`);

const dockerHandle = ({
  container,
  image,
  extraOptions,
  containerPort,
  publishedPort,
}) => {
  let host;
  let port;
  let wasAlreadyRunning;

  const runContainerCmd = `docker run -d -p ${publishedPort}:${containerPort} --name ${container} ${extraOptions || ''} ${image} ${andPause}`;

  const isContainerNameExisting = () => exec(`docker ps -a --format "{{.Names}}" | grep ${container}`).code === 0;
  const isContainerFromCorrectImage = () => exec(`docker inspect ${container} --format "{{ .Config.Image }}"`).toString().trim() === image;
  const isContainerRunning = () => exec(`docker ps --format "{{.Names}}" | grep ${container}`).code === 0;
  const startContainer = () => exec(`docker start ${container} ${andPause}`, { log: true });
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
    ensureRunning: () => {
      if (!host) {
        wasAlreadyRunning = ensureContainerRunning();
        ({ host, port } = getHostAndPort());
        console.info(`Container "${container}" is running, and can be controlled on: ${host}:${port}`);
      }
      return { host, port, wasAlreadyRunning };
    },
    stopAndRemove: () => ensureContainersRemoved(),
  };
};

module.exports = dockerHandle;
