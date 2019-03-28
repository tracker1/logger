import console from "console";
import process from "process";
import util from "util";
import fclone from "fclone";
import rollingFile from "rolling-file";
import mkdirp from "mkdirp";
import newId from "uuid/v4";
import { packageBase } from "./pkg";

const timer = _ => {
  const started = process.hrtime();
  const millis = hrt => hrt[0] * 1000 + hrt[1] / 1000000;
  return _ => Math.ceil(millis(process.hrtime()) - millis(started));
};

export const LEVELS = Object.seal({
  FATAL: 1000,
  ERROR: 900,
  START: 750,
  STOP: 700,
  RESPONSE: 650,
  REQUEST: 600,
  WARN: 500,
  INFO: 400,
  CLIENTRESPONSE: 350,
  CLIENTREQUEST: 300,
  DEBUG: 200,
  TRACE: 100
});

const levelsByNumber = Object.keys(LEVELS).reduce(
  (a, k) => Object.assign(a, { [LEVELS[k]]: k }),
  {}
);

const clearStack = obj => {
  if (typeof obj !== "object") return;
  if (obj.stack) {
    delete obj.stack; // eslint-disable-line
  }
  Object.keys(obj).forEach(clearStack);
  return obj;
};

export function parseLogLevel(level) {
  // numeric matching
  if (!isNaN(level)) {
    return levelsByNumber[level] ? level : null;
  }

  const m =
    LEVELS[
      String(level)
        .trim()
        .toUpperCase()
    ] || null;
  return m || null;
}

export function getLogName(level) {
  const m = levelsByNumber[parseLogLevel(level)];
  return m || null;
}

export const formatDetail = (...args) =>
  args.length === 1 && typeof args[0] === "object"
    ? fclone(args[0])
    : { message: util.format(...args) };

export const canLog = (level, logLevel) => {
  level = parseLogLevel(level);
  return level >= logLevel;
};

// format message for output
export const formatMessage = (options, level, ...args) => {
  const logLevel = options.level;
  const application = options.application;

  // eslint-disable-next-line no-param-reassign
  level = parseLogLevel(level);
  if (level < options.level) return null;

  if (typeof args[0]) if (args.length < 1) return null;
  if (args.length === 1 && (args[0] === null || args[0] === undefined))
    return null;
  const item = {
    level: getLogName(level),
    logged: new Date(),
    application,
    detail: formatDetail(...args)
  };
  if (options.level > LEVELS.INFO) {
    clearStack(item.detail);
  }

  return item;
};

const normalizeOptions = input => {
  const options = Object.assign(
    {
      path: process.env.LOG_PATH,
      pretty: process.env.LOG_PRETTY,
      quiet: process.env.LOG_QUIET,
      app: {}
    },
    input
  );
  const app = (options.app = Object.assign(
    {
      name: "unknown-application",
      version: "0.0.0",
      build: "unknown-build"
    },
    packageBase,
    options.app
  ));

  options.application = `${app.name}@${app.version}/${app.build}`;
  options.level =
    parseLogLevel(options.level || process.env.LOG_LEVEL) || LEVELS.REQUEST;

  return options;
};

export default (options = {}) => {
  options = normalizeOptions(options);

  let rf = null;
  if (options.path) {
    mkdirp.sync(options.path);
    rf = rollingFile(options.path, {
      fileName: options.app.name,
      byteLimit: "500 mb",
      interval: "1 day"
    });
  }

  const cleanupResult = result => {
    if (typeof result === "object") {
      result = fclone(result);
      if (options.level > LEVELS.INFO) {
        result = clearStack(result);
      }
    }
    return result;
  };

  const logRaw = item => {
    if (!item) return;

    // JSON stringified version
    let item2 = JSON.stringify(item);

    if (!options.quiet) {
      if (!options.pretty) {
        console[options.level >= LEVELS.ERROR ? "error" : "log"](item2);
      } else {
        let { level, logged, application, id, detail, result } = item;
        detail = { ...detail, id, result };
        if (!detail.id) delete detail.id;
        if (!detail.result) delete detail.result;
        console[options.level >= LEVELS.ERROR ? "error" : "log"](
          logged,
          level,
          application,
          detail
        );
      }
    }
    if (rf) {
      rf.write(item2);
    }
  };

  const log = level => (...args) => {
    // format JSON for logging
    let item = formatMessage(options, level, ...args);
    return logRaw(item);
  };

  const timerLog = (requestLevel, responseLevel) => (message, fn) => {
    message = formatDetail(message);
    let item = {
      ...formatMessage(options, LEVELS.FATAL, message),
      id: message.id || newId()
    };

    if (canLog(requestLevel, options.level)) {
      logRaw({ ...item, level: getLogName(requestLevel) });
    }
    const stop = timer();

    return Promise.resolve(fn()).then(
      value => {
        if (canLog(responseLevel, options.level)) {
          value = cleanupResult(value);
          logRaw({
            ...item,
            level: getLogName(responseLevel),
            result: { value, time: stop() }
          });
        }
        return value;
      },
      error => {
        if (canLog(LEVELS.ERROR, options.level)) {
          error = cleanupResult(error);
          logRaw({
            ...item,
            level: getLogName(LEVELS.ERROR),
            result: { error, time: stop() }
          });
        }
        throw error;
      }
    );
  };

  return {
    levels: LEVELS,
    get level() {
      return getLogName(options.level);
    },
    set level(newLevel) {
      options.level = parseLogLevel(newLevel) || options.level;
    },
    format: (level, ...args) => formatMessage(options, level, ...args),
    logRaw: (level, ...args) => log(level)(...args),
    log: log(LEVELS.INFO),
    fatal: log(LEVELS.FATAL),
    error: log(LEVELS.ERROR),
    start: log(LEVELS.START),
    stop: log(LEVELS.STOP),
    response: log(LEVELS.RESPONSE),
    request: log(LEVELS.REQUEST),
    warn: log(LEVELS.WARN),
    info: log(LEVELS.INFO),
    clientResponse: log(LEVELS.CLIENTRESPONSE),
    clientRequest: log(LEVELS.CLIENTREQUEST),
    debug: log(LEVELS.DEBUG),
    trace: log(LEVELS.TRACE),
    timeRequest: timerLog(LEVELS.REQUEST, LEVELS.RESPONSE),
    timeClientRequest: timerLog(LEVELS.CLIENTREQUEST, LEVELS.CLIENTRESPONSE)
  };
};
