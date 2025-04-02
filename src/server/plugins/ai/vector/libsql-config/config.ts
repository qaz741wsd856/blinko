import type { Config, IntMode } from "./api";
import { LibsqlError } from "./api";
import type { Authority } from "./uri";
import { parseUri } from "./uri";
import { supportedUrlLink } from "./util";

export interface ExpandedConfig {
  scheme: ExpandedScheme;
  tls: boolean;
  authority: Authority | undefined;
  path: string;
  authToken: string | undefined;
  encryptionKey: string | undefined;
  syncUrl: string | undefined;
  syncInterval: number | undefined;
  readYourWrites: boolean | undefined;
  offline: boolean | undefined;
  intMode: IntMode;
  fetch: Function | undefined;
  concurrency: number;
}

export type ExpandedScheme = "wss" | "ws" | "https" | "http" | "file";

type queryParamDef = {
  values?: string[];
  update?: (key: string, value: string) => void;
};
type queryParamsDef = { [key: string]: queryParamDef };

const inMemoryMode = ":memory:";

export function isInMemoryConfig(config: ExpandedConfig): boolean {
  return (
    config.scheme === "file" &&
    (config.path === ":memory:" || config.path.startsWith(":memory:?"))
  );
}

export function expandConfig(
  config: Readonly<Config>,
  preferHttp: boolean,
): ExpandedConfig {
  if (typeof config !== "object") {
    // produce a reasonable error message in the common case where users type
    // `createClient("libsql://...")` instead of `createClient({url: "libsql://..."})`
    throw new TypeError(
      `Expected client configuration as object, got ${typeof config}`,
    );
  }

  let { url, authToken, tls, intMode, concurrency } = config;
  // fill simple defaults right here
  concurrency = Math.max(0, concurrency || 20);
  intMode ??= "number";

  let connectionQueryParams: string[] = []; // recognized query parameters which we sanitize through white list of valid key-value pairs

  // convert plain :memory: url to URI format to make logic more uniform
  if (url === inMemoryMode) {
    url = "file::memory:";
  }

  // parse url parameters first and override config with update values
  const uri = parseUri(url);
  const originalUriScheme = uri.scheme.toLowerCase();
  const isInMemoryMode =
    originalUriScheme === "file" &&
    uri.path === inMemoryMode &&
    uri.authority === undefined;

  let queryParamsDef: queryParamsDef;
  if (isInMemoryMode) {
    queryParamsDef = {
      cache: {
        values: ["shared", "private"],
        update: (key, value) =>
          connectionQueryParams.push(`${key}=${value}`),
      },
    };
  } else {
    queryParamsDef = {
      tls: {
        values: ["0", "1"],
        update: (_, value) => (tls = value === "1"),
      },
      authToken: {
        update: (_, value) => (authToken = value),
      },
    };
  }

  for (const { key, value } of uri.query?.pairs ?? []) {
    if (!Object.hasOwn(queryParamsDef, key)) {
      throw new LibsqlError(
        `Unsupported URL query parameter ${JSON.stringify(key)}`,
        "URL_PARAM_NOT_SUPPORTED",
      );
    }
    const queryParamDef = queryParamsDef[key];
    if (
      //@ts-ignore
      queryParamDef.values !== undefined &&
      //@ts-ignore
      !queryParamDef.values.includes(value)
    ) {
      throw new LibsqlError(
        //@ts-ignore
        `Unknown value for the "${key}" query argument: ${JSON.stringify(value)}. Supported values are: [${queryParamDef.values.map((x) => '"' + x + '"').join(", ")}]`,
        "URL_INVALID",
      );
    }
    //@ts-ignore
    if (queryParamDef.update !== undefined) {
      queryParamDef?.update(key, value);
    }
  }

  // fill complex defaults & validate config
  const connectionQueryParamsString =
    connectionQueryParams.length === 0
      ? ""
      : `?${connectionQueryParams.join("&")}`;
  const path = uri.path + connectionQueryParamsString;
  console.log('path', path, 'pathxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  let scheme: string;
  if (originalUriScheme === "libsql") {
    if (tls === false) {
      if (uri.authority?.port === undefined) {
        throw new LibsqlError(
          'A "libsql:" URL with ?tls=0 must specify an explicit port',
          "URL_INVALID",
        );
      }
      scheme = preferHttp ? "http" : "ws";
    } else {
      scheme = preferHttp ? "https" : "wss";
    }
  } else {
    scheme = originalUriScheme;
  }
  if (scheme === "http" || scheme === "ws") {
    tls ??= false;
  } else {
    tls ??= true;
  }

  if (
    scheme !== "http" &&
    scheme !== "ws" &&
    scheme !== "https" &&
    scheme !== "wss" &&
    scheme !== "file"
  ) {
    throw new LibsqlError(
      'The client supports only "libsql:", "wss:", "ws:", "https:", "http:" and "file:" URLs, ' +
      `got ${JSON.stringify(uri.scheme + ":")}. ` +
      `For more information, please read ${supportedUrlLink}`,
      "URL_SCHEME_NOT_SUPPORTED",
    );
  }
  if (intMode !== "number" && intMode !== "bigint" && intMode !== "string") {
    throw new TypeError(
      `Invalid value for intMode, expected "number", "bigint" or "string", got ${JSON.stringify(intMode)}`,
    );
  }
  if (uri.fragment !== undefined) {
    throw new LibsqlError(
      `URL fragments are not supported: ${JSON.stringify("#" + uri.fragment)}`,
      "URL_INVALID",
    );
  }

  if (isInMemoryMode) {
    return {
      scheme: "file",
      tls: false,
      path,
      intMode,
      concurrency,
      syncUrl: config.syncUrl,
      syncInterval: config.syncInterval,
      readYourWrites: config.readYourWrites,
      offline: config.offline,
      fetch: config.fetch,
      authToken: undefined,
      encryptionKey: undefined,
      authority: undefined,
    };
  }

  return {
    scheme,
    tls,
    authority: uri.authority,
    path,
    authToken,
    intMode,
    concurrency,
    encryptionKey: config.encryptionKey,
    syncUrl: config.syncUrl,
    syncInterval: config.syncInterval,
    readYourWrites: config.readYourWrites,
    offline: config.offline,
    fetch: config.fetch,
  };
}