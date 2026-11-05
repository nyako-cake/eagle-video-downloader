var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/i18next/dist/cjs/i18next.js
var require_i18next = __commonJS({
  "node_modules/i18next/dist/cjs/i18next.js"(exports2, module2) {
    "use strict";
    var isString = (obj) => typeof obj === "string";
    var defer = () => {
      let res;
      let rej;
      const promise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
      });
      promise.resolve = res;
      promise.reject = rej;
      return promise;
    };
    var makeString = (object) => {
      if (object == null)
        return "";
      return "" + object;
    };
    var copy = (a, s, t) => {
      a.forEach((m) => {
        if (s[m])
          t[m] = s[m];
      });
    };
    var lastOfPathSeparatorRegExp = /###/g;
    var cleanKey = (key) => key && key.indexOf("###") > -1 ? key.replace(lastOfPathSeparatorRegExp, ".") : key;
    var canNotTraverseDeeper = (object) => !object || isString(object);
    var getLastOfPath = (object, path, Empty) => {
      const stack = !isString(path) ? path : path.split(".");
      let stackIndex = 0;
      while (stackIndex < stack.length - 1) {
        if (canNotTraverseDeeper(object))
          return {};
        const key = cleanKey(stack[stackIndex]);
        if (!object[key] && Empty)
          object[key] = new Empty();
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          object = object[key];
        } else {
          object = {};
        }
        ++stackIndex;
      }
      if (canNotTraverseDeeper(object))
        return {};
      return {
        obj: object,
        k: cleanKey(stack[stackIndex])
      };
    };
    var setPath = (object, path, newValue) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path, Object);
      if (obj !== void 0 || path.length === 1) {
        obj[k] = newValue;
        return;
      }
      let e = path[path.length - 1];
      let p = path.slice(0, path.length - 1);
      let last = getLastOfPath(object, p, Object);
      while (last.obj === void 0 && p.length) {
        e = `${p[p.length - 1]}.${e}`;
        p = p.slice(0, p.length - 1);
        last = getLastOfPath(object, p, Object);
        if (last && last.obj && typeof last.obj[`${last.k}.${e}`] !== "undefined") {
          last.obj = void 0;
        }
      }
      last.obj[`${last.k}.${e}`] = newValue;
    };
    var pushPath = (object, path, newValue, concat) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path, Object);
      obj[k] = obj[k] || [];
      obj[k].push(newValue);
    };
    var getPath = (object, path) => {
      const {
        obj,
        k
      } = getLastOfPath(object, path);
      if (!obj)
        return void 0;
      return obj[k];
    };
    var getPathWithDefaults = (data, defaultData, key) => {
      const value = getPath(data, key);
      if (value !== void 0) {
        return value;
      }
      return getPath(defaultData, key);
    };
    var deepExtend = (target, source, overwrite) => {
      for (const prop in source) {
        if (prop !== "__proto__" && prop !== "constructor") {
          if (prop in target) {
            if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
              if (overwrite)
                target[prop] = source[prop];
            } else {
              deepExtend(target[prop], source[prop], overwrite);
            }
          } else {
            target[prop] = source[prop];
          }
        }
      }
      return target;
    };
    var regexEscape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    var _entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;"
    };
    var escape = (data) => {
      if (isString(data)) {
        return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
      }
      return data;
    };
    var RegExpCache = class {
      constructor(capacity) {
        this.capacity = capacity;
        this.regExpMap = /* @__PURE__ */ new Map();
        this.regExpQueue = [];
      }
      getRegExp(pattern) {
        const regExpFromCache = this.regExpMap.get(pattern);
        if (regExpFromCache !== void 0) {
          return regExpFromCache;
        }
        const regExpNew = new RegExp(pattern);
        if (this.regExpQueue.length === this.capacity) {
          this.regExpMap.delete(this.regExpQueue.shift());
        }
        this.regExpMap.set(pattern, regExpNew);
        this.regExpQueue.push(pattern);
        return regExpNew;
      }
    };
    var chars = [" ", ",", "?", "!", ";"];
    var looksLikeObjectPathRegExpCache = new RegExpCache(20);
    var looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
      nsSeparator = nsSeparator || "";
      keySeparator = keySeparator || "";
      const possibleChars = chars.filter((c) => nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0);
      if (possibleChars.length === 0)
        return true;
      const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c) => c === "?" ? "\\?" : c).join("|")})`);
      let matched = !r.test(key);
      if (!matched) {
        const ki = key.indexOf(keySeparator);
        if (ki > 0 && !r.test(key.substring(0, ki))) {
          matched = true;
        }
      }
      return matched;
    };
    var deepFind = function(obj, path) {
      let keySeparator = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : ".";
      if (!obj)
        return void 0;
      if (obj[path])
        return obj[path];
      const tokens = path.split(keySeparator);
      let current = obj;
      for (let i = 0; i < tokens.length; ) {
        if (!current || typeof current !== "object") {
          return void 0;
        }
        let next;
        let nextPath = "";
        for (let j = i; j < tokens.length; ++j) {
          if (j !== i) {
            nextPath += keySeparator;
          }
          nextPath += tokens[j];
          next = current[nextPath];
          if (next !== void 0) {
            if (["string", "number", "boolean"].indexOf(typeof next) > -1 && j < tokens.length - 1) {
              continue;
            }
            i += j - i + 1;
            break;
          }
        }
        current = next;
      }
      return current;
    };
    var getCleanedCode = (code) => code && code.replace("_", "-");
    var consoleLogger = {
      type: "logger",
      log(args) {
        this.output("log", args);
      },
      warn(args) {
        this.output("warn", args);
      },
      error(args) {
        this.output("error", args);
      },
      output(type, args) {
        if (console && console[type])
          console[type].apply(console, args);
      }
    };
    var Logger = class _Logger {
      constructor(concreteLogger) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        this.init(concreteLogger, options);
      }
      init(concreteLogger) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        this.prefix = options.prefix || "i18next:";
        this.logger = concreteLogger || consoleLogger;
        this.options = options;
        this.debug = options.debug;
      }
      log() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        return this.forward(args, "log", "", true);
      }
      warn() {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
        return this.forward(args, "warn", "", true);
      }
      error() {
        for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          args[_key3] = arguments[_key3];
        }
        return this.forward(args, "error", "");
      }
      deprecate() {
        for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
          args[_key4] = arguments[_key4];
        }
        return this.forward(args, "warn", "WARNING DEPRECATED: ", true);
      }
      forward(args, lvl, prefix, debugOnly) {
        if (debugOnly && !this.debug)
          return null;
        if (isString(args[0]))
          args[0] = `${prefix}${this.prefix} ${args[0]}`;
        return this.logger[lvl](args);
      }
      create(moduleName) {
        return new _Logger(this.logger, {
          ...{
            prefix: `${this.prefix}:${moduleName}:`
          },
          ...this.options
        });
      }
      clone(options) {
        options = options || this.options;
        options.prefix = options.prefix || this.prefix;
        return new _Logger(this.logger, options);
      }
    };
    var baseLogger = new Logger();
    var EventEmitter = class {
      constructor() {
        this.observers = {};
      }
      on(events, listener) {
        events.split(" ").forEach((event) => {
          if (!this.observers[event])
            this.observers[event] = /* @__PURE__ */ new Map();
          const numListeners = this.observers[event].get(listener) || 0;
          this.observers[event].set(listener, numListeners + 1);
        });
        return this;
      }
      off(event, listener) {
        if (!this.observers[event])
          return;
        if (!listener) {
          delete this.observers[event];
          return;
        }
        this.observers[event].delete(listener);
      }
      emit(event) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }
        if (this.observers[event]) {
          const cloned = Array.from(this.observers[event].entries());
          cloned.forEach((_ref) => {
            let [observer, numTimesAdded] = _ref;
            for (let i = 0; i < numTimesAdded; i++) {
              observer(...args);
            }
          });
        }
        if (this.observers["*"]) {
          const cloned = Array.from(this.observers["*"].entries());
          cloned.forEach((_ref2) => {
            let [observer, numTimesAdded] = _ref2;
            for (let i = 0; i < numTimesAdded; i++) {
              observer.apply(observer, [event, ...args]);
            }
          });
        }
      }
    };
    var ResourceStore = class extends EventEmitter {
      constructor(data) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
          ns: ["translation"],
          defaultNS: "translation"
        };
        super();
        this.data = data || {};
        this.options = options;
        if (this.options.keySeparator === void 0) {
          this.options.keySeparator = ".";
        }
        if (this.options.ignoreJSONStructure === void 0) {
          this.options.ignoreJSONStructure = true;
        }
      }
      addNamespaces(ns) {
        if (this.options.ns.indexOf(ns) < 0) {
          this.options.ns.push(ns);
        }
      }
      removeNamespaces(ns) {
        const index = this.options.ns.indexOf(ns);
        if (index > -1) {
          this.options.ns.splice(index, 1);
        }
      }
      getResource(lng, ns, key) {
        let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        const ignoreJSONStructure = options.ignoreJSONStructure !== void 0 ? options.ignoreJSONStructure : this.options.ignoreJSONStructure;
        let path;
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
        } else {
          path = [lng, ns];
          if (key) {
            if (Array.isArray(key)) {
              path.push(...key);
            } else if (isString(key) && keySeparator) {
              path.push(...key.split(keySeparator));
            } else {
              path.push(key);
            }
          }
        }
        const result = getPath(this.data, path);
        if (!result && !ns && !key && lng.indexOf(".") > -1) {
          lng = path[0];
          ns = path[1];
          key = path.slice(2).join(".");
        }
        if (result || !ignoreJSONStructure || !isString(key))
          return result;
        return deepFind(this.data && this.data[lng] && this.data[lng][ns], key, keySeparator);
      }
      addResource(lng, ns, key, value) {
        let options = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {
          silent: false
        };
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        let path = [lng, ns];
        if (key)
          path = path.concat(keySeparator ? key.split(keySeparator) : key);
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
          value = ns;
          ns = path[1];
        }
        this.addNamespaces(ns);
        setPath(this.data, path, value);
        if (!options.silent)
          this.emit("added", lng, ns, key, value);
      }
      addResources(lng, ns, resources) {
        let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {
          silent: false
        };
        for (const m in resources) {
          if (isString(resources[m]) || Array.isArray(resources[m]))
            this.addResource(lng, ns, m, resources[m], {
              silent: true
            });
        }
        if (!options.silent)
          this.emit("added", lng, ns, resources);
      }
      addResourceBundle(lng, ns, resources, deep, overwrite) {
        let options = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {
          silent: false,
          skipCopy: false
        };
        let path = [lng, ns];
        if (lng.indexOf(".") > -1) {
          path = lng.split(".");
          deep = resources;
          resources = ns;
          ns = path[1];
        }
        this.addNamespaces(ns);
        let pack = getPath(this.data, path) || {};
        if (!options.skipCopy)
          resources = JSON.parse(JSON.stringify(resources));
        if (deep) {
          deepExtend(pack, resources, overwrite);
        } else {
          pack = {
            ...pack,
            ...resources
          };
        }
        setPath(this.data, path, pack);
        if (!options.silent)
          this.emit("added", lng, ns, resources);
      }
      removeResourceBundle(lng, ns) {
        if (this.hasResourceBundle(lng, ns)) {
          delete this.data[lng][ns];
        }
        this.removeNamespaces(ns);
        this.emit("removed", lng, ns);
      }
      hasResourceBundle(lng, ns) {
        return this.getResource(lng, ns) !== void 0;
      }
      getResourceBundle(lng, ns) {
        if (!ns)
          ns = this.options.defaultNS;
        if (this.options.compatibilityAPI === "v1")
          return {
            ...{},
            ...this.getResource(lng, ns)
          };
        return this.getResource(lng, ns);
      }
      getDataByLanguage(lng) {
        return this.data[lng];
      }
      hasLanguageSomeTranslations(lng) {
        const data = this.getDataByLanguage(lng);
        const n = data && Object.keys(data) || [];
        return !!n.find((v) => data[v] && Object.keys(data[v]).length > 0);
      }
      toJSON() {
        return this.data;
      }
    };
    var postProcessor = {
      processors: {},
      addPostProcessor(module3) {
        this.processors[module3.name] = module3;
      },
      handle(processors, value, key, options, translator) {
        processors.forEach((processor) => {
          if (this.processors[processor])
            value = this.processors[processor].process(value, key, options, translator);
        });
        return value;
      }
    };
    var checkedLoadedFor = {};
    var Translator = class _Translator extends EventEmitter {
      constructor(services) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        super();
        copy(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], services, this);
        this.options = options;
        if (this.options.keySeparator === void 0) {
          this.options.keySeparator = ".";
        }
        this.logger = baseLogger.create("translator");
      }
      changeLanguage(lng) {
        if (lng)
          this.language = lng;
      }
      exists(key) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
          interpolation: {}
        };
        if (key === void 0 || key === null) {
          return false;
        }
        const resolved = this.resolve(key, options);
        return resolved && resolved.res !== void 0;
      }
      extractFromKey(key, options) {
        let nsSeparator = options.nsSeparator !== void 0 ? options.nsSeparator : this.options.nsSeparator;
        if (nsSeparator === void 0)
          nsSeparator = ":";
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        let namespaces = options.ns || this.options.defaultNS || [];
        const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
        const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !options.keySeparator && !this.options.userDefinedNsSeparator && !options.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
        if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
          const m = key.match(this.interpolator.nestingRegexp);
          if (m && m.length > 0) {
            return {
              key,
              namespaces: isString(namespaces) ? [namespaces] : namespaces
            };
          }
          const parts = key.split(nsSeparator);
          if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.indexOf(parts[0]) > -1)
            namespaces = parts.shift();
          key = parts.join(keySeparator);
        }
        return {
          key,
          namespaces: isString(namespaces) ? [namespaces] : namespaces
        };
      }
      translate(keys, options, lastKey) {
        if (typeof options !== "object" && this.options.overloadTranslationOptionHandler) {
          options = this.options.overloadTranslationOptionHandler(arguments);
        }
        if (typeof options === "object")
          options = {
            ...options
          };
        if (!options)
          options = {};
        if (keys === void 0 || keys === null)
          return "";
        if (!Array.isArray(keys))
          keys = [String(keys)];
        const returnDetails = options.returnDetails !== void 0 ? options.returnDetails : this.options.returnDetails;
        const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
        const {
          key,
          namespaces
        } = this.extractFromKey(keys[keys.length - 1], options);
        const namespace = namespaces[namespaces.length - 1];
        const lng = options.lng || this.language;
        const appendNamespaceToCIMode = options.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
        if (lng && lng.toLowerCase() === "cimode") {
          if (appendNamespaceToCIMode) {
            const nsSeparator = options.nsSeparator || this.options.nsSeparator;
            if (returnDetails) {
              return {
                res: `${namespace}${nsSeparator}${key}`,
                usedKey: key,
                exactUsedKey: key,
                usedLng: lng,
                usedNS: namespace,
                usedParams: this.getUsedParamsDetails(options)
              };
            }
            return `${namespace}${nsSeparator}${key}`;
          }
          if (returnDetails) {
            return {
              res: key,
              usedKey: key,
              exactUsedKey: key,
              usedLng: lng,
              usedNS: namespace,
              usedParams: this.getUsedParamsDetails(options)
            };
          }
          return key;
        }
        const resolved = this.resolve(keys, options);
        let res = resolved && resolved.res;
        const resUsedKey = resolved && resolved.usedKey || key;
        const resExactUsedKey = resolved && resolved.exactUsedKey || key;
        const resType = Object.prototype.toString.apply(res);
        const noObject = ["[object Number]", "[object Function]", "[object RegExp]"];
        const joinArrays = options.joinArrays !== void 0 ? options.joinArrays : this.options.joinArrays;
        const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
        const handleAsObject = !isString(res) && typeof res !== "boolean" && typeof res !== "number";
        if (handleAsObjectInI18nFormat && res && handleAsObject && noObject.indexOf(resType) < 0 && !(isString(joinArrays) && Array.isArray(res))) {
          if (!options.returnObjects && !this.options.returnObjects) {
            if (!this.options.returnedObjectHandler) {
              this.logger.warn("accessing an object - but returnObjects options is not enabled!");
            }
            const r = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(resUsedKey, res, {
              ...options,
              ns: namespaces
            }) : `key '${key} (${this.language})' returned an object instead of string.`;
            if (returnDetails) {
              resolved.res = r;
              resolved.usedParams = this.getUsedParamsDetails(options);
              return resolved;
            }
            return r;
          }
          if (keySeparator) {
            const resTypeIsArray = Array.isArray(res);
            const copy2 = resTypeIsArray ? [] : {};
            const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
            for (const m in res) {
              if (Object.prototype.hasOwnProperty.call(res, m)) {
                const deepKey = `${newKeyToUse}${keySeparator}${m}`;
                copy2[m] = this.translate(deepKey, {
                  ...options,
                  ...{
                    joinArrays: false,
                    ns: namespaces
                  }
                });
                if (copy2[m] === deepKey)
                  copy2[m] = res[m];
              }
            }
            res = copy2;
          }
        } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
          res = res.join(joinArrays);
          if (res)
            res = this.extendTranslation(res, keys, options, lastKey);
        } else {
          let usedDefault = false;
          let usedKey = false;
          const needsPluralHandling = options.count !== void 0 && !isString(options.count);
          const hasDefaultValue = _Translator.hasDefaultValue(options);
          const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, options.count, options) : "";
          const defaultValueSuffixOrdinalFallback = options.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, options.count, {
            ordinal: false
          }) : "";
          const needsZeroSuffixLookup = needsPluralHandling && !options.ordinal && options.count === 0 && this.pluralResolver.shouldUseIntlApi();
          const defaultValue = needsZeroSuffixLookup && options[`defaultValue${this.options.pluralSeparator}zero`] || options[`defaultValue${defaultValueSuffix}`] || options[`defaultValue${defaultValueSuffixOrdinalFallback}`] || options.defaultValue;
          if (!this.isValidLookup(res) && hasDefaultValue) {
            usedDefault = true;
            res = defaultValue;
          }
          if (!this.isValidLookup(res)) {
            usedKey = true;
            res = key;
          }
          const missingKeyNoValueFallbackToKey = options.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
          const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? void 0 : res;
          const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
          if (usedKey || usedDefault || updateMissing) {
            this.logger.log(updateMissing ? "updateKey" : "missingKey", lng, namespace, key, updateMissing ? defaultValue : res);
            if (keySeparator) {
              const fk = this.resolve(key, {
                ...options,
                keySeparator: false
              });
              if (fk && fk.res)
                this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
            }
            let lngs = [];
            const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, options.lng || this.language);
            if (this.options.saveMissingTo === "fallback" && fallbackLngs && fallbackLngs[0]) {
              for (let i = 0; i < fallbackLngs.length; i++) {
                lngs.push(fallbackLngs[i]);
              }
            } else if (this.options.saveMissingTo === "all") {
              lngs = this.languageUtils.toResolveHierarchy(options.lng || this.language);
            } else {
              lngs.push(options.lng || this.language);
            }
            const send = (l, k, specificDefaultValue) => {
              const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
              if (this.options.missingKeyHandler) {
                this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, options);
              } else if (this.backendConnector && this.backendConnector.saveMissing) {
                this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, options);
              }
              this.emit("missingKey", l, namespace, k, res);
            };
            if (this.options.saveMissing) {
              if (this.options.saveMissingPlurals && needsPluralHandling) {
                lngs.forEach((language) => {
                  const suffixes = this.pluralResolver.getSuffixes(language, options);
                  if (needsZeroSuffixLookup && options[`defaultValue${this.options.pluralSeparator}zero`] && suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0) {
                    suffixes.push(`${this.options.pluralSeparator}zero`);
                  }
                  suffixes.forEach((suffix) => {
                    send([language], key + suffix, options[`defaultValue${suffix}`] || defaultValue);
                  });
                });
              } else {
                send(lngs, key, defaultValue);
              }
            }
          }
          res = this.extendTranslation(res, keys, options, resolved, lastKey);
          if (usedKey && res === key && this.options.appendNamespaceToMissingKey)
            res = `${namespace}:${key}`;
          if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
            if (this.options.compatibilityAPI !== "v1") {
              res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}:${key}` : key, usedDefault ? res : void 0);
            } else {
              res = this.options.parseMissingKeyHandler(res);
            }
          }
        }
        if (returnDetails) {
          resolved.res = res;
          resolved.usedParams = this.getUsedParamsDetails(options);
          return resolved;
        }
        return res;
      }
      extendTranslation(res, key, options, resolved, lastKey) {
        var _this = this;
        if (this.i18nFormat && this.i18nFormat.parse) {
          res = this.i18nFormat.parse(res, {
            ...this.options.interpolation.defaultVariables,
            ...options
          }, options.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
            resolved
          });
        } else if (!options.skipInterpolation) {
          if (options.interpolation)
            this.interpolator.init({
              ...options,
              ...{
                interpolation: {
                  ...this.options.interpolation,
                  ...options.interpolation
                }
              }
            });
          const skipOnVariables = isString(res) && (options && options.interpolation && options.interpolation.skipOnVariables !== void 0 ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
          let nestBef;
          if (skipOnVariables) {
            const nb = res.match(this.interpolator.nestingRegexp);
            nestBef = nb && nb.length;
          }
          let data = options.replace && !isString(options.replace) ? options.replace : options;
          if (this.options.interpolation.defaultVariables)
            data = {
              ...this.options.interpolation.defaultVariables,
              ...data
            };
          res = this.interpolator.interpolate(res, data, options.lng || this.language || resolved.usedLng, options);
          if (skipOnVariables) {
            const na = res.match(this.interpolator.nestingRegexp);
            const nestAft = na && na.length;
            if (nestBef < nestAft)
              options.nest = false;
          }
          if (!options.lng && this.options.compatibilityAPI !== "v1" && resolved && resolved.res)
            options.lng = this.language || resolved.usedLng;
          if (options.nest !== false)
            res = this.interpolator.nest(res, function() {
              for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
              }
              if (lastKey && lastKey[0] === args[0] && !options.context) {
                _this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
                return null;
              }
              return _this.translate(...args, key);
            }, options);
          if (options.interpolation)
            this.interpolator.reset();
        }
        const postProcess = options.postProcess || this.options.postProcess;
        const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;
        if (res !== void 0 && res !== null && postProcessorNames && postProcessorNames.length && options.applyPostProcessor !== false) {
          res = postProcessor.handle(postProcessorNames, res, key, this.options && this.options.postProcessPassResolved ? {
            i18nResolved: {
              ...resolved,
              usedParams: this.getUsedParamsDetails(options)
            },
            ...options
          } : options, this);
        }
        return res;
      }
      resolve(keys) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        let found;
        let usedKey;
        let exactUsedKey;
        let usedLng;
        let usedNS;
        if (isString(keys))
          keys = [keys];
        keys.forEach((k) => {
          if (this.isValidLookup(found))
            return;
          const extracted = this.extractFromKey(k, options);
          const key = extracted.key;
          usedKey = key;
          let namespaces = extracted.namespaces;
          if (this.options.fallbackNS)
            namespaces = namespaces.concat(this.options.fallbackNS);
          const needsPluralHandling = options.count !== void 0 && !isString(options.count);
          const needsZeroSuffixLookup = needsPluralHandling && !options.ordinal && options.count === 0 && this.pluralResolver.shouldUseIntlApi();
          const needsContextHandling = options.context !== void 0 && (isString(options.context) || typeof options.context === "number") && options.context !== "";
          const codes = options.lngs ? options.lngs : this.languageUtils.toResolveHierarchy(options.lng || this.language, options.fallbackLng);
          namespaces.forEach((ns) => {
            if (this.isValidLookup(found))
              return;
            usedNS = ns;
            if (!checkedLoadedFor[`${codes[0]}-${ns}`] && this.utils && this.utils.hasLoadedNamespace && !this.utils.hasLoadedNamespace(usedNS)) {
              checkedLoadedFor[`${codes[0]}-${ns}`] = true;
              this.logger.warn(`key "${usedKey}" for languages "${codes.join(", ")}" won't get resolved as namespace "${usedNS}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
            }
            codes.forEach((code) => {
              if (this.isValidLookup(found))
                return;
              usedLng = code;
              const finalKeys = [key];
              if (this.i18nFormat && this.i18nFormat.addLookupKeys) {
                this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, options);
              } else {
                let pluralSuffix;
                if (needsPluralHandling)
                  pluralSuffix = this.pluralResolver.getSuffix(code, options.count, options);
                const zeroSuffix = `${this.options.pluralSeparator}zero`;
                const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
                if (needsPluralHandling) {
                  finalKeys.push(key + pluralSuffix);
                  if (options.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                    finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                  }
                  if (needsZeroSuffixLookup) {
                    finalKeys.push(key + zeroSuffix);
                  }
                }
                if (needsContextHandling) {
                  const contextKey = `${key}${this.options.contextSeparator}${options.context}`;
                  finalKeys.push(contextKey);
                  if (needsPluralHandling) {
                    finalKeys.push(contextKey + pluralSuffix);
                    if (options.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                      finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                    }
                    if (needsZeroSuffixLookup) {
                      finalKeys.push(contextKey + zeroSuffix);
                    }
                  }
                }
              }
              let possibleKey;
              while (possibleKey = finalKeys.pop()) {
                if (!this.isValidLookup(found)) {
                  exactUsedKey = possibleKey;
                  found = this.getResource(code, ns, possibleKey, options);
                }
              }
            });
          });
        });
        return {
          res: found,
          usedKey,
          exactUsedKey,
          usedLng,
          usedNS
        };
      }
      isValidLookup(res) {
        return res !== void 0 && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === "");
      }
      getResource(code, ns, key) {
        let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
        if (this.i18nFormat && this.i18nFormat.getResource)
          return this.i18nFormat.getResource(code, ns, key, options);
        return this.resourceStore.getResource(code, ns, key, options);
      }
      getUsedParamsDetails() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        const optionsKeys = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"];
        const useOptionsReplaceForData = options.replace && !isString(options.replace);
        let data = useOptionsReplaceForData ? options.replace : options;
        if (useOptionsReplaceForData && typeof options.count !== "undefined") {
          data.count = options.count;
        }
        if (this.options.interpolation.defaultVariables) {
          data = {
            ...this.options.interpolation.defaultVariables,
            ...data
          };
        }
        if (!useOptionsReplaceForData) {
          data = {
            ...data
          };
          for (const key of optionsKeys) {
            delete data[key];
          }
        }
        return data;
      }
      static hasDefaultValue(options) {
        const prefix = "defaultValue";
        for (const option in options) {
          if (Object.prototype.hasOwnProperty.call(options, option) && prefix === option.substring(0, prefix.length) && void 0 !== options[option]) {
            return true;
          }
        }
        return false;
      }
    };
    var capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
    var LanguageUtil = class {
      constructor(options) {
        this.options = options;
        this.supportedLngs = this.options.supportedLngs || false;
        this.logger = baseLogger.create("languageUtils");
      }
      getScriptPartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf("-") < 0)
          return null;
        const p = code.split("-");
        if (p.length === 2)
          return null;
        p.pop();
        if (p[p.length - 1].toLowerCase() === "x")
          return null;
        return this.formatLanguageCode(p.join("-"));
      }
      getLanguagePartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf("-") < 0)
          return code;
        const p = code.split("-");
        return this.formatLanguageCode(p[0]);
      }
      formatLanguageCode(code) {
        if (isString(code) && code.indexOf("-") > -1) {
          if (typeof Intl !== "undefined" && typeof Intl.getCanonicalLocales !== "undefined") {
            try {
              let formattedCode = Intl.getCanonicalLocales(code)[0];
              if (formattedCode && this.options.lowerCaseLng) {
                formattedCode = formattedCode.toLowerCase();
              }
              if (formattedCode)
                return formattedCode;
            } catch (e) {
            }
          }
          const specialCases = ["hans", "hant", "latn", "cyrl", "cans", "mong", "arab"];
          let p = code.split("-");
          if (this.options.lowerCaseLng) {
            p = p.map((part) => part.toLowerCase());
          } else if (p.length === 2) {
            p[0] = p[0].toLowerCase();
            p[1] = p[1].toUpperCase();
            if (specialCases.indexOf(p[1].toLowerCase()) > -1)
              p[1] = capitalize(p[1].toLowerCase());
          } else if (p.length === 3) {
            p[0] = p[0].toLowerCase();
            if (p[1].length === 2)
              p[1] = p[1].toUpperCase();
            if (p[0] !== "sgn" && p[2].length === 2)
              p[2] = p[2].toUpperCase();
            if (specialCases.indexOf(p[1].toLowerCase()) > -1)
              p[1] = capitalize(p[1].toLowerCase());
            if (specialCases.indexOf(p[2].toLowerCase()) > -1)
              p[2] = capitalize(p[2].toLowerCase());
          }
          return p.join("-");
        }
        return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
      }
      isSupportedCode(code) {
        if (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) {
          code = this.getLanguagePartFromCode(code);
        }
        return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(code) > -1;
      }
      getBestMatchFromCodes(codes) {
        if (!codes)
          return null;
        let found;
        codes.forEach((code) => {
          if (found)
            return;
          const cleanedLng = this.formatLanguageCode(code);
          if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng))
            found = cleanedLng;
        });
        if (!found && this.options.supportedLngs) {
          codes.forEach((code) => {
            if (found)
              return;
            const lngOnly = this.getLanguagePartFromCode(code);
            if (this.isSupportedCode(lngOnly))
              return found = lngOnly;
            found = this.options.supportedLngs.find((supportedLng) => {
              if (supportedLng === lngOnly)
                return supportedLng;
              if (supportedLng.indexOf("-") < 0 && lngOnly.indexOf("-") < 0)
                return;
              if (supportedLng.indexOf("-") > 0 && lngOnly.indexOf("-") < 0 && supportedLng.substring(0, supportedLng.indexOf("-")) === lngOnly)
                return supportedLng;
              if (supportedLng.indexOf(lngOnly) === 0 && lngOnly.length > 1)
                return supportedLng;
            });
          });
        }
        if (!found)
          found = this.getFallbackCodes(this.options.fallbackLng)[0];
        return found;
      }
      getFallbackCodes(fallbacks, code) {
        if (!fallbacks)
          return [];
        if (typeof fallbacks === "function")
          fallbacks = fallbacks(code);
        if (isString(fallbacks))
          fallbacks = [fallbacks];
        if (Array.isArray(fallbacks))
          return fallbacks;
        if (!code)
          return fallbacks.default || [];
        let found = fallbacks[code];
        if (!found)
          found = fallbacks[this.getScriptPartFromCode(code)];
        if (!found)
          found = fallbacks[this.formatLanguageCode(code)];
        if (!found)
          found = fallbacks[this.getLanguagePartFromCode(code)];
        if (!found)
          found = fallbacks.default;
        return found || [];
      }
      toResolveHierarchy(code, fallbackCode) {
        const fallbackCodes = this.getFallbackCodes(fallbackCode || this.options.fallbackLng || [], code);
        const codes = [];
        const addCode = (c) => {
          if (!c)
            return;
          if (this.isSupportedCode(c)) {
            codes.push(c);
          } else {
            this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
          }
        };
        if (isString(code) && (code.indexOf("-") > -1 || code.indexOf("_") > -1)) {
          if (this.options.load !== "languageOnly")
            addCode(this.formatLanguageCode(code));
          if (this.options.load !== "languageOnly" && this.options.load !== "currentOnly")
            addCode(this.getScriptPartFromCode(code));
          if (this.options.load !== "currentOnly")
            addCode(this.getLanguagePartFromCode(code));
        } else if (isString(code)) {
          addCode(this.formatLanguageCode(code));
        }
        fallbackCodes.forEach((fc) => {
          if (codes.indexOf(fc) < 0)
            addCode(this.formatLanguageCode(fc));
        });
        return codes;
      }
    };
    var sets = [{
      lngs: ["ach", "ak", "am", "arn", "br", "fil", "gun", "ln", "mfe", "mg", "mi", "oc", "pt", "pt-BR", "tg", "tl", "ti", "tr", "uz", "wa"],
      nr: [1, 2],
      fc: 1
    }, {
      lngs: ["af", "an", "ast", "az", "bg", "bn", "ca", "da", "de", "dev", "el", "en", "eo", "es", "et", "eu", "fi", "fo", "fur", "fy", "gl", "gu", "ha", "hi", "hu", "hy", "ia", "it", "kk", "kn", "ku", "lb", "mai", "ml", "mn", "mr", "nah", "nap", "nb", "ne", "nl", "nn", "no", "nso", "pa", "pap", "pms", "ps", "pt-PT", "rm", "sco", "se", "si", "so", "son", "sq", "sv", "sw", "ta", "te", "tk", "ur", "yo"],
      nr: [1, 2],
      fc: 2
    }, {
      lngs: ["ay", "bo", "cgg", "fa", "ht", "id", "ja", "jbo", "ka", "km", "ko", "ky", "lo", "ms", "sah", "su", "th", "tt", "ug", "vi", "wo", "zh"],
      nr: [1],
      fc: 3
    }, {
      lngs: ["be", "bs", "cnr", "dz", "hr", "ru", "sr", "uk"],
      nr: [1, 2, 5],
      fc: 4
    }, {
      lngs: ["ar"],
      nr: [0, 1, 2, 3, 11, 100],
      fc: 5
    }, {
      lngs: ["cs", "sk"],
      nr: [1, 2, 5],
      fc: 6
    }, {
      lngs: ["csb", "pl"],
      nr: [1, 2, 5],
      fc: 7
    }, {
      lngs: ["cy"],
      nr: [1, 2, 3, 8],
      fc: 8
    }, {
      lngs: ["fr"],
      nr: [1, 2],
      fc: 9
    }, {
      lngs: ["ga"],
      nr: [1, 2, 3, 7, 11],
      fc: 10
    }, {
      lngs: ["gd"],
      nr: [1, 2, 3, 20],
      fc: 11
    }, {
      lngs: ["is"],
      nr: [1, 2],
      fc: 12
    }, {
      lngs: ["jv"],
      nr: [0, 1],
      fc: 13
    }, {
      lngs: ["kw"],
      nr: [1, 2, 3, 4],
      fc: 14
    }, {
      lngs: ["lt"],
      nr: [1, 2, 10],
      fc: 15
    }, {
      lngs: ["lv"],
      nr: [1, 2, 0],
      fc: 16
    }, {
      lngs: ["mk"],
      nr: [1, 2],
      fc: 17
    }, {
      lngs: ["mnk"],
      nr: [0, 1, 2],
      fc: 18
    }, {
      lngs: ["mt"],
      nr: [1, 2, 11, 20],
      fc: 19
    }, {
      lngs: ["or"],
      nr: [2, 1],
      fc: 2
    }, {
      lngs: ["ro"],
      nr: [1, 2, 20],
      fc: 20
    }, {
      lngs: ["sl"],
      nr: [5, 1, 2, 3],
      fc: 21
    }, {
      lngs: ["he", "iw"],
      nr: [1, 2, 20, 21],
      fc: 22
    }];
    var _rulesPluralsTypes = {
      1: (n) => Number(n > 1),
      2: (n) => Number(n != 1),
      3: (n) => 0,
      4: (n) => Number(n % 10 == 1 && n % 100 != 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2),
      5: (n) => Number(n == 0 ? 0 : n == 1 ? 1 : n == 2 ? 2 : n % 100 >= 3 && n % 100 <= 10 ? 3 : n % 100 >= 11 ? 4 : 5),
      6: (n) => Number(n == 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2),
      7: (n) => Number(n == 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2),
      8: (n) => Number(n == 1 ? 0 : n == 2 ? 1 : n != 8 && n != 11 ? 2 : 3),
      9: (n) => Number(n >= 2),
      10: (n) => Number(n == 1 ? 0 : n == 2 ? 1 : n < 7 ? 2 : n < 11 ? 3 : 4),
      11: (n) => Number(n == 1 || n == 11 ? 0 : n == 2 || n == 12 ? 1 : n > 2 && n < 20 ? 2 : 3),
      12: (n) => Number(n % 10 != 1 || n % 100 == 11),
      13: (n) => Number(n !== 0),
      14: (n) => Number(n == 1 ? 0 : n == 2 ? 1 : n == 3 ? 2 : 3),
      15: (n) => Number(n % 10 == 1 && n % 100 != 11 ? 0 : n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2),
      16: (n) => Number(n % 10 == 1 && n % 100 != 11 ? 0 : n !== 0 ? 1 : 2),
      17: (n) => Number(n == 1 || n % 10 == 1 && n % 100 != 11 ? 0 : 1),
      18: (n) => Number(n == 0 ? 0 : n == 1 ? 1 : 2),
      19: (n) => Number(n == 1 ? 0 : n == 0 || n % 100 > 1 && n % 100 < 11 ? 1 : n % 100 > 10 && n % 100 < 20 ? 2 : 3),
      20: (n) => Number(n == 1 ? 0 : n == 0 || n % 100 > 0 && n % 100 < 20 ? 1 : 2),
      21: (n) => Number(n % 100 == 1 ? 1 : n % 100 == 2 ? 2 : n % 100 == 3 || n % 100 == 4 ? 3 : 0),
      22: (n) => Number(n == 1 ? 0 : n == 2 ? 1 : (n < 0 || n > 10) && n % 10 == 0 ? 2 : 3)
    };
    var nonIntlVersions = ["v1", "v2", "v3"];
    var intlVersions = ["v4"];
    var suffixesOrder = {
      zero: 0,
      one: 1,
      two: 2,
      few: 3,
      many: 4,
      other: 5
    };
    var createRules = () => {
      const rules = {};
      sets.forEach((set) => {
        set.lngs.forEach((l) => {
          rules[l] = {
            numbers: set.nr,
            plurals: _rulesPluralsTypes[set.fc]
          };
        });
      });
      return rules;
    };
    var PluralResolver = class {
      constructor(languageUtils) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        this.languageUtils = languageUtils;
        this.options = options;
        this.logger = baseLogger.create("pluralResolver");
        if ((!this.options.compatibilityJSON || intlVersions.includes(this.options.compatibilityJSON)) && (typeof Intl === "undefined" || !Intl.PluralRules)) {
          this.options.compatibilityJSON = "v3";
          this.logger.error("Your environment seems not to be Intl API compatible, use an Intl.PluralRules polyfill. Will fallback to the compatibilityJSON v3 format handling.");
        }
        this.rules = createRules();
        this.pluralRulesCache = {};
      }
      addRule(lng, obj) {
        this.rules[lng] = obj;
      }
      clearCache() {
        this.pluralRulesCache = {};
      }
      getRule(code) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        if (this.shouldUseIntlApi()) {
          const cleanedCode = getCleanedCode(code === "dev" ? "en" : code);
          const type = options.ordinal ? "ordinal" : "cardinal";
          const cacheKey = JSON.stringify({
            cleanedCode,
            type
          });
          if (cacheKey in this.pluralRulesCache) {
            return this.pluralRulesCache[cacheKey];
          }
          let rule;
          try {
            rule = new Intl.PluralRules(cleanedCode, {
              type
            });
          } catch (err) {
            if (!code.match(/-|_/))
              return;
            const lngPart = this.languageUtils.getLanguagePartFromCode(code);
            rule = this.getRule(lngPart, options);
          }
          this.pluralRulesCache[cacheKey] = rule;
          return rule;
        }
        return this.rules[code] || this.rules[this.languageUtils.getLanguagePartFromCode(code)];
      }
      needsPlural(code) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const rule = this.getRule(code, options);
        if (this.shouldUseIntlApi()) {
          return rule && rule.resolvedOptions().pluralCategories.length > 1;
        }
        return rule && rule.numbers.length > 1;
      }
      getPluralFormsOfKey(code, key) {
        let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
      }
      getSuffixes(code) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const rule = this.getRule(code, options);
        if (!rule) {
          return [];
        }
        if (this.shouldUseIntlApi()) {
          return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory) => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${pluralCategory}`);
        }
        return rule.numbers.map((number) => this.getSuffix(code, number, options));
      }
      getSuffix(code, count) {
        let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        const rule = this.getRule(code, options);
        if (rule) {
          if (this.shouldUseIntlApi()) {
            return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${rule.select(count)}`;
          }
          return this.getSuffixRetroCompatible(rule, count);
        }
        this.logger.warn(`no plural rule found for: ${code}`);
        return "";
      }
      getSuffixRetroCompatible(rule, count) {
        const idx = rule.noAbs ? rule.plurals(count) : rule.plurals(Math.abs(count));
        let suffix = rule.numbers[idx];
        if (this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) {
          if (suffix === 2) {
            suffix = "plural";
          } else if (suffix === 1) {
            suffix = "";
          }
        }
        const returnSuffix = () => this.options.prepend && suffix.toString() ? this.options.prepend + suffix.toString() : suffix.toString();
        if (this.options.compatibilityJSON === "v1") {
          if (suffix === 1)
            return "";
          if (typeof suffix === "number")
            return `_plural_${suffix.toString()}`;
          return returnSuffix();
        } else if (this.options.compatibilityJSON === "v2") {
          return returnSuffix();
        } else if (this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) {
          return returnSuffix();
        }
        return this.options.prepend && idx.toString() ? this.options.prepend + idx.toString() : idx.toString();
      }
      shouldUseIntlApi() {
        return !nonIntlVersions.includes(this.options.compatibilityJSON);
      }
    };
    var deepFindWithDefaults = function(data, defaultData, key) {
      let keySeparator = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : ".";
      let ignoreJSONStructure = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : true;
      let path = getPathWithDefaults(data, defaultData, key);
      if (!path && ignoreJSONStructure && isString(key)) {
        path = deepFind(data, key, keySeparator);
        if (path === void 0)
          path = deepFind(defaultData, key, keySeparator);
      }
      return path;
    };
    var regexSafe = (val) => val.replace(/\$/g, "$$$$");
    var Interpolator = class {
      constructor() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        this.logger = baseLogger.create("interpolator");
        this.options = options;
        this.format = options.interpolation && options.interpolation.format || ((value) => value);
        this.init(options);
      }
      init() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        if (!options.interpolation)
          options.interpolation = {
            escapeValue: true
          };
        const {
          escape: escape$1,
          escapeValue,
          useRawValueToEscape,
          prefix,
          prefixEscaped,
          suffix,
          suffixEscaped,
          formatSeparator,
          unescapeSuffix,
          unescapePrefix,
          nestingPrefix,
          nestingPrefixEscaped,
          nestingSuffix,
          nestingSuffixEscaped,
          nestingOptionsSeparator,
          maxReplaces,
          alwaysFormat
        } = options.interpolation;
        this.escape = escape$1 !== void 0 ? escape$1 : escape;
        this.escapeValue = escapeValue !== void 0 ? escapeValue : true;
        this.useRawValueToEscape = useRawValueToEscape !== void 0 ? useRawValueToEscape : false;
        this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || "{{";
        this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || "}}";
        this.formatSeparator = formatSeparator || ",";
        this.unescapePrefix = unescapeSuffix ? "" : unescapePrefix || "-";
        this.unescapeSuffix = this.unescapePrefix ? "" : unescapeSuffix || "";
        this.nestingPrefix = nestingPrefix ? regexEscape(nestingPrefix) : nestingPrefixEscaped || regexEscape("$t(");
        this.nestingSuffix = nestingSuffix ? regexEscape(nestingSuffix) : nestingSuffixEscaped || regexEscape(")");
        this.nestingOptionsSeparator = nestingOptionsSeparator || ",";
        this.maxReplaces = maxReplaces || 1e3;
        this.alwaysFormat = alwaysFormat !== void 0 ? alwaysFormat : false;
        this.resetRegExp();
      }
      reset() {
        if (this.options)
          this.init(this.options);
      }
      resetRegExp() {
        const getOrResetRegExp = (existingRegExp, pattern) => {
          if (existingRegExp && existingRegExp.source === pattern) {
            existingRegExp.lastIndex = 0;
            return existingRegExp;
          }
          return new RegExp(pattern, "g");
        };
        this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
        this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
        this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}(.+?)${this.nestingSuffix}`);
      }
      interpolate(str, data, lng, options) {
        let match;
        let value;
        let replaces;
        const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
        const handleFormat = (key) => {
          if (key.indexOf(this.formatSeparator) < 0) {
            const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
            return this.alwaysFormat ? this.format(path, void 0, lng, {
              ...options,
              ...data,
              interpolationkey: key
            }) : path;
          }
          const p = key.split(this.formatSeparator);
          const k = p.shift().trim();
          const f = p.join(this.formatSeparator).trim();
          return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
            ...options,
            ...data,
            interpolationkey: k
          });
        };
        this.resetRegExp();
        const missingInterpolationHandler = options && options.missingInterpolationHandler || this.options.missingInterpolationHandler;
        const skipOnVariables = options && options.interpolation && options.interpolation.skipOnVariables !== void 0 ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
        const todos = [{
          regex: this.regexpUnescape,
          safeValue: (val) => regexSafe(val)
        }, {
          regex: this.regexp,
          safeValue: (val) => this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)
        }];
        todos.forEach((todo) => {
          replaces = 0;
          while (match = todo.regex.exec(str)) {
            const matchedVar = match[1].trim();
            value = handleFormat(matchedVar);
            if (value === void 0) {
              if (typeof missingInterpolationHandler === "function") {
                const temp = missingInterpolationHandler(str, match, options);
                value = isString(temp) ? temp : "";
              } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
                value = "";
              } else if (skipOnVariables) {
                value = match[0];
                continue;
              } else {
                this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
                value = "";
              }
            } else if (!isString(value) && !this.useRawValueToEscape) {
              value = makeString(value);
            }
            const safeValue = todo.safeValue(value);
            str = str.replace(match[0], safeValue);
            if (skipOnVariables) {
              todo.regex.lastIndex += value.length;
              todo.regex.lastIndex -= match[0].length;
            } else {
              todo.regex.lastIndex = 0;
            }
            replaces++;
            if (replaces >= this.maxReplaces) {
              break;
            }
          }
        });
        return str;
      }
      nest(str, fc) {
        let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        let match;
        let value;
        let clonedOptions;
        const handleHasOptions = (key, inheritedOptions) => {
          const sep = this.nestingOptionsSeparator;
          if (key.indexOf(sep) < 0)
            return key;
          const c = key.split(new RegExp(`${sep}[ ]*{`));
          let optionsString = `{${c[1]}`;
          key = c[0];
          optionsString = this.interpolate(optionsString, clonedOptions);
          const matchedSingleQuotes = optionsString.match(/'/g);
          const matchedDoubleQuotes = optionsString.match(/"/g);
          if (matchedSingleQuotes && matchedSingleQuotes.length % 2 === 0 && !matchedDoubleQuotes || matchedDoubleQuotes.length % 2 !== 0) {
            optionsString = optionsString.replace(/'/g, '"');
          }
          try {
            clonedOptions = JSON.parse(optionsString);
            if (inheritedOptions)
              clonedOptions = {
                ...inheritedOptions,
                ...clonedOptions
              };
          } catch (e) {
            this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
            return `${key}${sep}${optionsString}`;
          }
          if (clonedOptions.defaultValue && clonedOptions.defaultValue.indexOf(this.prefix) > -1)
            delete clonedOptions.defaultValue;
          return key;
        };
        while (match = this.nestingRegexp.exec(str)) {
          let formatters = [];
          clonedOptions = {
            ...options
          };
          clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
          clonedOptions.applyPostProcessor = false;
          delete clonedOptions.defaultValue;
          let doReduce = false;
          if (match[0].indexOf(this.formatSeparator) !== -1 && !/{.*}/.test(match[1])) {
            const r = match[1].split(this.formatSeparator).map((elem) => elem.trim());
            match[1] = r.shift();
            formatters = r;
            doReduce = true;
          }
          value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
          if (value && match[0] === str && !isString(value))
            return value;
          if (!isString(value))
            value = makeString(value);
          if (!value) {
            this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
            value = "";
          }
          if (doReduce) {
            value = formatters.reduce((v, f) => this.format(v, f, options.lng, {
              ...options,
              interpolationkey: match[1].trim()
            }), value.trim());
          }
          str = str.replace(match[0], value);
          this.regexp.lastIndex = 0;
        }
        return str;
      }
    };
    var parseFormatStr = (formatStr) => {
      let formatName = formatStr.toLowerCase().trim();
      const formatOptions = {};
      if (formatStr.indexOf("(") > -1) {
        const p = formatStr.split("(");
        formatName = p[0].toLowerCase().trim();
        const optStr = p[1].substring(0, p[1].length - 1);
        if (formatName === "currency" && optStr.indexOf(":") < 0) {
          if (!formatOptions.currency)
            formatOptions.currency = optStr.trim();
        } else if (formatName === "relativetime" && optStr.indexOf(":") < 0) {
          if (!formatOptions.range)
            formatOptions.range = optStr.trim();
        } else {
          const opts = optStr.split(";");
          opts.forEach((opt) => {
            if (opt) {
              const [key, ...rest] = opt.split(":");
              const val = rest.join(":").trim().replace(/^'+|'+$/g, "");
              const trimmedKey = key.trim();
              if (!formatOptions[trimmedKey])
                formatOptions[trimmedKey] = val;
              if (val === "false")
                formatOptions[trimmedKey] = false;
              if (val === "true")
                formatOptions[trimmedKey] = true;
              if (!isNaN(val))
                formatOptions[trimmedKey] = parseInt(val, 10);
            }
          });
        }
      }
      return {
        formatName,
        formatOptions
      };
    };
    var createCachedFormatter = (fn) => {
      const cache = {};
      return (val, lng, options) => {
        let optForCache = options;
        if (options && options.interpolationkey && options.formatParams && options.formatParams[options.interpolationkey] && options[options.interpolationkey]) {
          optForCache = {
            ...optForCache,
            [options.interpolationkey]: void 0
          };
        }
        const key = lng + JSON.stringify(optForCache);
        let formatter = cache[key];
        if (!formatter) {
          formatter = fn(getCleanedCode(lng), options);
          cache[key] = formatter;
        }
        return formatter(val);
      };
    };
    var Formatter = class {
      constructor() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        this.logger = baseLogger.create("formatter");
        this.options = options;
        this.formats = {
          number: createCachedFormatter((lng, opt) => {
            const formatter = new Intl.NumberFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          }),
          currency: createCachedFormatter((lng, opt) => {
            const formatter = new Intl.NumberFormat(lng, {
              ...opt,
              style: "currency"
            });
            return (val) => formatter.format(val);
          }),
          datetime: createCachedFormatter((lng, opt) => {
            const formatter = new Intl.DateTimeFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          }),
          relativetime: createCachedFormatter((lng, opt) => {
            const formatter = new Intl.RelativeTimeFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val, opt.range || "day");
          }),
          list: createCachedFormatter((lng, opt) => {
            const formatter = new Intl.ListFormat(lng, {
              ...opt
            });
            return (val) => formatter.format(val);
          })
        };
        this.init(options);
      }
      init(services) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
          interpolation: {}
        };
        this.formatSeparator = options.interpolation.formatSeparator || ",";
      }
      add(name, fc) {
        this.formats[name.toLowerCase().trim()] = fc;
      }
      addCached(name, fc) {
        this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
      }
      format(value, format, lng) {
        let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
        const formats = format.split(this.formatSeparator);
        if (formats.length > 1 && formats[0].indexOf("(") > 1 && formats[0].indexOf(")") < 0 && formats.find((f) => f.indexOf(")") > -1)) {
          const lastIndex = formats.findIndex((f) => f.indexOf(")") > -1);
          formats[0] = [formats[0], ...formats.splice(1, lastIndex)].join(this.formatSeparator);
        }
        const result = formats.reduce((mem, f) => {
          const {
            formatName,
            formatOptions
          } = parseFormatStr(f);
          if (this.formats[formatName]) {
            let formatted = mem;
            try {
              const valOptions = options && options.formatParams && options.formatParams[options.interpolationkey] || {};
              const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;
              formatted = this.formats[formatName](mem, l, {
                ...formatOptions,
                ...options,
                ...valOptions
              });
            } catch (error) {
              this.logger.warn(error);
            }
            return formatted;
          } else {
            this.logger.warn(`there was no format function for ${formatName}`);
          }
          return mem;
        }, value);
        return result;
      }
    };
    var removePending = (q, name) => {
      if (q.pending[name] !== void 0) {
        delete q.pending[name];
        q.pendingCount--;
      }
    };
    var Connector = class extends EventEmitter {
      constructor(backend, store, services) {
        let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
        super();
        this.backend = backend;
        this.store = store;
        this.services = services;
        this.languageUtils = services.languageUtils;
        this.options = options;
        this.logger = baseLogger.create("backendConnector");
        this.waitingReads = [];
        this.maxParallelReads = options.maxParallelReads || 10;
        this.readingCalls = 0;
        this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
        this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;
        this.state = {};
        this.queue = [];
        if (this.backend && this.backend.init) {
          this.backend.init(services, options.backend, options);
        }
      }
      queueLoad(languages, namespaces, options, callback) {
        const toLoad = {};
        const pending = {};
        const toLoadLanguages = {};
        const toLoadNamespaces = {};
        languages.forEach((lng) => {
          let hasAllNamespaces = true;
          namespaces.forEach((ns) => {
            const name = `${lng}|${ns}`;
            if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
              this.state[name] = 2;
            } else if (this.state[name] < 0)
              ;
            else if (this.state[name] === 1) {
              if (pending[name] === void 0)
                pending[name] = true;
            } else {
              this.state[name] = 1;
              hasAllNamespaces = false;
              if (pending[name] === void 0)
                pending[name] = true;
              if (toLoad[name] === void 0)
                toLoad[name] = true;
              if (toLoadNamespaces[ns] === void 0)
                toLoadNamespaces[ns] = true;
            }
          });
          if (!hasAllNamespaces)
            toLoadLanguages[lng] = true;
        });
        if (Object.keys(toLoad).length || Object.keys(pending).length) {
          this.queue.push({
            pending,
            pendingCount: Object.keys(pending).length,
            loaded: {},
            errors: [],
            callback
          });
        }
        return {
          toLoad: Object.keys(toLoad),
          pending: Object.keys(pending),
          toLoadLanguages: Object.keys(toLoadLanguages),
          toLoadNamespaces: Object.keys(toLoadNamespaces)
        };
      }
      loaded(name, err, data) {
        const s = name.split("|");
        const lng = s[0];
        const ns = s[1];
        if (err)
          this.emit("failedLoading", lng, ns, err);
        if (!err && data) {
          this.store.addResourceBundle(lng, ns, data, void 0, void 0, {
            skipCopy: true
          });
        }
        this.state[name] = err ? -1 : 2;
        if (err && data)
          this.state[name] = 0;
        const loaded = {};
        this.queue.forEach((q) => {
          pushPath(q.loaded, [lng], ns);
          removePending(q, name);
          if (err)
            q.errors.push(err);
          if (q.pendingCount === 0 && !q.done) {
            Object.keys(q.loaded).forEach((l) => {
              if (!loaded[l])
                loaded[l] = {};
              const loadedKeys = q.loaded[l];
              if (loadedKeys.length) {
                loadedKeys.forEach((n) => {
                  if (loaded[l][n] === void 0)
                    loaded[l][n] = true;
                });
              }
            });
            q.done = true;
            if (q.errors.length) {
              q.callback(q.errors);
            } else {
              q.callback();
            }
          }
        });
        this.emit("loaded", loaded);
        this.queue = this.queue.filter((q) => !q.done);
      }
      read(lng, ns, fcName) {
        let tried = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 0;
        let wait = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : this.retryTimeout;
        let callback = arguments.length > 5 ? arguments[5] : void 0;
        if (!lng.length)
          return callback(null, {});
        if (this.readingCalls >= this.maxParallelReads) {
          this.waitingReads.push({
            lng,
            ns,
            fcName,
            tried,
            wait,
            callback
          });
          return;
        }
        this.readingCalls++;
        const resolver = (err, data) => {
          this.readingCalls--;
          if (this.waitingReads.length > 0) {
            const next = this.waitingReads.shift();
            this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
          }
          if (err && data && tried < this.maxRetries) {
            setTimeout(() => {
              this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
            }, wait);
            return;
          }
          callback(err, data);
        };
        const fc = this.backend[fcName].bind(this.backend);
        if (fc.length === 2) {
          try {
            const r = fc(lng, ns);
            if (r && typeof r.then === "function") {
              r.then((data) => resolver(null, data)).catch(resolver);
            } else {
              resolver(null, r);
            }
          } catch (err) {
            resolver(err);
          }
          return;
        }
        return fc(lng, ns, resolver);
      }
      prepareLoading(languages, namespaces) {
        let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        let callback = arguments.length > 3 ? arguments[3] : void 0;
        if (!this.backend) {
          this.logger.warn("No backend was added via i18next.use. Will not load resources.");
          return callback && callback();
        }
        if (isString(languages))
          languages = this.languageUtils.toResolveHierarchy(languages);
        if (isString(namespaces))
          namespaces = [namespaces];
        const toLoad = this.queueLoad(languages, namespaces, options, callback);
        if (!toLoad.toLoad.length) {
          if (!toLoad.pending.length)
            callback();
          return null;
        }
        toLoad.toLoad.forEach((name) => {
          this.loadOne(name);
        });
      }
      load(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {}, callback);
      }
      reload(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {
          reload: true
        }, callback);
      }
      loadOne(name) {
        let prefix = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
        const s = name.split("|");
        const lng = s[0];
        const ns = s[1];
        this.read(lng, ns, "read", void 0, void 0, (err, data) => {
          if (err)
            this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
          if (!err && data)
            this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
          this.loaded(name, err, data);
        });
      }
      saveMissing(languages, namespace, key, fallbackValue, isUpdate) {
        let options = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : {};
        let clb = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : () => {
        };
        if (this.services.utils && this.services.utils.hasLoadedNamespace && !this.services.utils.hasLoadedNamespace(namespace)) {
          this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
          return;
        }
        if (key === void 0 || key === null || key === "")
          return;
        if (this.backend && this.backend.create) {
          const opts = {
            ...options,
            isUpdate
          };
          const fc = this.backend.create.bind(this.backend);
          if (fc.length < 6) {
            try {
              let r;
              if (fc.length === 5) {
                r = fc(languages, namespace, key, fallbackValue, opts);
              } else {
                r = fc(languages, namespace, key, fallbackValue);
              }
              if (r && typeof r.then === "function") {
                r.then((data) => clb(null, data)).catch(clb);
              } else {
                clb(null, r);
              }
            } catch (err) {
              clb(err);
            }
          } else {
            fc(languages, namespace, key, fallbackValue, clb, opts);
          }
        }
        if (!languages || !languages[0])
          return;
        this.store.addResource(languages[0], namespace, key, fallbackValue);
      }
    };
    var get = () => ({
      debug: false,
      initImmediate: true,
      ns: ["translation"],
      defaultNS: ["translation"],
      fallbackLng: ["dev"],
      fallbackNS: false,
      supportedLngs: false,
      nonExplicitSupportedLngs: false,
      load: "all",
      preload: false,
      simplifyPluralSuffix: true,
      keySeparator: ".",
      nsSeparator: ":",
      pluralSeparator: "_",
      contextSeparator: "_",
      partialBundledLanguages: false,
      saveMissing: false,
      updateMissing: false,
      saveMissingTo: "fallback",
      saveMissingPlurals: true,
      missingKeyHandler: false,
      missingInterpolationHandler: false,
      postProcess: false,
      postProcessPassResolved: false,
      returnNull: false,
      returnEmptyString: true,
      returnObjects: false,
      joinArrays: false,
      returnedObjectHandler: false,
      parseMissingKeyHandler: false,
      appendNamespaceToMissingKey: false,
      appendNamespaceToCIMode: false,
      overloadTranslationOptionHandler: (args) => {
        let ret = {};
        if (typeof args[1] === "object")
          ret = args[1];
        if (isString(args[1]))
          ret.defaultValue = args[1];
        if (isString(args[2]))
          ret.tDescription = args[2];
        if (typeof args[2] === "object" || typeof args[3] === "object") {
          const options = args[3] || args[2];
          Object.keys(options).forEach((key) => {
            ret[key] = options[key];
          });
        }
        return ret;
      },
      interpolation: {
        escapeValue: true,
        format: (value) => value,
        prefix: "{{",
        suffix: "}}",
        formatSeparator: ",",
        unescapePrefix: "-",
        nestingPrefix: "$t(",
        nestingSuffix: ")",
        nestingOptionsSeparator: ",",
        maxReplaces: 1e3,
        skipOnVariables: true
      }
    });
    var transformOptions = (options) => {
      if (isString(options.ns))
        options.ns = [options.ns];
      if (isString(options.fallbackLng))
        options.fallbackLng = [options.fallbackLng];
      if (isString(options.fallbackNS))
        options.fallbackNS = [options.fallbackNS];
      if (options.supportedLngs && options.supportedLngs.indexOf("cimode") < 0) {
        options.supportedLngs = options.supportedLngs.concat(["cimode"]);
      }
      return options;
    };
    var noop = () => {
    };
    var bindMemberFunctions = (inst) => {
      const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
      mems.forEach((mem) => {
        if (typeof inst[mem] === "function") {
          inst[mem] = inst[mem].bind(inst);
        }
      });
    };
    var I18n = class _I18n extends EventEmitter {
      constructor() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        let callback = arguments.length > 1 ? arguments[1] : void 0;
        super();
        this.options = transformOptions(options);
        this.services = {};
        this.logger = baseLogger;
        this.modules = {
          external: []
        };
        bindMemberFunctions(this);
        if (callback && !this.isInitialized && !options.isClone) {
          if (!this.options.initImmediate) {
            this.init(options, callback);
            return this;
          }
          setTimeout(() => {
            this.init(options, callback);
          }, 0);
        }
      }
      init() {
        var _this = this;
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        let callback = arguments.length > 1 ? arguments[1] : void 0;
        this.isInitializing = true;
        if (typeof options === "function") {
          callback = options;
          options = {};
        }
        if (!options.defaultNS && options.defaultNS !== false && options.ns) {
          if (isString(options.ns)) {
            options.defaultNS = options.ns;
          } else if (options.ns.indexOf("translation") < 0) {
            options.defaultNS = options.ns[0];
          }
        }
        const defOpts = get();
        this.options = {
          ...defOpts,
          ...this.options,
          ...transformOptions(options)
        };
        if (this.options.compatibilityAPI !== "v1") {
          this.options.interpolation = {
            ...defOpts.interpolation,
            ...this.options.interpolation
          };
        }
        if (options.keySeparator !== void 0) {
          this.options.userDefinedKeySeparator = options.keySeparator;
        }
        if (options.nsSeparator !== void 0) {
          this.options.userDefinedNsSeparator = options.nsSeparator;
        }
        const createClassOnDemand = (ClassOrObject) => {
          if (!ClassOrObject)
            return null;
          if (typeof ClassOrObject === "function")
            return new ClassOrObject();
          return ClassOrObject;
        };
        if (!this.options.isClone) {
          if (this.modules.logger) {
            baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
          } else {
            baseLogger.init(null, this.options);
          }
          let formatter;
          if (this.modules.formatter) {
            formatter = this.modules.formatter;
          } else if (typeof Intl !== "undefined") {
            formatter = Formatter;
          }
          const lu = new LanguageUtil(this.options);
          this.store = new ResourceStore(this.options.resources, this.options);
          const s = this.services;
          s.logger = baseLogger;
          s.resourceStore = this.store;
          s.languageUtils = lu;
          s.pluralResolver = new PluralResolver(lu, {
            prepend: this.options.pluralSeparator,
            compatibilityJSON: this.options.compatibilityJSON,
            simplifyPluralSuffix: this.options.simplifyPluralSuffix
          });
          if (formatter && (!this.options.interpolation.format || this.options.interpolation.format === defOpts.interpolation.format)) {
            s.formatter = createClassOnDemand(formatter);
            s.formatter.init(s, this.options);
            this.options.interpolation.format = s.formatter.format.bind(s.formatter);
          }
          s.interpolator = new Interpolator(this.options);
          s.utils = {
            hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
          };
          s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
          s.backendConnector.on("*", function(event) {
            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }
            _this.emit(event, ...args);
          });
          if (this.modules.languageDetector) {
            s.languageDetector = createClassOnDemand(this.modules.languageDetector);
            if (s.languageDetector.init)
              s.languageDetector.init(s, this.options.detection, this.options);
          }
          if (this.modules.i18nFormat) {
            s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
            if (s.i18nFormat.init)
              s.i18nFormat.init(this);
          }
          this.translator = new Translator(this.services, this.options);
          this.translator.on("*", function(event) {
            for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
              args[_key2 - 1] = arguments[_key2];
            }
            _this.emit(event, ...args);
          });
          this.modules.external.forEach((m) => {
            if (m.init)
              m.init(this);
          });
        }
        this.format = this.options.interpolation.format;
        if (!callback)
          callback = noop;
        if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
          const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          if (codes.length > 0 && codes[0] !== "dev")
            this.options.lng = codes[0];
        }
        if (!this.services.languageDetector && !this.options.lng) {
          this.logger.warn("init: no languageDetector is used and no lng is defined");
        }
        const storeApi = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
        storeApi.forEach((fcName) => {
          this[fcName] = function() {
            return _this.store[fcName](...arguments);
          };
        });
        const storeApiChained = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
        storeApiChained.forEach((fcName) => {
          this[fcName] = function() {
            _this.store[fcName](...arguments);
            return _this;
          };
        });
        const deferred = defer();
        const load = () => {
          const finish = (err, t) => {
            this.isInitializing = false;
            if (this.isInitialized && !this.initializedStoreOnce)
              this.logger.warn("init: i18next is already initialized. You should call init just once!");
            this.isInitialized = true;
            if (!this.options.isClone)
              this.logger.log("initialized", this.options);
            this.emit("initialized", this.options);
            deferred.resolve(t);
            callback(err, t);
          };
          if (this.languages && this.options.compatibilityAPI !== "v1" && !this.isInitialized)
            return finish(null, this.t.bind(this));
          this.changeLanguage(this.options.lng, finish);
        };
        if (this.options.resources || !this.options.initImmediate) {
          load();
        } else {
          setTimeout(load, 0);
        }
        return deferred;
      }
      loadResources(language) {
        let callback = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : noop;
        let usedCallback = callback;
        const usedLng = isString(language) ? language : this.language;
        if (typeof language === "function")
          usedCallback = language;
        if (!this.options.resources || this.options.partialBundledLanguages) {
          if (usedLng && usedLng.toLowerCase() === "cimode" && (!this.options.preload || this.options.preload.length === 0))
            return usedCallback();
          const toLoad = [];
          const append = (lng) => {
            if (!lng)
              return;
            if (lng === "cimode")
              return;
            const lngs = this.services.languageUtils.toResolveHierarchy(lng);
            lngs.forEach((l) => {
              if (l === "cimode")
                return;
              if (toLoad.indexOf(l) < 0)
                toLoad.push(l);
            });
          };
          if (!usedLng) {
            const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
            fallbacks.forEach((l) => append(l));
          } else {
            append(usedLng);
          }
          if (this.options.preload) {
            this.options.preload.forEach((l) => append(l));
          }
          this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
            if (!e && !this.resolvedLanguage && this.language)
              this.setResolvedLanguage(this.language);
            usedCallback(e);
          });
        } else {
          usedCallback(null);
        }
      }
      reloadResources(lngs, ns, callback) {
        const deferred = defer();
        if (typeof lngs === "function") {
          callback = lngs;
          lngs = void 0;
        }
        if (typeof ns === "function") {
          callback = ns;
          ns = void 0;
        }
        if (!lngs)
          lngs = this.languages;
        if (!ns)
          ns = this.options.ns;
        if (!callback)
          callback = noop;
        this.services.backendConnector.reload(lngs, ns, (err) => {
          deferred.resolve();
          callback(err);
        });
        return deferred;
      }
      use(module3) {
        if (!module3)
          throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
        if (!module3.type)
          throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
        if (module3.type === "backend") {
          this.modules.backend = module3;
        }
        if (module3.type === "logger" || module3.log && module3.warn && module3.error) {
          this.modules.logger = module3;
        }
        if (module3.type === "languageDetector") {
          this.modules.languageDetector = module3;
        }
        if (module3.type === "i18nFormat") {
          this.modules.i18nFormat = module3;
        }
        if (module3.type === "postProcessor") {
          postProcessor.addPostProcessor(module3);
        }
        if (module3.type === "formatter") {
          this.modules.formatter = module3;
        }
        if (module3.type === "3rdParty") {
          this.modules.external.push(module3);
        }
        return this;
      }
      setResolvedLanguage(l) {
        if (!l || !this.languages)
          return;
        if (["cimode", "dev"].indexOf(l) > -1)
          return;
        for (let li = 0; li < this.languages.length; li++) {
          const lngInLngs = this.languages[li];
          if (["cimode", "dev"].indexOf(lngInLngs) > -1)
            continue;
          if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
            this.resolvedLanguage = lngInLngs;
            break;
          }
        }
      }
      changeLanguage(lng, callback) {
        var _this2 = this;
        this.isLanguageChangingTo = lng;
        const deferred = defer();
        this.emit("languageChanging", lng);
        const setLngProps = (l) => {
          this.language = l;
          this.languages = this.services.languageUtils.toResolveHierarchy(l);
          this.resolvedLanguage = void 0;
          this.setResolvedLanguage(l);
        };
        const done = (err, l) => {
          if (l) {
            setLngProps(l);
            this.translator.changeLanguage(l);
            this.isLanguageChangingTo = void 0;
            this.emit("languageChanged", l);
            this.logger.log("languageChanged", l);
          } else {
            this.isLanguageChangingTo = void 0;
          }
          deferred.resolve(function() {
            return _this2.t(...arguments);
          });
          if (callback)
            callback(err, function() {
              return _this2.t(...arguments);
            });
        };
        const setLng = (lngs) => {
          if (!lng && !lngs && this.services.languageDetector)
            lngs = [];
          const l = isString(lngs) ? lngs : this.services.languageUtils.getBestMatchFromCodes(lngs);
          if (l) {
            if (!this.language) {
              setLngProps(l);
            }
            if (!this.translator.language)
              this.translator.changeLanguage(l);
            if (this.services.languageDetector && this.services.languageDetector.cacheUserLanguage)
              this.services.languageDetector.cacheUserLanguage(l);
          }
          this.loadResources(l, (err) => {
            done(err, l);
          });
        };
        if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
          setLng(this.services.languageDetector.detect());
        } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
          if (this.services.languageDetector.detect.length === 0) {
            this.services.languageDetector.detect().then(setLng);
          } else {
            this.services.languageDetector.detect(setLng);
          }
        } else {
          setLng(lng);
        }
        return deferred;
      }
      getFixedT(lng, ns, keyPrefix) {
        var _this3 = this;
        const fixedT = function(key, opts) {
          let options;
          if (typeof opts !== "object") {
            for (var _len3 = arguments.length, rest = new Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
              rest[_key3 - 2] = arguments[_key3];
            }
            options = _this3.options.overloadTranslationOptionHandler([key, opts].concat(rest));
          } else {
            options = {
              ...opts
            };
          }
          options.lng = options.lng || fixedT.lng;
          options.lngs = options.lngs || fixedT.lngs;
          options.ns = options.ns || fixedT.ns;
          if (options.keyPrefix !== "")
            options.keyPrefix = options.keyPrefix || keyPrefix || fixedT.keyPrefix;
          const keySeparator = _this3.options.keySeparator || ".";
          let resultKey;
          if (options.keyPrefix && Array.isArray(key)) {
            resultKey = key.map((k) => `${options.keyPrefix}${keySeparator}${k}`);
          } else {
            resultKey = options.keyPrefix ? `${options.keyPrefix}${keySeparator}${key}` : key;
          }
          return _this3.t(resultKey, options);
        };
        if (isString(lng)) {
          fixedT.lng = lng;
        } else {
          fixedT.lngs = lng;
        }
        fixedT.ns = ns;
        fixedT.keyPrefix = keyPrefix;
        return fixedT;
      }
      t() {
        return this.translator && this.translator.translate(...arguments);
      }
      exists() {
        return this.translator && this.translator.exists(...arguments);
      }
      setDefaultNamespace(ns) {
        this.options.defaultNS = ns;
      }
      hasLoadedNamespace(ns) {
        let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        if (!this.isInitialized) {
          this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages);
          return false;
        }
        if (!this.languages || !this.languages.length) {
          this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages);
          return false;
        }
        const lng = options.lng || this.resolvedLanguage || this.languages[0];
        const fallbackLng = this.options ? this.options.fallbackLng : false;
        const lastLng = this.languages[this.languages.length - 1];
        if (lng.toLowerCase() === "cimode")
          return true;
        const loadNotPending = (l, n) => {
          const loadState = this.services.backendConnector.state[`${l}|${n}`];
          return loadState === -1 || loadState === 0 || loadState === 2;
        };
        if (options.precheck) {
          const preResult = options.precheck(this, loadNotPending);
          if (preResult !== void 0)
            return preResult;
        }
        if (this.hasResourceBundle(lng, ns))
          return true;
        if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages)
          return true;
        if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns)))
          return true;
        return false;
      }
      loadNamespaces(ns, callback) {
        const deferred = defer();
        if (!this.options.ns) {
          if (callback)
            callback();
          return Promise.resolve();
        }
        if (isString(ns))
          ns = [ns];
        ns.forEach((n) => {
          if (this.options.ns.indexOf(n) < 0)
            this.options.ns.push(n);
        });
        this.loadResources((err) => {
          deferred.resolve();
          if (callback)
            callback(err);
        });
        return deferred;
      }
      loadLanguages(lngs, callback) {
        const deferred = defer();
        if (isString(lngs))
          lngs = [lngs];
        const preloaded = this.options.preload || [];
        const newLngs = lngs.filter((lng) => preloaded.indexOf(lng) < 0 && this.services.languageUtils.isSupportedCode(lng));
        if (!newLngs.length) {
          if (callback)
            callback();
          return Promise.resolve();
        }
        this.options.preload = preloaded.concat(newLngs);
        this.loadResources((err) => {
          deferred.resolve();
          if (callback)
            callback(err);
        });
        return deferred;
      }
      dir(lng) {
        if (!lng)
          lng = this.resolvedLanguage || (this.languages && this.languages.length > 0 ? this.languages[0] : this.language);
        if (!lng)
          return "rtl";
        const rtlLngs = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
        const languageUtils = this.services && this.services.languageUtils || new LanguageUtil(get());
        return rtlLngs.indexOf(languageUtils.getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
      }
      static createInstance() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        let callback = arguments.length > 1 ? arguments[1] : void 0;
        return new _I18n(options, callback);
      }
      cloneInstance() {
        let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        let callback = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : noop;
        const forkResourceStore = options.forkResourceStore;
        if (forkResourceStore)
          delete options.forkResourceStore;
        const mergedOptions = {
          ...this.options,
          ...options,
          ...{
            isClone: true
          }
        };
        const clone = new _I18n(mergedOptions);
        if (options.debug !== void 0 || options.prefix !== void 0) {
          clone.logger = clone.logger.clone(options);
        }
        const membersToCopy = ["store", "services", "language"];
        membersToCopy.forEach((m) => {
          clone[m] = this[m];
        });
        clone.services = {
          ...this.services
        };
        clone.services.utils = {
          hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        if (forkResourceStore) {
          clone.store = new ResourceStore(this.store.data, mergedOptions);
          clone.services.resourceStore = clone.store;
        }
        clone.translator = new Translator(clone.services, mergedOptions);
        clone.translator.on("*", function(event) {
          for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
            args[_key4 - 1] = arguments[_key4];
          }
          clone.emit(event, ...args);
        });
        clone.init(mergedOptions, callback);
        clone.translator.options = mergedOptions;
        clone.translator.backendConnector.services.utils = {
          hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        return clone;
      }
      toJSON() {
        return {
          options: this.options,
          store: this.store,
          language: this.language,
          languages: this.languages,
          resolvedLanguage: this.resolvedLanguage
        };
      }
    };
    var instance = I18n.createInstance();
    instance.createInstance = I18n.createInstance;
    module2.exports = instance;
  }
});

// js/net-guard.js
var require_net_guard = __commonJS({
  "js/net-guard.js"(exports2, module2) {
    var net = require("net");
    var dns = require("dns");
    var https = require("https");
    function isPrivateIp(ip) {
      if (net.isIPv4(ip)) {
        const parts = ip.split(".").map(Number);
        if (parts[0] === 10)
          return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
          return true;
        if (parts[0] === 192 && parts[1] === 168)
          return true;
        if (parts[0] === 127)
          return true;
        if (parts[0] === 169 && parts[1] === 254)
          return true;
        if (parts[0] === 0)
          return true;
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
          return true;
        if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2)
          return true;
        if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100)
          return true;
        if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)
          return true;
        if (parts[0] >= 224 && parts[0] <= 239)
          return true;
        if (parts[0] >= 240)
          return true;
      }
      if (net.isIPv6(ip)) {
        const normalized = ip.toLowerCase();
        if (normalized === "::1" || normalized === "::")
          return true;
        if (normalized.startsWith("fe80:"))
          return true;
        if (normalized.startsWith("fc") || normalized.startsWith("fd"))
          return true;
        if (normalized.startsWith("::ffff:")) {
          const mapped = normalized.slice(7);
          if (net.isIPv4(mapped))
            return isPrivateIp(mapped);
        }
        if (normalized.startsWith("64:ff9b:"))
          return true;
        if (normalized.startsWith("2001:db8:"))
          return true;
        if (normalized.startsWith("2001:") && (normalized.startsWith("2001:0:") || normalized === "2001::"))
          return true;
        if (normalized.startsWith("2002:"))
          return true;
        if (normalized.startsWith("ff"))
          return true;
        if (normalized.startsWith("100:"))
          return true;
      }
      return false;
    }
    function boundaryError(message) {
      const err = new Error(message);
      err.code = "ENETBOUNDARY";
      return err;
    }
    async function validateUrl(url) {
      if (typeof url !== "string" || !url.trim()) {
        throw boundaryError("Invalid URL");
      }
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        throw boundaryError(`Invalid URL: ${url}`);
      }
      if (parsed.protocol !== "https:") {
        throw boundaryError("Only HTTPS URLs are allowed");
      }
      if (parsed.username || parsed.password) {
        throw boundaryError("URLs with userinfo (credentials) are not allowed");
      }
      if (parsed.port !== "" && parsed.port !== "443") {
        throw boundaryError(`Non-standard port ${parsed.port} is not allowed`);
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "[::1]") {
        throw boundaryError("Access to localhost is blocked");
      }
      if (net.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
          throw boundaryError(`Access to private IP address ${hostname} is blocked`);
        }
        return { parsed, addresses: [hostname] };
      }
      try {
        const addresses = await dns.promises.resolve4(hostname).catch(() => []);
        if (addresses.length === 0) {
          throw boundaryError(`DNS resolution returned no addresses for ${hostname}`);
        }
        const badAddr = addresses.find((addr) => isPrivateIp(addr));
        if (badAddr) {
          throw boundaryError(`Resolved address ${badAddr} for ${hostname} is private, access blocked`);
        }
        return { parsed, addresses };
      } catch (e) {
        if (e.code === "ENETBOUNDARY")
          throw e;
        throw new Error(`DNS resolution failed for ${hostname}: ${e.message}`);
      }
    }
    function pinnedLookup(addresses) {
      const list = addresses.map((ip) => ({ address: ip, family: 4 }));
      return (hostname, options, callback) => {
        if (options && options.all)
          return callback(null, list);
        return callback(null, list[0].address, 4);
      };
    }
    var NETWORK_ERROR_PATTERNS = /timed out|timeout|ENOTFOUND|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|socket hang up|DNS resolution/i;
    function isNetworkError2(err) {
      if ((err == null ? void 0 : err.code) === "ENETBOUNDARY")
        return false;
      return NETWORK_ERROR_PATTERNS.test((err == null ? void 0 : err.message) || "") || NETWORK_ERROR_PATTERNS.test((err == null ? void 0 : err.code) || "");
    }
    function assertHostAllowed(url, domains) {
      let hostname;
      try {
        hostname = new URL(url).hostname.toLowerCase();
      } catch {
        throw boundaryError(`Invalid URL for host check: ${url}`);
      }
      const allowed = domains.some(
        (d) => hostname === d || hostname.endsWith("." + d)
      );
      if (!allowed) {
        throw boundaryError(`Host ${hostname} is not in the allowed platform list`);
      }
    }
    async function secureHttpsGet(url, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      options = options || {};
      const { addresses } = await validateUrl(url);
      const getOptions = { ...options, lookup: pinnedLookup(addresses) };
      return https.get(url, getOptions, callback);
    }
    module2.exports = {
      isPrivateIp,
      validateUrl,
      assertHostAllowed,
      pinnedLookup,
      secureHttpsGet,
      isNetworkError: isNetworkError2
    };
  }
});

// js/binary.js
var require_binary = __commonJS({
  "js/binary.js"(exports2, module2) {
    var path = require("path");
    var fs = require("fs");
    var os = require("os");
    var crypto = require("crypto");
    var { spawn, execFileSync } = require("child_process");
    var { secureHttpsGet } = require_net_guard();
    var PLUGIN_ROOT = path.join(__dirname, "..");
    var BIN_DIR = path.join(PLUGIN_ROOT, "bin");
    var PINNED_VERSIONS = {
      ytdlp: {
        version: "2026.08.19",
        assets: {
          "yt-dlp.exe": { sha256: "66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a" },
          "yt-dlp_macos": { sha256: "0f192b7ec147ab6288885d6351d9ab67367640029b4377576ef46dd79cf7b202" },
          "yt-dlp_linux": { sha256: "58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a" }
        },
        urlTemplate: "https://github.com/yt-dlp/yt-dlp/releases/download/{version}/{binary}"
      }
    };
    function verifySha256(filePath, expectedHash) {
      if (!expectedHash || typeof expectedHash !== "string" || expectedHash.length !== 64 || expectedHash.startsWith("<")) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
        }
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: hash missing or invalid`);
      }
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      if (hash.toLowerCase() !== expectedHash.toLowerCase()) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
        }
        throw new Error(`SHA-256 verification failed for ${path.basename(filePath)}: expected ${expectedHash}, got ${hash}`);
      }
    }
    function getYtDlpBinaryName() {
      const platform = os.platform();
      switch (platform) {
        case "win32":
          return "yt-dlp.exe";
        case "darwin":
          return "yt-dlp_macos";
        case "linux":
          return "yt-dlp_linux";
        default:
          return "yt-dlp";
      }
    }
    function getYtDlpPath() {
      return path.join(BIN_DIR, getYtDlpBinaryName());
    }
    function isYtDlpInstalled2() {
      return fs.existsSync(getYtDlpPath());
    }
    function getEagleFfmpegPath() {
      const platform = os.platform();
      const archName = os.arch() === "arm64" ? "arm64" : "x64";
      const dataDir = platform === "darwin" ? path.join(os.homedir(), "Library", "Application Support", "Eagle") : platform === "win32" ? path.join(os.homedir(), "AppData", "Roaming", "Eagle") : path.join(os.homedir(), ".config", "Eagle");
      const dirName = platform === "darwin" ? `ffmpeg-mac-${archName}` : platform === "win32" ? `ffmpeg-win-${archName}` : `ffmpeg-linux-${archName}`;
      const bin = platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
      return path.join(dataDir, "Plugins", dirName, bin);
    }
    function resolveFfmpeg() {
      const p = getEagleFfmpegPath();
      if (fs.existsSync(p))
        return { source: "eagle", path: p };
      return null;
    }
    function getFfmpegSource2() {
      var _a;
      return ((_a = resolveFfmpeg()) == null ? void 0 : _a.source) ?? null;
    }
    function getFfmpegPath() {
      var _a;
      return ((_a = resolveFfmpeg()) == null ? void 0 : _a.path) ?? null;
    }
    var DOWNLOAD_IDLE_TIMEOUT_MS = 15e3;
    var DOWNLOAD_MAX_RETRIES = 2;
    function downloadFile(url, destPath, onProgress, retriesLeft = DOWNLOAD_MAX_RETRIES, idleTimeoutMs = DOWNLOAD_IDLE_TIMEOUT_MS, maxRedirects = 5) {
      return new Promise((resolve, reject) => {
        const tmpPath = `${destPath}.download`;
        const file = fs.createWriteStream(tmpPath);
        let settled = false;
        let request = null;
        const cleanupFile = () => {
          file.close();
          if (fs.existsSync(tmpPath)) {
            try {
              fs.unlinkSync(tmpPath);
            } catch (e) {
            }
          }
        };
        const handleFailure = (error) => {
          if (settled)
            return;
          settled = true;
          if (request)
            request.destroy();
          cleanupFile();
          if (retriesLeft > 0) {
            downloadFile(url, destPath, onProgress, retriesLeft - 1, idleTimeoutMs).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        };
        const onResponse = (response) => {
          if ([301, 302, 307, 308].includes(response.statusCode)) {
            settled = true;
            cleanupFile();
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
              reject(new Error("Redirect missing location header"));
              return;
            }
            if (maxRedirects <= 0) {
              reject(new Error("Too many redirects"));
              return;
            }
            downloadFile(redirectUrl, destPath, onProgress, retriesLeft, idleTimeoutMs, maxRedirects - 1).then(resolve).catch(reject);
            return;
          }
          if (response.statusCode !== 200) {
            settled = true;
            cleanupFile();
            reject(new Error(`Download failed with status ${response.statusCode}`));
            return;
          }
          const totalSize = parseInt(response.headers["content-length"], 10);
          let downloadedSize = 0;
          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            if (onProgress && totalSize) {
              onProgress(Math.round(downloadedSize / totalSize * 100));
            }
          });
          response.on("error", handleFailure);
          response.pipe(file);
          file.on("finish", () => {
            if (settled)
              return;
            settled = true;
            file.close(() => {
              try {
                fs.renameSync(tmpPath, destPath);
                resolve(destPath);
              } catch (e) {
                if (fs.existsSync(tmpPath)) {
                  try {
                    fs.unlinkSync(tmpPath);
                  } catch (_) {
                  }
                }
                reject(e);
              }
            });
          });
          file.on("error", handleFailure);
        };
        secureHttpsGet(url, onResponse).then((req) => {
          request = req;
          request.setTimeout(idleTimeoutMs, () => {
            handleFailure(new Error("Download timed out: no data received"));
          });
          request.on("error", handleFailure);
        }).catch(handleFailure);
      });
    }
    function clearQuarantine(filePath) {
      try {
        execFileSync("xattr", ["-d", "com.apple.quarantine", filePath], { stdio: "ignore" });
      } catch (e) {
      }
    }
    async function downloadYtDlp2(onProgress) {
      if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true });
      }
      const destPath = getYtDlpPath();
      const binaryName = getYtDlpBinaryName();
      const asset = PINNED_VERSIONS.ytdlp.assets[binaryName];
      if (!asset)
        throw new Error(`Unsupported platform: ${os.platform()}`);
      const url = PINNED_VERSIONS.ytdlp.urlTemplate.replace("{version}", PINNED_VERSIONS.ytdlp.version).replace("{binary}", binaryName);
      await downloadFile(url, destPath, onProgress);
      verifySha256(destPath, asset.sha256);
      if (os.platform() !== "win32") {
        fs.chmodSync(destPath, "755");
      }
      if (os.platform() === "darwin") {
        clearQuarantine(destPath);
      }
      return destPath;
    }
    function getInstalledYtDlpVersion2() {
      return new Promise((resolve) => {
        const ytdlp = getYtDlpPath();
        if (!fs.existsSync(ytdlp)) {
          resolve(null);
          return;
        }
        const proc = spawn(ytdlp, ["--version"]);
        let output = "";
        proc.stdout.on("data", (d) => {
          output += d.toString();
        });
        proc.on("close", () => resolve(output.trim() || null));
        proc.on("error", () => resolve(null));
      });
    }
    function getLatestYtDlpVersion2() {
      return PINNED_VERSIONS.ytdlp.version;
    }
    async function checkAndUpdateYtDlp(onProgress) {
      const installedVersion = await getInstalledYtDlpVersion2();
      if (!installedVersion) {
        await downloadYtDlp2(onProgress);
        return true;
      }
      const latestVersion = getLatestYtDlpVersion2();
      if (installedVersion !== latestVersion) {
        await downloadYtDlp2(onProgress);
        return true;
      }
      return false;
    }
    function uninstallYtDlp2() {
      const ytdlp = getYtDlpPath();
      if (fs.existsSync(ytdlp)) {
        fs.unlinkSync(ytdlp);
      }
      try {
        if (fs.existsSync(BIN_DIR) && fs.readdirSync(BIN_DIR).length === 0) {
          fs.rmdirSync(BIN_DIR);
        }
      } catch (e) {
      }
    }
    async function getYtDlpUpdateInfo2() {
      const installedVersion = await getInstalledYtDlpVersion2();
      if (!installedVersion) {
        return { hasUpdate: false, latestVersion: null, installedVersion: null };
      }
      const latestVersion = await getLatestYtDlpVersion2();
      return {
        hasUpdate: installedVersion !== latestVersion,
        latestVersion,
        installedVersion
      };
    }
    module2.exports = {
      BIN_DIR,
      getYtDlpPath,
      getFfmpegPath,
      getFfmpegSource: getFfmpegSource2,
      isYtDlpInstalled: isYtDlpInstalled2,
      downloadYtDlp: downloadYtDlp2,
      uninstallYtDlp: uninstallYtDlp2,
      checkAndUpdateYtDlp,
      getInstalledYtDlpVersion: getInstalledYtDlpVersion2,
      getLatestYtDlpVersion: getLatestYtDlpVersion2,
      getYtDlpUpdateInfo: getYtDlpUpdateInfo2,
      verifySha256
    };
  }
});

// js/sites/bilibili.js
var require_bilibili = __commonJS({
  "js/sites/bilibili.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "bilibili.com" || host === "b23.tv" || host.endsWith(".bilibili.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs(url) {
      return [
        "--referer",
        "https://www.bilibili.com",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, url }) {
      const is412 = stderr.includes("HTTP Error 412");
      const alreadyHasReferer = args.includes("--referer");
      if (is412 && !alreadyHasReferer) {
        const extraArgs = getSiteArgs(url);
        if (extraArgs.length > 0) {
          return await execYtDlp([...args, ...extraArgs], onProgress, onOutput, false);
        }
      }
      return null;
    }
    module2.exports = {
      match,
      getSiteArgs,
      handleExecFailure
    };
  }
});

// js/sites/twitter.js
var require_twitter = __commonJS({
  "js/sites/twitter.js"(exports2, module2) {
    var { validateUrl, assertHostAllowed, secureHttpsGet } = require_net_guard();
    var STATUS_ID_RE = /\/(?:status|statuses)\/(\d+)/;
    var ALLOWED_MEDIA_DOMAINS = ["video.twimg.com"];
    var RECOVERABLE_ERROR_RE = /No video formats found|No video could be found|TweetTombstone|NSFW|age.?restrict|not authorized|requires authentication|Postprocessing|Invalid data found|Error opening input/i;
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--ignore-no-formats-error"
      ];
    }
    function getStatusId(url) {
      const matched = String(url || "").match(STATUS_ID_RE);
      return matched ? matched[1] : null;
    }
    function getOutputTemplate(args) {
      const index = args.indexOf("-o");
      if (index >= 0 && typeof args[index + 1] === "string" && args[index + 1].trim()) {
        return args[index + 1];
      }
      return null;
    }
    function pickBestVideoUrl(tweet) {
      const videos = tweet && tweet.media && Array.isArray(tweet.media.videos) ? tweet.media.videos : [];
      for (const video of videos) {
        const variants = Array.isArray(video.variants) ? video.variants.filter((variant) => {
          if (!variant || typeof variant.url !== "string")
            return false;
          const kind = `${variant.content_type || ""} ${variant.container || ""}`.toLowerCase();
          return kind.includes("mp4") || kind.includes("video/");
        }) : [];
        variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const candidate = variants.length > 0 ? variants[0].url : video.url;
        if (typeof candidate === "string" && candidate.startsWith("https://")) {
          return candidate;
        }
      }
      return null;
    }
    function pickVideoUrls(tweet) {
      const videos = tweet && tweet.media && Array.isArray(tweet.media.videos) ? tweet.media.videos : [];
      const urls = [];
      for (const video of videos) {
        if (!video)
          continue;
        const variants = Array.isArray(video.variants) ? video.variants.filter((variant) => {
          if (!variant || typeof variant.url !== "string")
            return false;
          if (!/^https:\/\/video\.twimg\.com\//i.test(variant.url))
            return false;
          const kind = `${variant.content_type || ""} ${variant.container || ""}`.toLowerCase();
          return kind.includes("mp4") || /\.mp4(\?|$)/i.test(variant.url);
        }) : [];
        variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const candidate = variants.length > 0 ? variants[0].url : video.url;
        if (typeof candidate === "string" && candidate.startsWith("https://") && !urls.includes(candidate)) {
          urls.push(candidate);
        }
      }
      return urls;
    }
    function fetchTweetJson(statusId) {
      return new Promise(async (resolve) => {
        let settled = false;
        const finish = (value) => {
          if (!settled) {
            settled = true;
            resolve(value);
          }
        };
        try {
          const apiUrl = `https://api.fxtwitter.com/status/${statusId}`;
          await validateUrl(apiUrl);
          const req = await secureHttpsGet(
            apiUrl,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
              }
            },
            (res) => {
              if (res.statusCode !== 200) {
                res.resume();
                return finish(null);
              }
              let body = "";
              res.setEncoding("utf8");
              res.on("data", (chunk) => {
                body += chunk;
                if (body.length > 2e6) {
                  res.destroy();
                  finish(null);
                }
              });
              res.on("end", () => {
                try {
                  finish(JSON.parse(body));
                } catch (e) {
                  finish(null);
                }
              });
              res.on("error", () => finish(null));
            }
          );
          req.on("error", () => finish(null));
          req.setTimeout(15e3, () => {
            req.destroy();
            finish(null);
          });
        } catch (e) {
          finish(null);
        }
        setTimeout(() => finish(null), 2e4);
      });
    }
    function pickPhotoUrls(tweet) {
      const photos = tweet && tweet.media && Array.isArray(tweet.media.photos) ? tweet.media.photos : [];
      const urls = [];
      for (const photo of photos) {
        const raw = typeof photo === "string" ? photo : photo && (photo.url || photo.media_url_https);
        if (typeof raw !== "string" || !/^https:\/\/pbs\.twimg\.com\//i.test(raw))
          continue;
        const base = raw.replace(/[?&]name=[^&]+/i, "");
        urls.push(base + (base.includes("?") ? "&" : "?") + "name=orig");
      }
      return urls;
    }
    function buildTitle(tweet, text, statusId) {
      const cleaned = String(text || "").replace(/https:\/\/t\.co\/\S+/gi, "").replace(/\s+/g, " ").trim();
      const author = tweet && tweet.author ? tweet.author.screen_name || tweet.author.name : "";
      const head = cleaned || "Twitter " + statusId;
      const suffix = author ? " - @" + author : "";
      return (head + suffix).slice(0, 180);
    }
    async function customGetInfo(url) {
      const statusId = getStatusId(url);
      if (!statusId)
        return null;
      let data = null;
      try {
        data = await fetchTweetJson(statusId);
      } catch (e) {
        return null;
      }
      const tweet = data && data.tweet;
      if (!tweet)
        return null;
      const text = typeof tweet.text === "string" ? tweet.text : "";
      const base = {
        title: buildTitle(tweet, text, statusId),
        description: text,
        uploader: tweet.author ? tweet.author.name || tweet.author.screen_name || "Twitter" : "Twitter",
        extractor: "twitter",
        webpage_url: url,
        id: statusId,
        thumbnail: tweet.media && tweet.media.videos && tweet.media.videos[0] ? tweet.media.videos[0].thumbnail_url || null : null
      };
      const videos = tweet.media && Array.isArray(tweet.media.videos) ? tweet.media.videos : [];
      if (videos.length) {
        const videoUrls = pickVideoUrls(tweet);
        return Object.assign({}, base, {
          duration: Number(videos[0].duration) || 0,
          ...videoUrls.length > 1 ? { videoUrls } : {}
        });
      }
      const photos = pickPhotoUrls(tweet);
      if (photos.length) {
        return Object.assign({}, base, {
          type: "image",
          imageUrl: photos[0],
          images: photos,
          webpage_url: url
        });
      }
      return null;
    }
    async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, url }) {
      try {
        if (!match(url) || !Array.isArray(args) || args.includes("--dump-json"))
          return null;
        if (!RECOVERABLE_ERROR_RE.test(String(stderr || "")))
          return null;
        const statusId = getStatusId(url);
        const outputTemplate = getOutputTemplate(args);
        if (!statusId || !outputTemplate)
          return null;
        const data = await fetchTweetJson(statusId);
        const directUrl = pickBestVideoUrl(data && data.tweet);
        if (!directUrl)
          return null;
        await validateUrl(directUrl);
        assertHostAllowed(directUrl, ALLOWED_MEDIA_DOMAINS);
        return await execYtDlp(
          [directUrl, "-o", outputTemplate, "--no-warnings", "--merge-output-format", "mp4"],
          onProgress,
          onOutput,
          false
        );
      } catch (e) {
        return null;
      }
    }
    module2.exports = {
      match,
      getSiteArgs,
      customGetInfo,
      handleExecFailure,
      pickPhotoUrls,
      pickVideoUrls
    };
  }
});

// js/sites/vimeo.js
var require_vimeo = __commonJS({
  "js/sites/vimeo.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "vimeo.com" || host.endsWith(".vimeo.com");
      } catch {
        return false;
      }
    }
    function normalizeUrl(url) {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname === "vimeo.com" || urlObj.hostname === "www.vimeo.com") {
          const pathParts = urlObj.pathname.split("/").filter((p) => p);
          const videoId = pathParts.find((part) => /^\d+$/.test(part));
          if (videoId) {
            return `https://player.vimeo.com/video/${videoId}`;
          }
        }
        return url;
      } catch {
        return url;
      }
    }
    module2.exports = {
      match,
      normalizeUrl
    };
  }
});

// js/sites/instagram.js
var require_instagram = __commonJS({
  "js/sites/instagram.js"(exports2, module2) {
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "instagram.com" || host.endsWith(".instagram.com");
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://www.instagram.com/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    module2.exports = {
      match,
      getSiteArgs
    };
  }
});

// js/sites/pinterest.js
var require_pinterest = __commonJS({
  "js/sites/pinterest.js"(exports2, module2) {
    var { validateUrl, assertHostAllowed, secureHttpsGet } = require_net_guard();
    var DERIVED_SOURCE_DOMAINS = ["instagram.com", "youtube.com", "youtu.be", "vimeo.com", "tiktok.com"];
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "pinterest.com" || host.endsWith(".pinterest.com") || host === "pin.it";
      } catch {
        return false;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://www.pinterest.com/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    function fetchWithRedirect(url, maxRedirects = 5) {
      return new Promise(async (resolve) => {
        if (maxRedirects <= 0)
          return resolve(null);
        try {
          const u = new URL(url);
          const req = await secureHttpsGet(
            url,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            },
            async (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith("/")) {
                  redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
                }
                try {
                  assertHostAllowed(redirectUrl, ["pinterest.com", "pin.it", "pinimg.com"]);
                  await validateUrl(redirectUrl);
                  return fetchWithRedirect(redirectUrl, maxRedirects - 1).then(resolve);
                } catch (err) {
                  return resolve(null);
                }
              }
              let html = "";
              res.on("data", (chunk) => html += chunk);
              res.on("end", () => resolve(html));
            }
          );
          req.on("error", () => resolve(null));
          req.setTimeout(8e3, () => {
            req.destroy();
            resolve(null);
          });
        } catch (e) {
          resolve(null);
        }
      });
    }
    async function fetchPageHtml(url) {
      await validateUrl(url);
      return await fetchWithRedirect(url);
    }
    function pickDerivedSourceUrl(html, pinId) {
      let searchArea = html;
      if (pinId) {
        const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
        if (entityIdx !== -1) {
          const start = Math.max(0, entityIdx - 8e3);
          const end = Math.min(html.length, entityIdx + 8e3);
          searchArea = html.substring(start, end);
        }
      }
      const normalizedArea = searchArea.replace(/\\\//g, "/");
      const candidates = normalizedArea.match(/https:\/\/[^\s"'<>\\]+/gi);
      if (!candidates)
        return null;
      for (const raw of candidates) {
        const cleaned = raw.replace(/\\\/|\\/g, "/").replace(/\\u0026/g, "&");
        try {
          assertHostAllowed(cleaned, DERIVED_SOURCE_DOMAINS);
          return cleaned;
        } catch {
        }
      }
      return null;
    }
    async function extractPinterestPinData(pinterestUrl) {
      try {
        const html = await fetchPageHtml(pinterestUrl);
        if (!html)
          return null;
        const pinIdMatch = pinterestUrl.match(/pin\/([\d]+)/);
        const pinId = pinIdMatch ? pinIdMatch[1] : null;
        const result = {
          isVideo: false,
          videos: null,
          imageUrl: null,
          title: "",
          description: "",
          link: null,
          sourceUrl: null
        };
        if (pinId) {
          const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
          if (entityIdx !== -1) {
            const start = Math.max(0, entityIdx - 3e3);
            const end = Math.min(html.length, entityIdx + 3e3);
            const context = html.substring(start, end);
            const isVideoMatch = context.match(/"isVideo"\s*:\s*(true|false)/);
            if (isVideoMatch)
              result.isVideo = isVideoMatch[1] === "true";
            const videosMatch = context.match(/"videos"\s*:\s*(null|\{)/);
            if (videosMatch && videosMatch[1] !== "null")
              result.videos = true;
            const descMatch = context.match(/"description"\s*:\s*"([^"]{0,500})"/);
            if (descMatch)
              result.description = descMatch[1];
            const titleMatch = context.match(/"seoTitle"\s*:\s*"([^"]{0,200})"/);
            if (titleMatch && titleMatch[1])
              result.title = titleMatch[1];
            const linkMatch = context.match(/"link"\s*:\s*"([^"]+)"/);
            if (linkMatch)
              result.link = linkMatch[1];
          }
        }
        if (pinId) {
          const entityIdx = html.indexOf(`"entityId":"${pinId}"`);
          if (entityIdx !== -1) {
            const imgSearchStart = Math.max(0, entityIdx - 8e3);
            const imgSearchEnd = Math.min(html.length, entityIdx + 8e3);
            const imgContext = html.substring(imgSearchStart, imgSearchEnd);
            const origMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/originals\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
            if (origMatch) {
              result.imageUrl = `https://i.pinimg.com/originals/${origMatch[1]}`;
            } else {
              const anyMatch = imgContext.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x|236x|136x136|60x60|600x315)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
              if (anyMatch) {
                result.imageUrl = `https://i.pinimg.com/originals/${anyMatch[1]}`;
              }
            }
          }
        }
        if (!result.imageUrl) {
          const originalsMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp)/i);
          if (originalsMatch) {
            result.imageUrl = originalsMatch[0];
          } else {
            const anyImgMatch = html.match(/https:\/\/i\.pinimg\.com\/(?:1200x|736x|564x|474x)\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.(?:jpg|png|gif|webp))/i);
            if (anyImgMatch) {
              result.imageUrl = `https://i.pinimg.com/originals/${anyImgMatch[1]}`;
            }
          }
        }
        result.sourceUrl = pickDerivedSourceUrl(html, pinId);
        if (!result.title && result.description) {
          result.title = result.description.split("\n")[0].substring(0, 100);
        }
        if (!result.title)
          result.title = "Pinterest Pin";
        return result;
      } catch (e) {
        return null;
      }
    }
    async function customGetInfo(url, { execYtDlp, parseYtDlpOutput, getSiteArgsForUrl }) {
      const pinData = await extractPinterestPinData(url);
      if (!pinData)
        return null;
      const hasVideoContent = pinData.isVideo || pinData.videos;
      const hasVideoSource = !!pinData.sourceUrl;
      if (!hasVideoContent && !hasVideoSource && pinData.imageUrl) {
        return {
          type: "image",
          imageUrl: pinData.imageUrl,
          title: pinData.title || "Pinterest Pin",
          description: pinData.description || "",
          duration: 0,
          thumbnail: pinData.imageUrl,
          uploader: "Pinterest",
          extractor: "pinterest",
          webpage_url: url,
          id: null
        };
      }
      if (hasVideoSource && !hasVideoContent) {
        const targetUrl = pinData.sourceUrl.replace(/\?img_index=\d+/, "");
        assertHostAllowed(targetUrl, DERIVED_SOURCE_DOMAINS);
        await validateUrl(targetUrl);
        const args = ["--dump-json", "--no-warnings", ...getSiteArgsForUrl(targetUrl), targetUrl];
        try {
          const output = await execYtDlp(args, null, null, { targetUrl });
          const info = parseYtDlpOutput(output, targetUrl);
          info.derivedFrom = "pinterest";
          return info;
        } catch (e) {
          if (pinData.imageUrl) {
            return {
              type: "image",
              imageUrl: pinData.imageUrl,
              title: pinData.title || "Pinterest Pin",
              description: pinData.description || "",
              duration: 0,
              thumbnail: pinData.imageUrl,
              uploader: "Pinterest",
              extractor: "pinterest",
              webpage_url: url,
              id: null
            };
          }
          throw e;
        }
      }
      return null;
    }
    async function handleExecFailure({ stderr, args, onProgress, onOutput, execYtDlp, getSiteArgsForUrl, url }) {
      const isNoFormats = stderr.includes("No video formats found") || stderr.includes("[Pinterest]");
      if (!isNoFormats)
        return null;
      const alreadyTriedSource = (() => {
        try {
          return args.some((a) => {
            if (typeof a !== "string" || !a.startsWith("https"))
              return false;
            const host = new URL(a).hostname.toLowerCase();
            return DERIVED_SOURCE_DOMAINS.some((d) => host === d || host.endsWith("." + d));
          });
        } catch {
          return false;
        }
      })();
      if (!alreadyTriedSource) {
        let sourceUrl = await extractPinterestPinData(url).then((d) => (d == null ? void 0 : d.sourceUrl) ?? null);
        if (sourceUrl) {
          sourceUrl = sourceUrl.replace(/\?img_index=\d+/, "");
          try {
            assertHostAllowed(sourceUrl, DERIVED_SOURCE_DOMAINS);
            await validateUrl(sourceUrl);
          } catch {
            return null;
          }
          const oldSiteArgs = getSiteArgs();
          const cleanedArgs = args.filter((a) => !oldSiteArgs.includes(a));
          const newSiteArgs = getSiteArgsForUrl(sourceUrl);
          const newArgs = cleanedArgs.map((a) => a === url ? sourceUrl : a);
          newArgs.push(...newSiteArgs);
          try {
            return await execYtDlp(newArgs, onProgress, onOutput, { allowRecovery: false, targetUrl: sourceUrl });
          } catch (e) {
          }
        }
      }
      return null;
    }
    function assertDerivedHostAllowed(url) {
      assertHostAllowed(url, DERIVED_SOURCE_DOMAINS);
    }
    module2.exports = {
      match,
      getSiteArgs,
      customGetInfo,
      handleExecFailure,
      pickDerivedSourceUrl,
      assertDerivedHostAllowed
    };
  }
});

// js/sites/dribbble.js
var require_dribbble = __commonJS({
  "js/sites/dribbble.js"(exports2, module2) {
    var { validateUrl, assertHostAllowed, secureHttpsGet } = require_net_guard();
    var i18next3 = require_i18next();
    var ALLOWED_DOMAINS = ["dribbble.com", "cdn.dribbble.com"];
    function match(url) {
      try {
        const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
        return host === "dribbble.com" || host.endsWith(".dribbble.com");
      } catch {
        return false;
      }
    }
    function normalizeUrl(url) {
      try {
        const u = new URL(url);
        if (u.hostname === "dribbble.com" || u.hostname === "www.dribbble.com") {
          return `${u.protocol}//${u.host}${u.pathname}`;
        }
        return url;
      } catch {
        return url;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://dribbble.com/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      ];
    }
    function parseJinaResponse(raw) {
      let title = "Dribbble Shot";
      let description = "";
      let content = raw;
      let ogImage = null;
      let creator = "Dribbble";
      if (raw.trim().startsWith("{")) {
        try {
          const json = JSON.parse(raw);
          const d = json.data || {};
          const meta = d.metadata || {};
          title = d.title || meta["og:title"] || title;
          description = d.description || meta["description"] || "";
          content = d.content || "";
          creator = meta["twitter:creator"] || creator;
          if (meta["og:image"]) {
            ogImage = Array.isArray(meta["og:image"]) ? meta["og:image"][0] : meta["og:image"];
          }
        } catch {
        }
      } else {
        const titleMatch = raw.match(/^Title:\s*(.+)$/m);
        if (titleMatch)
          title = titleMatch[1].trim();
      }
      const videoMatch = content.match(/https:\/\/cdn\.dribbble\.com\/(?:userupload|users)\/[^\s\)"\x27]+\.mp4/i) || raw.match(/https:\/\/cdn\.dribbble\.com\/(?:userupload|users)\/[^\s\)"\x27]+\.mp4/i);
      const imgMatch = content.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^\s\)"\x27]+\.(?:jpg|jpeg|png|webp|gif)/i) || raw.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^\s\)"\x27]+\.(?:jpg|jpeg|png|webp|gif)/i) || ogImage;
      return {
        title,
        description,
        creator,
        videoUrl: videoMatch ? videoMatch[0] : null,
        imageUrl: imgMatch ? typeof imgMatch === "string" ? imgMatch : imgMatch[0] : null
      };
    }
    function fetchShotData(shotUrl) {
      return new Promise(async (resolve) => {
        try {
          const jinaUrl = `https://r.jina.ai/${shotUrl}`;
          await validateUrl(jinaUrl);
          const req = await secureHttpsGet(
            jinaUrl,
            {
              headers: {
                "Accept": "application/json",
                "X-Return-Format": "json"
              }
            },
            (res) => {
              let body = "";
              res.on("data", (chunk) => body += chunk);
              res.on("end", () => {
                resolve(parseJinaResponse(body));
              });
            }
          );
          req.on("error", () => resolve(null));
          req.setTimeout(2e4, () => {
            req.destroy();
            resolve(null);
          });
        } catch (e) {
          resolve(null);
        }
      });
    }
    async function customGetInfo(url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.toLowerCase() === "cdn.dribbble.com") {
          return null;
        }
      } catch {
        return null;
      }
      if (!url.includes("/shots/")) {
        return null;
      }
      const cleanUrl = normalizeUrl(url);
      const shotData = await fetchShotData(cleanUrl);
      if (!shotData) {
        throw new Error(i18next3.t("error.dribbbleExtractFailed"));
      }
      const shotIdMatch = url.match(/\/shots\/(\d+)/);
      const shotId = shotIdMatch ? shotIdMatch[1] : null;
      if (shotData.videoUrl) {
        assertHostAllowed(shotData.videoUrl, ALLOWED_DOMAINS);
        await validateUrl(shotData.videoUrl);
        return {
          title: shotData.title,
          description: shotData.description,
          uploader: shotData.creator || "Dribbble",
          extractor: "dribbble",
          webpage_url: shotData.videoUrl,
          thumbnail: shotData.imageUrl,
          duration: 0,
          id: shotId
        };
      }
      if (shotData.imageUrl) {
        assertHostAllowed(shotData.imageUrl, ALLOWED_DOMAINS);
        await validateUrl(shotData.imageUrl);
        return {
          type: "image",
          imageUrl: shotData.imageUrl,
          title: shotData.title,
          description: shotData.description,
          duration: 0,
          thumbnail: shotData.imageUrl,
          uploader: shotData.creator || "Dribbble",
          extractor: "dribbble",
          webpage_url: url,
          id: shotId
        };
      }
      throw new Error(i18next3.t("error.dribbbleNoMedia"));
    }
    module2.exports = {
      match,
      normalizeUrl,
      getSiteArgs,
      customGetInfo
    };
  }
});

// js/library-context.js
var require_library_context = __commonJS({
  "js/library-context.js"(exports2, module2) {
    function getLibraryPath() {
      try {
        if (typeof eagle !== "undefined" && eagle && eagle.library && eagle.library.path) {
          return String(eagle.library.path);
        }
      } catch (e) {
      }
      return "";
    }
    function scopedKey(base) {
      const libraryPath = getLibraryPath();
      if (!libraryPath)
        return base;
      return base + "::" + libraryPath.toLowerCase();
    }
    module2.exports = {
      getLibraryPath,
      scopedKey
    };
  }
});

// js/sankaku-auth.js
var require_sankaku_auth = __commonJS({
  "js/sankaku-auth.js"(exports2, module2) {
    var { scopedKey } = require_library_context();
    var STORAGE_KEY = "eagle-video-downloader.sankakuAuth";
    function currentKey() {
      if (typeof localStorage === "undefined")
        return STORAGE_KEY;
      return scopedKey(STORAGE_KEY);
    }
    function migrateLegacyKey(key) {
      try {
        if (typeof localStorage === "undefined" || key === STORAGE_KEY)
          return;
        if (localStorage.getItem(key) === null) {
          const legacy = localStorage.getItem(STORAGE_KEY);
          if (legacy !== null)
            localStorage.setItem(key, legacy);
        }
      } catch (e) {
      }
    }
    function getStoredAuth() {
      try {
        if (typeof localStorage === "undefined")
          return "";
        const key = currentKey();
        migrateLegacyKey(key);
        return localStorage.getItem(key) || "";
      } catch (e) {
        return "";
      }
    }
    function setStoredAuth(value) {
      try {
        if (typeof localStorage === "undefined")
          return;
        const key = currentKey();
        const text = String(value || "").trim();
        if (!text) {
          localStorage.removeItem(key);
          return;
        }
        localStorage.setItem(key, text);
      } catch (e) {
      }
    }
    function parseAccessToken(raw) {
      const text = String(raw === void 0 || raw === null ? "" : raw).trim();
      if (!text)
        return "";
      if (!text.includes("="))
        return text;
      for (const part of text.split(";")) {
        const index = part.indexOf("=");
        if (index < 0)
          continue;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (name === "accessToken" && value)
          return value;
      }
      return "";
    }
    function getAccessToken() {
      return parseAccessToken(getStoredAuth());
    }
    function buildAuthHeaders(baseHeaders) {
      const headers = { ...baseHeaders || {} };
      const token = getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      return headers;
    }
    module2.exports = {
      STORAGE_KEY,
      getStoredAuth,
      setStoredAuth,
      parseAccessToken,
      getAccessToken,
      buildAuthHeaders
    };
  }
});

// js/sites/sankaku.js
var require_sankaku = __commonJS({
  "js/sites/sankaku.js"(exports2, module2) {
    var { validateUrl, assertHostAllowed, secureHttpsGet } = require_net_guard();
    var { buildAuthHeaders, getAccessToken } = require_sankaku_auth();
    var i18next3 = require_i18next();
    function tr(key, fallback) {
      try {
        const value = i18next3.t(key);
        return value && value !== key ? value : fallback;
      } catch (e) {
        return fallback;
      }
    }
    var API_BASE = "https://sankakuapi.com";
    var API_ACCEPT = "application/vnd.sankaku.api+json;v=2";
    var ALLOWED_MEDIA_DOMAINS = ["sankakucomplex.com", "sankaku.app"];
    var POST_PATH_RE = /^(?:\/[a-z]{2}(?:-[a-zA-Z]{2,4})?)?\/posts?(?:\/show)?\/([A-Za-z0-9]+)\/?$/;
    var VIDEO_EXT_RE = /^(mp4|webm|mov|m4v|mkv)$/i;
    var IMAGE_EXT_RE = /^(jpg|jpeg|png|gif|webp|avif)$/i;
    function match(url) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return host === "sankaku.app" || host.endsWith(".sankaku.app") || host === "sankakucomplex.com" || host.endsWith(".sankakucomplex.com");
      } catch {
        return false;
      }
    }
    function normalizeUrl(url) {
      try {
        const u = new URL(url);
        if (!getPostId(u))
          return url;
        return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
      } catch {
        return url;
      }
    }
    function getSiteArgs() {
      return [
        "--referer",
        "https://sankaku.app/",
        "--add-header",
        "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      ];
    }
    function getPostId(url) {
      try {
        const parsed = url instanceof URL ? url : new URL(url);
        const matched = parsed.pathname.match(POST_PATH_RE);
        return matched ? matched[1] : null;
      } catch {
        return null;
      }
    }
    function fetchPost(postId, anonymous = false) {
      return new Promise(async (resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled)
            return;
          settled = true;
          fn(value);
        };
        const params = new URLSearchParams({
          lang: "en",
          page: "1",
          limit: "1",
          tags: `id_range:${postId}`
        });
        const apiUrl = `${API_BASE}/v2/posts?${params.toString()}`;
        try {
          await validateUrl(apiUrl);
          const req = await secureHttpsGet(
            apiUrl,
            {
              headers: anonymous ? {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": API_ACCEPT,
                "Origin": "https://sankaku.app",
                "Referer": "https://sankaku.app/"
              } : buildAuthHeaders({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": API_ACCEPT,
                "Origin": "https://sankaku.app",
                "Referer": "https://sankaku.app/"
              })
            },
            (res) => {
              let body = "";
              res.setEncoding("utf8");
              res.on("data", (chunk) => {
                body += chunk;
                if (body.length > 2e6) {
                  res.destroy();
                  finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post")));
                }
              });
              res.on("end", () => {
                if (res.statusCode === 429) {
                  finish(reject, new Error(tr("error.sankakuRateLimited", "Sankaku API rate limited, please retry later")));
                  return;
                }
                if (res.statusCode === 401 && !anonymous && getAccessToken()) {
                  fetchPost(postId, true).then((post) => finish(resolve, post), (err) => finish(reject, err));
                  return;
                }
                if (res.statusCode === 401) {
                  finish(reject, new Error(tr("error.sankakuAuthExpired", "Sankaku login expired, please update the account cookie in Settings")));
                  return;
                }
                if (res.statusCode === 404) {
                  if (getAccessToken() && !anonymous) {
                    finish(reject, new Error(tr("error.sankakuNotFound", "Sankaku post not found (bad link or deleted)")));
                  } else {
                    finish(reject, new Error(tr(
                      "error.sankakuLoginOrDeleted",
                      "Sankaku post not found for anonymous users; it may require login or be deleted. Add your account cookie in Settings -> Account."
                    )));
                  }
                  return;
                }
                if (res.statusCode === 403) {
                  if (getAccessToken() && !anonymous) {
                    fetchPost(postId, true).then((post) => finish(resolve, post), (err) => finish(reject, err));
                  } else {
                    finish(reject, new Error(tr("error.sankakuUnavailable", "Sankaku post unavailable (deleted or restricted)")));
                  }
                  return;
                }
                if (res.statusCode !== 200) {
                  finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post")));
                  return;
                }
                try {
                  finish(resolve, pickPost(JSON.parse(body), postId));
                } catch (e) {
                  finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post")));
                }
              });
              res.on("error", () => finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post"))));
            }
          );
          req.on("error", () => finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post"))));
          req.setTimeout(15e3, () => {
            req.destroy();
            finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post")));
          });
        } catch (e) {
          finish(reject, e);
        }
        setTimeout(() => finish(reject, new Error(tr("error.sankakuExtractFailed", "Failed to read this Sankaku post"))), 2e4);
      });
    }
    function pickPost(payload, postId) {
      const list = Array.isArray(payload) ? payload : Array.isArray(payload && payload.data) ? payload.data : [];
      const post = list.find((item) => item && String(item.id).toLowerCase() === postId.toLowerCase());
      return post || null;
    }
    function buildTitle(post) {
      const author = post.author && (post.author.display_name || post.author.name) || "";
      const label = `Sankaku ${post.id}`;
      return author ? `${author} - ${label}` : label;
    }
    function buildDescription(post) {
      const tags = Array.isArray(post.tag_names) ? post.tag_names.slice(0, 12).join(" ") : "";
      return tags;
    }
    async function customGetInfo(url) {
      const postId = getPostId(url);
      if (!postId)
        return null;
      const post = await fetchPost(postId);
      if (!post) {
        throw new Error(tr("error.sankakuNotFound", "Sankaku post not found (bad link or deleted)"));
      }
      if (post.status && post.status !== "active") {
        throw new Error(tr("error.sankakuUnavailable", "Sankaku post unavailable (deleted or restricted)"));
      }
      let fileUrl = typeof post.file_url === "string" ? post.file_url.trim() : "";
      if (!fileUrl) {
        throw new Error(tr("error.sankakuLoginRequired", "This Sankaku post requires a logged-in account"));
      }
      if (fileUrl.startsWith("http://")) {
        fileUrl = `https://${fileUrl.slice("http://".length)}`;
      }
      assertHostAllowed(fileUrl, ALLOWED_MEDIA_DOMAINS);
      await validateUrl(fileUrl);
      const fileExt = String(post.file_ext || "").toLowerCase();
      const fileType = String(post.file_type || "").toLowerCase();
      const isVideo = fileType.startsWith("video/") || VIDEO_EXT_RE.test(fileExt);
      const base = {
        title: buildTitle(post),
        description: buildDescription(post),
        duration: Number(post.duration || post.video_duration || 0) || 0,
        thumbnail: post.preview_url || post.sample_url || null,
        uploader: post.author && (post.author.display_name || post.author.name) || "Sankaku",
        extractor: "sankaku",
        id: post.id,
        webpage_url: fileUrl
      };
      if (isVideo) {
        return base;
      }
      if (IMAGE_EXT_RE.test(fileExt) || fileType.startsWith("image/")) {
        return {
          ...base,
          type: "image",
          imageUrl: fileUrl,
          webpage_url: url
        };
      }
      throw new Error(tr("error.sankakuNoMedia", "No downloadable video or image in this Sankaku post"));
    }
    module2.exports = {
      match,
      normalizeUrl,
      getSiteArgs,
      customGetInfo,
      getPostId
    };
  }
});

// js/sites/index.js
var require_sites = __commonJS({
  "js/sites/index.js"(exports2, module2) {
    var bilibili = require_bilibili();
    var twitter = require_twitter();
    var vimeo = require_vimeo();
    var instagram = require_instagram();
    var pinterest = require_pinterest();
    var dribbble = require_dribbble();
    var sankaku = require_sankaku();
    var adapters = [
      bilibili,
      twitter,
      vimeo,
      instagram,
      pinterest,
      dribbble,
      sankaku
    ];
    function findAdapter(url) {
      if (!url || typeof url !== "string")
        return null;
      for (const adapter of adapters) {
        if (adapter.match(url)) {
          return adapter;
        }
      }
      return null;
    }
    function normalizeUrl(url) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.normalizeUrl === "function") {
        return adapter.normalizeUrl(url);
      }
      return url;
    }
    function getSiteArgs(url) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.getSiteArgs === "function") {
        return adapter.getSiteArgs(url);
      }
      return [];
    }
    async function customGetInfo(url, context) {
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.customGetInfo === "function") {
        return await adapter.customGetInfo(url, context);
      }
      return null;
    }
    async function handleExecFailure(context) {
      const { url } = context;
      const adapter = findAdapter(url);
      if (adapter && typeof adapter.handleExecFailure === "function") {
        return await adapter.handleExecFailure(context);
      }
      return null;
    }
    function assertDerivedHostAllowed(url) {
      return pinterest.assertDerivedHostAllowed(url);
    }
    module2.exports = {
      findAdapter,
      normalizeUrl,
      getSiteArgs,
      customGetInfo,
      handleExecFailure,
      assertDerivedHostAllowed
    };
  }
});

// js/downloader.js
var require_downloader = __commonJS({
  "js/downloader.js"(exports2, module2) {
    var path = require("path");
    var fs = require("fs");
    var os = require("os");
    var { spawn } = require("child_process");
    var i18next3 = require_i18next();
    var { getYtDlpPath, getFfmpegPath, BIN_DIR, downloadYtDlp: downloadYtDlp2 } = require_binary();
    var { validateUrl, secureHttpsGet } = require_net_guard();
    var siteAdapters = require_sites();
    var maxResolution = "auto";
    var maxFramerate = "auto";
    var threadCount = 0;
    function setQualityPrefs({ resolution = "auto", framerate = "auto" } = {}) {
      maxResolution = resolution || "auto";
      maxFramerate = framerate || "auto";
    }
    function setThreadCount(value) {
      const parsed = parseInt(value, 10);
      threadCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    function escapeRegExp(text) {
      return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    function startProcessingWatcher(outputDir, sanitizedTitle, onProgress) {
      const base = escapeRegExp(sanitizedTitle);
      const finalRe = new RegExp(`^${base}_\\d+\\.[^.]+$`);
      const partRe = new RegExp(`^${base}_\\d+\\.[^.]{1,8}\\.[^.]+$`);
      const timer = setInterval(() => {
        let entries = [];
        try {
          entries = fs.readdirSync(outputDir);
        } catch (e) {
          return;
        }
        const finals = entries.filter((name) => finalRe.test(name) && !partRe.test(name));
        if (!finals.length)
          return;
        let expected = 0;
        for (const name of entries) {
          if (!partRe.test(name))
            continue;
          try {
            expected += fs.statSync(path.join(outputDir, name)).size;
          } catch (e) {
          }
        }
        if (expected <= 0)
          return;
        let written = 0;
        for (const name of finals) {
          try {
            written += fs.statSync(path.join(outputDir, name)).size;
          } catch (e) {
          }
        }
        if (onProgress) {
          onProgress({ processingPercent: Math.max(0, Math.min(99, Math.round(written / expected * 100))) });
        }
      }, 400);
      if (timer.unref)
        timer.unref();
      return { stop: () => clearInterval(timer) };
    }
    function buildFormatSelector(resolution, framerate) {
      const heightFilter = resolution && resolution !== "auto" ? `[height<=${resolution}]` : "";
      const fpsFilter = framerate && framerate !== "auto" ? `[fps<=${framerate}]` : "";
      if (!heightFilter && !fpsFilter) {
        return "bestvideo+bestaudio/best/b";
      }
      const parts = [];
      if (heightFilter && fpsFilter) {
        parts.push(`bestvideo${heightFilter}${fpsFilter}+bestaudio/best${heightFilter}${fpsFilter}`);
      }
      if (heightFilter) {
        parts.push(`bestvideo${heightFilter}+bestaudio/best${heightFilter}`);
      }
      if (fpsFilter) {
        parts.push(`bestvideo${fpsFilter}+bestaudio/best${fpsFilter}`);
      }
      parts.push("bestvideo+bestaudio/best/b");
      return parts.join("/");
    }
    function isCorruptedBinaryError(error) {
      return error.code === "EBADMACHO" || error.code === "ENOEXEC" || error.errno === -88;
    }
    function execYtDlp(args, onProgress, onOutput, options = {}) {
      if (typeof options === "boolean") {
        options = { allowRecovery: options };
      }
      const { allowRecovery = true, targetUrl = null } = options;
      return new Promise((resolve, reject) => {
        const ytdlp = getYtDlpPath();
        if (!fs.existsSync(ytdlp)) {
          reject(new Error(i18next3.t("error.ytdlpNotInstalled")));
          return;
        }
        if (os.platform() !== "win32") {
          try {
            fs.chmodSync(ytdlp, "755");
          } catch (e) {
          }
        }
        const recoverFromCorruptBinary = (error) => {
          try {
            fs.unlinkSync(ytdlp);
          } catch (e) {
          }
          downloadYtDlp2().then(() => execYtDlp(args, onProgress, onOutput, { allowRecovery: false, targetUrl })).then(resolve).catch(() => reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${error.message}`)));
        };
        const finalArgs = args.includes("--force-ipv4") ? args : ["--force-ipv4", ...args];
        let proc;
        try {
          proc = spawn(ytdlp, finalArgs, { cwd: BIN_DIR });
        } catch (error) {
          if (allowRecovery && isCorruptedBinaryError(error)) {
            recoverFromCorruptBinary(error);
            return;
          }
          reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${error.message}`));
          return;
        }
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => {
          const output = data.toString();
          stdout += output;
          if (onOutput)
            onOutput(output);
          const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          if (progressMatch && onProgress) {
            const percent = parseFloat(progressMatch[1]);
            const sizeMatch = output.match(/of\s+~?\s*(\S+)/);
            const totalSize = sizeMatch ? sizeMatch[1] : "";
            const speedMatch = output.match(/at\s+(\S+)/);
            const currentSpeed = speedMatch ? speedMatch[1] : "";
            const etaMatch = output.match(/ETA\s+(\S+)/);
            const eta = etaMatch ? etaMatch[1] : "";
            onProgress({
              percent,
              totalSize,
              currentSpeed,
              eta
            });
          }
        });
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        proc.on("error", (error) => {
          if (allowRecovery && isCorruptedBinaryError(error)) {
            recoverFromCorruptBinary(error);
            return;
          }
          let detail = error.message;
          if (error.code === "ENOENT") {
            detail = i18next3.t("error.ytdlpNotFound") + " (ENOENT)";
          } else if (error.code === "EACCES") {
            detail = i18next3.t("error.ytdlpPermissionDenied") + " (EACCES)";
          }
          reject(new Error(`${i18next3.t("error.failedToExecuteYtdlp")}: ${detail}`));
        });
        proc.on("close", async (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            if (targetUrl) {
              try {
                const recoveryResult = await siteAdapters.handleExecFailure({
                  code,
                  stderr,
                  args,
                  onProgress,
                  onOutput,
                  execYtDlp,
                  getSiteArgsForUrl: siteAdapters.getSiteArgs,
                  url: targetUrl
                });
                if (recoveryResult !== null) {
                  resolve(recoveryResult);
                  return;
                }
              } catch (recoveryErr) {
              }
            }
            reject(
              new Error(`${i18next3.t("error.ytdlpExitedWithCode")} ${code}: ${stderr}`)
            );
          }
        });
      });
    }
    async function downloadFile(url, outputPath, onProgress, maxRedirects = 5) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
      return new Promise((resolve, reject) => {
        (async () => {
          let req;
          try {
            req = await secureHttpsGet(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            }, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (maxRedirects <= 0)
                  return reject(new Error("Too many redirects"));
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith("/")) {
                  const u = new URL(url);
                  redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
                }
                res.resume();
                downloadFile(redirectUrl, outputPath, onProgress, maxRedirects - 1).then(resolve).catch(reject);
                return;
              }
              if (res.statusCode < 200 || res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode}`));
              }
              const contentLength = parseInt(res.headers["content-length"] || "0", 10);
              const fileStream = fs.createWriteStream(outputPath);
              let received = 0;
              res.on("data", (chunk) => {
                received += chunk.length;
                if (onProgress && contentLength > 0) {
                  onProgress({ percent: Math.round(received / contentLength * 100) });
                }
              });
              res.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                if (onProgress)
                  onProgress({ percent: 100 });
                resolve(outputPath);
              });
              fileStream.on("error", reject);
            });
          } catch (e) {
            return reject(e);
          }
          req.on("error", reject);
          req.setTimeout(3e4, () => {
            req.destroy();
            reject(new Error("Download timeout"));
          });
        })();
      });
    }
    async function getVideoInfo(url) {
      await validateUrl(url);
      url = siteAdapters.normalizeUrl(url);
      await validateUrl(url);
      const customInfo = await siteAdapters.customGetInfo(url, {
        execYtDlp,
        parseYtDlpOutput,
        getSiteArgsForUrl: siteAdapters.getSiteArgs
      });
      if (customInfo) {
        return customInfo;
      }
      const args = ["--dump-json", "--no-warnings", ...siteAdapters.getSiteArgs(url), url];
      const output = await execYtDlp(args, null, null, { targetUrl: url });
      return parseYtDlpOutput(output, url);
    }
    function parseYtDlpOutput(output, fallbackUrl) {
      const lines = output.trim().split("\n").filter(Boolean);
      let info = {};
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed._type === "video" || parsed.title || parsed.playlist_title) {
            info = parsed;
            if (parsed.title)
              break;
          } else if (!info.id) {
            info = parsed;
          }
        } catch (e) {
        }
      }
      return {
        title: info.title || info.playlist_title || i18next3.t("error.untitledVideo"),
        description: info.description || "",
        duration: info.duration || 0,
        thumbnail: info.thumbnail || null,
        uploader: info.uploader || info.channel || info.playlist_uploader || i18next3.t("error.unknown"),
        extractor: info.extractor || i18next3.t("error.unknown"),
        webpage_url: info.webpage_url || fallbackUrl,
        id: info.id || null
      };
    }
    function sanitizeFilename(filename) {
      let str = typeof filename === "string" && filename.trim().length > 0 ? filename : "";
      if (!str) {
        try {
          if (typeof i18next3 !== "undefined" && typeof i18next3.t === "function") {
            const res = i18next3.t("error.untitledVideo");
            if (typeof res === "string" && res.length > 0)
              str = res;
          }
        } catch (e) {
        }
      }
      if (!str || typeof str !== "string") {
        str = "Untitled Video";
      }
      return str.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled Video";
    }
    function getTempDir() {
      const tempDir = path.join(os.tmpdir(), "eagle-video-downloader");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      return tempDir;
    }
    async function downloadVideo(url, onProgress, onStatus, preloadedInfo = null) {
      await validateUrl(url);
      let videoInfo;
      if (preloadedInfo) {
        videoInfo = preloadedInfo;
      } else {
        if (onStatus)
          onStatus(i18next3.t("download.fetchingInfo"));
        try {
          videoInfo = await getVideoInfo(url);
          if (onStatus && videoInfo && videoInfo.title) {
            const foundMsg = typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("download.foundVideo") : "Found Video";
            onStatus(`${foundMsg}: ${videoInfo.title}`);
          }
        } catch (error) {
          videoInfo = {
            title: typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("error.untitledVideo") : "Untitled Video",
            extractor: typeof i18next3 !== "undefined" && i18next3.t ? i18next3.t("error.unknown") : "Unknown"
          };
        }
      }
      const images = videoInfo ? Array.isArray(videoInfo.images) && videoInfo.images.length ? videoInfo.images : videoInfo.type === "image" && videoInfo.imageUrl ? [videoInfo.imageUrl] : [] : [];
      if (images.length) {
        const outputDir2 = getTempDir();
        const sanitizedTitle2 = sanitizeFilename(videoInfo.title);
        if (onStatus)
          onStatus(i18next3.t("ui.downloading"));
        const results = [];
        for (let index = 0; index < images.length; index++) {
          const imageUrl = images[index];
          await validateUrl(imageUrl);
          const urlPath = new URL(imageUrl).pathname;
          const ext = path.extname(urlPath) || ".jpg";
          const suffix = images.length > 1 ? "_" + (index + 1) : "";
          const filename = sanitizedTitle2 + suffix + ext;
          const outputPath = path.join(outputDir2, filename);
          const imageProgress = images.length > 1 ? void 0 : onProgress;
          try {
            await execYtDlp([imageUrl, "-o", outputPath, "--no-warnings"], imageProgress, null, false);
            if (!fs.existsSync(outputPath))
              throw new Error("image not written");
          } catch (e) {
            await downloadFile(imageUrl, outputPath, imageProgress);
          }
          results.push({ path: outputPath, metadata: videoInfo, filename });
        }
        return results;
      }
      const directVideos = videoInfo && Array.isArray(videoInfo.videoUrls) ? videoInfo.videoUrls.filter((item) => typeof item === "string" && item.startsWith("https://")) : [];
      if (directVideos.length > 1) {
        const multiDir = getTempDir();
        const multiTitle = sanitizeFilename(videoInfo.title);
        if (onStatus)
          onStatus(i18next3.t("ui.downloading"));
        const multiResults = [];
        for (let index = 0; index < directVideos.length; index++) {
          const videoUrl = directVideos[index];
          await validateUrl(videoUrl);
          const filename = `${multiTitle}_${index + 1}.mp4`;
          const outputPath = path.join(multiDir, filename);
          await execYtDlp([videoUrl, "-o", outputPath, "--no-warnings", "--merge-output-format", "mp4"], void 0, null, false);
          if (!fs.existsSync(outputPath))
            throw new Error(i18next3.t("error.fileNotFound"));
          multiResults.push({ path: outputPath, metadata: videoInfo, filename });
        }
        return multiResults;
      }
      const outputDir = getTempDir();
      const sanitizedTitle = sanitizeFilename(videoInfo.title);
      const outputTemplate = path.join(outputDir, `${sanitizedTitle}_%(autonumber)s.%(ext)s`);
      let targetUrl = videoInfo && typeof videoInfo.webpage_url === "string" && videoInfo.webpage_url.startsWith("https") ? videoInfo.webpage_url : url;
      targetUrl = siteAdapters.normalizeUrl(targetUrl);
      await validateUrl(targetUrl);
      if (videoInfo && videoInfo.derivedFrom === "pinterest") {
        siteAdapters.assertDerivedHostAllowed(targetUrl);
      }
      const formatSelector = buildFormatSelector(maxResolution, maxFramerate);
      const args = [
        targetUrl,
        "-o",
        outputTemplate,
        "-f",
        formatSelector,
        "--merge-output-format",
        "mp4",
        "--no-warnings",
        ...siteAdapters.getSiteArgs(targetUrl)
      ];
      if (threadCount > 0) {
        args.push("-N", String(threadCount));
      }
      const ffmpeg = getFfmpegPath();
      if (ffmpeg && fs.existsSync(ffmpeg)) {
        args.push("--ffmpeg-location", path.dirname(ffmpeg));
      }
      if (onStatus)
        onStatus(i18next3.t("ui.downloading"));
      const filesBefore = new Set(fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : []);
      let processingPhase = null;
      let processingWatcher = null;
      let pendingOutput = "";
      const handleOutput = (chunk) => {
        const text = pendingOutput + String(chunk || "");
        pendingOutput = text.slice(-32);
        let next = null;
        if (/\[Merger\]|Merging formats/i.test(text)) {
          next = "merge";
        } else if (/\[VideoConvertor\]|Converting video|\[Fixup/i.test(text)) {
          next = "convert";
        }
        if (next && next !== processingPhase) {
          processingPhase = next;
          if (onProgress)
            onProgress({ phase: next });
          if (!processingWatcher) {
            processingWatcher = startProcessingWatcher(outputDir, sanitizedTitle, onProgress);
          }
        }
      };
      try {
        await execYtDlp(args, onProgress, handleOutput, { targetUrl });
      } catch (error) {
        const message = String(error && error.message || "");
        const recoverable = /Postprocessing|Invalid data found|Error opening input/i.test(message);
        if (!recoverable)
          throw error;
        const retryArgs = args.slice();
        const mergeIndex = retryArgs.indexOf("--merge-output-format");
        if (mergeIndex >= 0)
          retryArgs.splice(mergeIndex, 2);
        const formatIndex = retryArgs.indexOf("-f");
        if (formatIndex >= 0)
          retryArgs[formatIndex + 1] = "b/best";
        await execYtDlp(retryArgs, onProgress, handleOutput, { targetUrl });
      } finally {
        if (processingWatcher)
          processingWatcher.stop();
      }
      const filesAfter = fs.readdirSync(outputDir);
      const newFiles = filesAfter.filter((f) => !filesBefore.has(f) && f.startsWith(sanitizedTitle));
      if (newFiles.length === 0) {
        throw new Error(i18next3.t("error.fileNotFound"));
      }
      return newFiles.map((filename) => ({
        path: path.join(outputDir, filename),
        metadata: videoInfo,
        filename
      }));
    }
    function cleanup(filePath) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
      }
    }
    module2.exports = {
      downloadVideo,
      getVideoInfo,
      cleanup,
      setQualityPrefs,
      setThreadCount,
      buildFormatSelector
    };
  }
});

// js/twitter-auth.js
var require_twitter_auth = __commonJS({
  "js/twitter-auth.js"(exports2, module2) {
    var { scopedKey } = require_library_context();
    var STORAGE_KEY = "eagle-video-downloader.twitterAuth";
    var PUBLIC_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
    function currentKey() {
      return scopedKey(STORAGE_KEY);
    }
    function migrateLegacyKey(key) {
      try {
        if (key === STORAGE_KEY)
          return;
        if (localStorage.getItem(key) === null) {
          const legacy = localStorage.getItem(STORAGE_KEY);
          if (legacy !== null)
            localStorage.setItem(key, legacy);
        }
      } catch (e) {
      }
    }
    function getStoredCookie() {
      try {
        const key = currentKey();
        migrateLegacyKey(key);
        return localStorage.getItem(key) || "";
      } catch (e) {
        return "";
      }
    }
    function setStoredCookie(value) {
      try {
        const key = currentKey();
        if (value) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      } catch (e) {
      }
    }
    function buildCookie(authToken, ct0) {
      const token = String(authToken || "").trim();
      const csrf = String(ct0 || "").trim();
      if (!token || !csrf)
        return "";
      return `auth_token=${token}; ct0=${csrf}`;
    }
    function splitCookie(raw) {
      const text = raw === void 0 ? getStoredCookie() : String(raw || "");
      const map = {};
      text.split(/;\s*/).forEach((pair) => {
        const index = pair.indexOf("=");
        if (index <= 0)
          return;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim().replace(/^"|"$/g, "");
        if (key && value)
          map[key] = value;
      });
      return { authToken: map.auth_token || "", ct0: map.ct0 || "", map };
    }
    function hasAuth(raw) {
      const parts = splitCookie(raw);
      return !!(parts.authToken && parts.ct0);
    }
    function getAuth(raw) {
      const parts = splitCookie(raw);
      if (!parts.authToken || !parts.ct0)
        return null;
      const cookie = `auth_token=${parts.authToken}; ct0=${parts.ct0}`;
      return {
        cookie,
        csrf: parts.ct0,
        headers: {
          cookie,
          authorization: "Bearer " + PUBLIC_BEARER,
          "x-csrf-token": parts.ct0,
          "x-twitter-auth-type": "OAuth2Session",
          "x-twitter-active-user": "yes",
          "x-twitter-client-language": "en",
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          accept: "application/json",
          referer: "https://x.com/"
        }
      };
    }
    module2.exports = {
      getStoredCookie,
      setStoredCookie,
      buildCookie,
      splitCookie,
      hasAuth,
      getAuth
    };
  }
});

// js/x-http.js
var require_x_http = __commonJS({
  "js/x-http.js"(exports2, module2) {
    var http = require("http");
    var https = require("https");
    var tls = require("tls");
    var { exec } = require("child_process");
    var cachedProxy;
    function parseProxy(value) {
      if (!value)
        return null;
      const text = String(value).trim();
      if (!text)
        return null;
      const withScheme = /^[a-z]+:\/\//i.test(text) ? text : "http://" + text;
      try {
        const url = new URL(withScheme);
        if (!url.hostname)
          return null;
        return { host: url.hostname, port: Number(url.port) || 80 };
      } catch (e) {
        return null;
      }
    }
    function detectProxyFromEnv() {
      return parseProxy(
        process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || process.env.ALL_PROXY || process.env.all_proxy
      );
    }
    function detectProxyFromRegistry() {
      return new Promise((resolve) => {
        if (process.platform !== "win32")
          return resolve(null);
        exec(
          'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
          { timeout: 5e3 },
          (error, stdout) => {
            if (error || !stdout)
              return resolve(null);
            const matched = stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
            if (!matched)
              return resolve(null);
            let value = matched[1].trim();
            const httpsPart = value.match(/https=([^;]+)/i);
            if (httpsPart) {
              value = httpsPart[1];
            } else if (value.includes("=")) {
              value = value.split(";")[0].split("=")[1] || value;
            }
            resolve(parseProxy(value));
          }
        );
      });
    }
    async function resolveProxy(manual) {
      const explicit = parseProxy(manual);
      if (explicit)
        return explicit;
      if (cachedProxy !== void 0)
        return cachedProxy;
      cachedProxy = detectProxyFromEnv() || await detectProxyFromRegistry() || null;
      return cachedProxy;
    }
    function collect(res, resolve) {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 8e6)
          res.destroy();
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }
    function requestDirect(url, headers) {
      return new Promise((resolve) => {
        const target = new URL(url);
        const req = https.request(
          {
            host: target.hostname,
            port: target.port || 443,
            path: target.pathname + target.search,
            method: "GET",
            headers: { ...headers, host: target.hostname }
          },
          (res) => collect(res, resolve)
        );
        req.on("error", (error) => resolve({ status: 0, error: error.message }));
        req.setTimeout(2e4, () => {
          req.destroy();
          resolve({ status: 0, error: "timeout" });
        });
        req.end();
      });
    }
    function requestViaProxy(url, headers, proxy) {
      const target = new URL(url);
      return new Promise((resolve) => {
        const connectReq = http.request({
          host: proxy.host,
          port: proxy.port,
          method: "CONNECT",
          path: target.hostname + ":443",
          headers: { Host: target.hostname + ":443" },
          timeout: 15e3
        });
        connectReq.on("connect", (res, socket) => {
          if (res.statusCode !== 200) {
            socket.destroy();
            resolve({ status: 0, error: "proxy CONNECT " + res.statusCode });
            return;
          }
          const tlsSocket = tls.connect({ socket, servername: target.hostname });
          tlsSocket.on("error", (error) => resolve({ status: 0, error: "tls " + error.message }));
          tlsSocket.on("secureConnect", () => {
            const req = https.request(
              {
                host: target.hostname,
                port: 443,
                path: target.pathname + target.search,
                method: "GET",
                createConnection: () => tlsSocket,
                headers: { ...headers, host: target.hostname }
              },
              (response) => collect(response, resolve)
            );
            req.on("error", (error) => resolve({ status: 0, error: error.message }));
            req.setTimeout(2e4, () => {
              req.destroy();
              resolve({ status: 0, error: "timeout" });
            });
            req.end();
          });
        });
        connectReq.on("error", (error) => resolve({ status: 0, error: "proxy " + error.message }));
        connectReq.on("timeout", () => {
          connectReq.destroy();
          resolve({ status: 0, error: "proxy timeout" });
        });
        connectReq.end();
      });
    }
    async function getJson(url, { headers = {}, proxy } = {}) {
      const resolved = await resolveProxy(proxy);
      let result = resolved ? await requestViaProxy(url, headers, resolved) : await requestDirect(url, headers);
      if (resolved && !result.status) {
        const direct = await requestDirect(url, headers);
        if (direct.status)
          result = direct;
      }
      if (result.body) {
        try {
          result.json = JSON.parse(result.body);
        } catch (e) {
          result.json = null;
        }
      }
      return result;
    }
    function requestBufferDirect(url, headers) {
      return new Promise((resolve) => {
        const target = new URL(url);
        const req = https.request(
          {
            host: target.hostname,
            port: target.port || 443,
            path: target.pathname + target.search,
            method: "GET",
            headers: { ...headers, host: target.hostname }
          },
          (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
              chunks.push(chunk);
              if (chunks.reduce((sum, item) => sum + item.length, 0) > 2e6)
                res.destroy();
            });
            res.on("end", () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
          }
        );
        req.on("error", (error) => resolve({ status: 0, error: error.message }));
        req.setTimeout(2e4, () => {
          req.destroy();
          resolve({ status: 0, error: "timeout" });
        });
        req.end();
      });
    }
    function requestBufferViaProxy(url, headers, proxy) {
      const target = new URL(url);
      return new Promise((resolve) => {
        const connectReq = http.request({
          host: proxy.host,
          port: proxy.port,
          method: "CONNECT",
          path: target.hostname + ":443",
          headers: { Host: target.hostname + ":443" },
          timeout: 15e3
        });
        connectReq.on("connect", (res, socket) => {
          if (res.statusCode !== 200) {
            socket.destroy();
            resolve({ status: 0, error: "proxy CONNECT " + res.statusCode });
            return;
          }
          const tlsSocket = tls.connect({ socket, servername: target.hostname });
          tlsSocket.on("error", (error) => resolve({ status: 0, error: "tls " + error.message }));
          tlsSocket.on("secureConnect", () => {
            const req = https.request(
              {
                host: target.hostname,
                port: 443,
                path: target.pathname + target.search,
                method: "GET",
                createConnection: () => tlsSocket,
                headers: { ...headers, host: target.hostname }
              },
              (response) => {
                const chunks = [];
                response.on("data", (chunk) => {
                  chunks.push(chunk);
                  if (chunks.reduce((sum, item) => sum + item.length, 0) > 2e6)
                    response.destroy();
                });
                response.on(
                  "end",
                  () => resolve({ status: response.statusCode, buffer: Buffer.concat(chunks), contentType: response.headers["content-type"] })
                );
              }
            );
            req.on("error", (error) => resolve({ status: 0, error: error.message }));
            req.setTimeout(2e4, () => {
              req.destroy();
              resolve({ status: 0, error: "timeout" });
            });
            req.end();
          });
        });
        connectReq.on("error", (error) => resolve({ status: 0, error: "proxy " + error.message }));
        connectReq.on("timeout", () => {
          connectReq.destroy();
          resolve({ status: 0, error: "proxy timeout" });
        });
        connectReq.end();
      });
    }
    async function getRaw(url, { headers = {}, proxy } = {}) {
      const resolved = await resolveProxy(proxy);
      let result = resolved ? await requestBufferViaProxy(url, headers, resolved) : await requestBufferDirect(url, headers);
      if (resolved && !result.status) {
        const direct = await requestBufferDirect(url, headers);
        if (direct.status)
          result = direct;
      }
      return result;
    }
    module2.exports = {
      getJson,
      getRaw,
      parseProxy,
      resolveProxy,
      detectProxyFromEnv,
      detectProxyFromRegistry
    };
  }
});

// js/twitter-monitor.js
var require_twitter_monitor = __commonJS({
  "js/twitter-monitor.js"(exports2, module2) {
    var twitterAuth2 = require_twitter_auth();
    var { getJson, getRaw } = require_x_http();
    var { scopedKey } = require_library_context();
    var SEEN_KEY = "eagle-video-downloader.twitterSeen";
    var ENABLED_KEY = "eagle-video-downloader.twitterMonitorEnabled";
    var INTERVAL_KEY = "eagle-video-downloader.twitterMonitorInterval";
    var INTERVAL_MS_KEY = "eagle-video-downloader.twitterMonitorIntervalMs";
    var MIN_INTERVAL_MS = 12e4;
    var LIKES_KEY = "eagle-video-downloader.twitterMonitorLikes";
    var BOOKMARKS_KEY = "eagle-video-downloader.twitterMonitorBookmarks";
    var BASELINE_KEY = "eagle-video-downloader.twitterBaselineAt";
    var LAST_CHECK_KEY = "eagle-video-downloader.twitterLastCheckAt";
    var PROFILE_KEY = "eagle-video-downloader.twitterProfile";
    var MAX_SEEN = 5e3;
    var MAX_DOWNLOAD_PER_CYCLE = Number.MAX_SAFE_INTEGER;
    var MAX_CATCHUP_DOWNLOAD = Number.MAX_SAFE_INTEGER;
    var MAX_CATCHUP_PAGES = 200;
    var DEFAULT_INTERVAL_MINUTES = 10;
    var QUERY_IDS = {
      Viewer: "TpQxQtWMTMnIAMPlMGMqNw",
      Likes: "a6ZbplAY_XzbVt5jy_Ko_Q",
      Bookmarks: "jbqsfdzI0EMFHAtpEC6vyA"
    };
    var FEATURES = { rweb_video_screen_enabled: false };
    var timer = null;
    var running = false;
    var lastResult = null;
    var nextRunAt = 0;
    var currentIntervalMs = 0;
    function readJson(baseKey, fallback) {
      try {
        const key = scopedKey(baseKey);
        let raw = localStorage.getItem(key);
        if (raw === null) {
          const legacy = localStorage.getItem(baseKey);
          if (legacy !== null) {
            localStorage.setItem(key, legacy);
            raw = legacy;
          }
        }
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }
    function readNumber(baseKey) {
      try {
        const key = scopedKey(baseKey);
        let raw = localStorage.getItem(key);
        if (raw === null) {
          const legacy = localStorage.getItem(baseKey);
          if (legacy !== null) {
            localStorage.setItem(key, legacy);
            raw = legacy;
          }
        }
        return Number(raw) || 0;
      } catch (e) {
        return 0;
      }
    }
    function writeValue(baseKey, value) {
      try {
        localStorage.setItem(scopedKey(baseKey), String(value));
      } catch (e) {
      }
    }
    function readSeen() {
      const parsed = readJson(SEEN_KEY, []);
      return new Set(Array.isArray(parsed) ? parsed : []);
    }
    function writeSeen(set) {
      writeValue(SEEN_KEY, JSON.stringify(Array.from(set).slice(-MAX_SEEN)));
    }
    function getPrefs() {
      try {
        const savedMs = readNumber(INTERVAL_MS_KEY);
        const legacyMinutes = readNumber(INTERVAL_KEY);
        const ms = savedMs || (legacyMinutes ? legacyMinutes * 6e4 : DEFAULT_INTERVAL_MINUTES * 6e4);
        const readFlag = (key) => localStorage.getItem(scopedKey(key)) !== "0";
        return {
          enabled: localStorage.getItem(scopedKey(ENABLED_KEY)) === "1",
          ms: Math.max(MIN_INTERVAL_MS, ms || DEFAULT_INTERVAL_MINUTES * 6e4),
          likes: readFlag(LIKES_KEY),
          bookmarks: readFlag(BOOKMARKS_KEY)
        };
      } catch (e) {
        return { enabled: false, ms: DEFAULT_INTERVAL_MINUTES * 6e4, likes: true, bookmarks: true };
      }
    }
    function setPrefs(patch) {
      if (typeof patch.enabled === "boolean")
        writeValue(ENABLED_KEY, patch.enabled ? "1" : "0");
      if (patch.ms)
        writeValue(INTERVAL_MS_KEY, Math.max(MIN_INTERVAL_MS, Number(patch.ms) || 0));
      if (typeof patch.likes === "boolean")
        writeValue(LIKES_KEY, patch.likes ? "1" : "0");
      if (typeof patch.bookmarks === "boolean")
        writeValue(BOOKMARKS_KEY, patch.bookmarks ? "1" : "0");
    }
    function getBaselineAt() {
      return readNumber(BASELINE_KEY);
    }
    function setBaselineAt(value) {
      writeValue(BASELINE_KEY, value || 0);
    }
    function getLastCheckAt() {
      return readNumber(LAST_CHECK_KEY);
    }
    function setLastCheckAt(value) {
      writeValue(LAST_CHECK_KEY, value || Date.now());
    }
    function describeError(result) {
      if (result.status === 401 || result.status === 403)
        return "cookie \u65E0\u6548\u6216\u5DF2\u8FC7\u671F";
      if (result.status === 404)
        return "X \u63A5\u53E3\u5DF2\u66F4\u65B0\uFF08queryId \u5931\u6548\uFF09";
      if (result.status === 422)
        return "\u8BF7\u6C42\u53C2\u6570\u88AB\u62D2\u7EDD";
      if (result.status === 429)
        return "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF08429\uFF09";
      if (result.status === 0)
        return "\u7F51\u7EDC\u9519\u8BEF\uFF08\u53EF\u80FD\u9700\u8981\u4EE3\u7406\uFF09" + (result.error ? "\uFF1A" + result.error : "");
      return "HTTP " + result.status;
    }
    function findTweetIds(node, out, depth) {
      if (!node || depth > 14)
        return;
      if (Array.isArray(node)) {
        for (const item of node)
          findTweetIds(item, out, depth + 1);
        return;
      }
      if (typeof node !== "object")
        return;
      const result = node.tweet_results && node.tweet_results.result;
      if (result) {
        const legacy = result.legacy || result;
        const id = legacy.id_str || legacy.rest_id || result.rest_id;
        if (id && /^\d+$/.test(String(id)))
          out.push(String(id));
      }
      for (const key of Object.keys(node)) {
        if (key === "tweet_results")
          continue;
        findTweetIds(node[key], out, depth + 1);
      }
    }
    function extractTimeline(json) {
      const instructions = [];
      const visit = (node, depth) => {
        if (!node || depth > 8)
          return;
        if (Array.isArray(node)) {
          node.forEach((item) => visit(item, depth + 1));
          return;
        }
        if (typeof node !== "object")
          return;
        if (Array.isArray(node.instructions))
          instructions.push(...node.instructions);
        for (const key of Object.keys(node)) {
          if (key !== "instructions")
            visit(node[key], depth + 1);
        }
      };
      visit(json, 0);
      const items = [];
      let cursor = null;
      for (const instruction of instructions) {
        if (!instruction)
          continue;
        if (instruction.cursorType === "Bottom" && instruction.value)
          cursor = instruction.value;
        if (!Array.isArray(instruction.entries))
          continue;
        for (const entry of instruction.entries) {
          if (!entry)
            continue;
          const content = entry.content || {};
          const itemContent = content.itemContent;
          const tweet = itemContent && itemContent.tweet_results && itemContent.tweet_results.result;
          if (tweet) {
            const legacy = tweet.legacy || tweet;
            const id = legacy.id_str || legacy.rest_id || tweet.rest_id;
            const createdAt = legacy.created_at ? Date.parse(legacy.created_at) : 0;
            if (id)
              items.push({ id: String(id), createdAt });
          }
          if (typeof entry.entryId === "string" && entry.entryId.startsWith("cursor-bottom") && content.value) {
            cursor = content.value;
          }
        }
      }
      return { items, cursor };
    }
    function findUserLegacy(node, depth) {
      if (!node || depth > 10)
        return null;
      if (Array.isArray(node)) {
        for (const item of node) {
          const found = findUserLegacy(item, depth + 1);
          if (found)
            return found;
        }
        return null;
      }
      if (typeof node !== "object")
        return null;
      if (node.legacy && typeof node.legacy === "object" && node.legacy.screen_name)
        return node.legacy;
      for (const key of Object.keys(node)) {
        const found = findUserLegacy(node[key], depth + 1);
        if (found)
          return found;
      }
      return null;
    }
    function normalizeProfile(legacy, fallbackId) {
      const avatar = legacy && (legacy.profile_image_url_https || legacy.profile_image_url || legacy.image_url);
      return {
        id: legacy && legacy.id_str || fallbackId || "",
        screenName: legacy && legacy.screen_name || "",
        name: legacy && legacy.name || "",
        avatar: typeof avatar === "string" ? avatar.replace("_normal.", "_200x200.") : ""
      };
    }
    async function withAvatarData(profile) {
      if (!profile || !profile.avatar)
        return profile;
      try {
        const result = await getRaw(profile.avatar, {
          headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            accept: "image/*"
          }
        });
        if (result.status === 200 && result.buffer && result.buffer.length) {
          const type = String(result.contentType || "image/jpeg").split(";")[0];
          const dataUrl = "data:" + type + ";base64," + result.buffer.toString("base64");
          if (dataUrl.length < 4e5)
            profile.avatarData = dataUrl;
        }
      } catch (e) {
      }
      return profile;
    }
    function saveProfile(profile) {
      try {
        writeValue(PROFILE_KEY, JSON.stringify(profile || {}));
      } catch (e) {
      }
    }
    function getSavedProfile() {
      const parsed = readJson(PROFILE_KEY, null);
      return parsed && typeof parsed === "object" ? parsed : null;
    }
    async function getProfile(auth) {
      const url = "https://x.com/i/api/graphql/" + QUERY_IDS.Viewer + "/Viewer?variables=%7B%7D&features=%7B%7D";
      const result = await getJson(url, { headers: auth.headers });
      if (result.status !== 200 || !result.json) {
        return { ok: false, status: result.status, error: describeError(result) };
      }
      const body = result.body || "";
      const idMatch = body.match(/"rest_id":"(\d+)"/);
      const legacy = findUserLegacy(result.json, 0);
      const profile = normalizeProfile(legacy, idMatch ? idMatch[1] : "");
      if (!profile.screenName) {
        const matched = body.match(/"screen_name":"([^"]+)"/);
        if (matched)
          profile.screenName = matched[1];
      }
      if (!profile.name) {
        const matched = body.match(/"name":"((?:[^"\\]|\\.)+)"/);
        if (matched)
          profile.name = matched[1].replace(/\\"/g, '"');
      }
      if (!profile.avatar) {
        const matched = body.match(/"(?:profile_image_url_https|image_url)":"([^"]+)"/);
        if (matched)
          profile.avatar = matched[1].replace(/\\\//g, "/").replace("_normal.", "_200x200.");
      }
      return { ok: true, ...profile };
    }
    function endpoointUrl(kind, variables) {
      const op = kind === "likes" ? "Likes" : "Bookmarks";
      return "https://x.com/i/api/graphql/" + QUERY_IDS[op] + "/" + op + "?variables=" + encodeURIComponent(JSON.stringify(variables)) + "&features=" + encodeURIComponent(JSON.stringify(FEATURES));
    }
    async function fetchPage(auth, kind, userId, cursor, count) {
      const variables = kind === "likes" ? {
        userId,
        count,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true
      } : { count, includePromotedContent: true };
      if (cursor)
        variables.cursor = cursor;
      const result = await getJson(endpoointUrl(kind, variables), { headers: auth.headers });
      if (result.status !== 200 || !result.json) {
        return { ok: false, status: result.status, error: describeError(result), items: [], cursor: null };
      }
      const timeline = extractTimeline(result.json);
      return { ok: true, items: timeline.items, cursor: timeline.cursor };
    }
    async function fetchLikes(auth, userId, count) {
      const page = await fetchPage(auth, "likes", userId, null, count);
      if (!page.ok)
        return page;
      return { ok: true, items: Array.from(new Set(page.items.map((item) => item.id))).map((id) => ({ id, source: "like" })) };
    }
    async function fetchBookmarks(auth, count) {
      const page = await fetchPage(auth, "bookmarks", "", null, count);
      if (!page.ok)
        return page;
      return { ok: true, items: Array.from(new Set(page.items.map((item) => item.id))).map((id) => ({ id, source: "bookmark" })) };
    }
    async function fetchSince(auth, kind, userId, since, maxPages) {
      const collected = [];
      let cursor = null;
      let reachedOld = false;
      for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        const page = await fetchPage(auth, kind, userId, cursor, 20);
        if (!page.ok)
          return { ok: false, error: page.error, items: collected };
        if (!page.items.length)
          break;
        for (const item of page.items) {
          if (item.createdAt && item.createdAt < since) {
            reachedOld = true;
            continue;
          }
          collected.push(item);
        }
        cursor = page.cursor;
        if (reachedOld || !cursor)
          break;
      }
      return { ok: true, items: collected };
    }
    var defaultApi = { getProfile, fetchLikes, fetchBookmarks, fetchSince };
    async function pollOnce(options = {}) {
      const { baselineOnly = false, api = defaultApi } = options;
      const auth = twitterAuth2.getAuth();
      if (!auth)
        return { ok: false, error: "no-cookie" };
      const profile = await api.getProfile(auth);
      if (!profile.ok)
        return { ok: false, error: profile.error, status: profile.status };
      const seen = readSeen();
      const isFirstRun = !getBaselineAt();
      const prefs = getPrefs();
      const collected = [];
      const likes = prefs.likes ? await api.fetchLikes(auth, profile.id, 20) : { ok: true, items: [] };
      if (likes.ok)
        collected.push(...likes.items);
      const bookmarks = prefs.bookmarks ? await api.fetchBookmarks(auth, 20) : { ok: true, items: [] };
      if (bookmarks.ok)
        collected.push(...bookmarks.items);
      const fresh = collected.filter((item) => item.id && !seen.has(item.id));
      for (const item of collected)
        seen.add(item.id);
      writeSeen(seen);
      setLastCheckAt(Date.now());
      if (isFirstRun || baselineOnly) {
        setBaselineAt(Date.now());
        return {
          ok: true,
          baseline: true,
          screenName: profile.screenName,
          newCount: 0,
          likesOk: likes.ok,
          bookmarksOk: bookmarks.ok
        };
      }
      const toDownload = fresh.slice(0, MAX_DOWNLOAD_PER_CYCLE);
      for (const item of toDownload) {
        document.dispatchEvent(new CustomEvent("startDownload", { detail: { url: "https://x.com/i/status/" + item.id } }));
      }
      return {
        ok: true,
        screenName: profile.screenName,
        newCount: toDownload.length,
        likesOk: likes.ok,
        bookmarksOk: bookmarks.ok,
        likesError: likes.ok ? null : likes.error,
        bookmarksError: bookmarks.ok ? null : bookmarks.error
      };
    }
    async function catchUp(options = {}) {
      const { maxPages = MAX_CATCHUP_PAGES, maxDownload = MAX_CATCHUP_DOWNLOAD, api = defaultApi } = options;
      const auth = twitterAuth2.getAuth();
      if (!auth)
        return { ok: false, error: "no-cookie" };
      const lastCheck = getLastCheckAt();
      if (!lastCheck) {
        const baseline = await pollOnce({ baselineOnly: true });
        return { ok: true, baseline: true, newCount: 0, screenName: baseline.screenName };
      }
      const profile = await api.getProfile(auth);
      if (!profile.ok)
        return { ok: false, error: profile.error };
      const since = lastCheck - 6e4;
      const seen = readSeen();
      const prefs = getPrefs();
      const likes = prefs.likes ? await api.fetchSince(auth, "likes", profile.id, since, maxPages) : { ok: true, items: [] };
      const bookmarks = prefs.bookmarks ? await api.fetchSince(auth, "bookmarks", "", since, maxPages) : { ok: true, items: [] };
      const collected = [];
      if (likes.ok)
        collected.push(...likes.items.map((item) => ({ id: item.id, source: "like" })));
      if (bookmarks.ok)
        collected.push(...bookmarks.items.map((item) => ({ id: item.id, source: "bookmark" })));
      const unique = [];
      const seenIds = /* @__PURE__ */ new Set();
      for (const item of collected) {
        if (!item.id || seenIds.has(item.id) || seen.has(item.id))
          continue;
        seenIds.add(item.id);
        unique.push(item);
      }
      for (const item of unique)
        seen.add(item.id);
      writeSeen(seen);
      setLastCheckAt(Date.now());
      const toDownload = unique.slice(0, maxDownload);
      for (const item of toDownload) {
        document.dispatchEvent(new CustomEvent("startDownload", { detail: { url: "https://x.com/i/status/" + item.id } }));
      }
      return {
        ok: true,
        screenName: profile.screenName,
        newCount: toDownload.length,
        truncated: unique.length > toDownload.length,
        likesOk: likes.ok,
        bookmarksOk: bookmarks.ok,
        likesError: likes.ok ? null : likes.error,
        bookmarksError: bookmarks.ok ? null : bookmarks.error
      };
    }
    function markNextRun(intervalMs) {
      currentIntervalMs = intervalMs;
      nextRunAt = Date.now() + intervalMs;
    }
    async function runCycle() {
      if (running)
        return lastResult;
      running = true;
      try {
        lastResult = await pollOnce();
      } catch (error) {
        lastResult = { ok: false, error: error && error.message || "unknown" };
      } finally {
        running = false;
      }
      return lastResult;
    }
    function start(ms) {
      stop();
      const interval = Math.max(MIN_INTERVAL_MS, Number(ms) || DEFAULT_INTERVAL_MINUTES * 6e4);
      setPrefs({ enabled: true, ms: interval });
      runCycle();
      markNextRun(interval);
      timer = setInterval(runCycle, interval);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      setPrefs({ enabled: false });
      nextRunAt = 0;
      currentIntervalMs = 0;
    }
    function isRunning() {
      return !!timer;
    }
    function getStatus() {
      return {
        running: isRunning(),
        prefs: getPrefs(),
        baselineAt: getBaselineAt(),
        lastCheckAt: getLastCheckAt(),
        last: lastResult
      };
    }
    async function testConnection() {
      const auth = twitterAuth2.getAuth();
      if (!auth)
        return { ok: false, error: "no-cookie" };
      const profile = await getProfile(auth);
      if (!profile.ok)
        return profile;
      const likes = await fetchLikes(auth, profile.id, 3);
      const bookmarks = await fetchBookmarks(auth, 3);
      await withAvatarData(profile);
      saveProfile(profile);
      return {
        ok: true,
        screenName: profile.screenName,
        name: profile.name,
        avatar: profile.avatar,
        avatarData: profile.avatarData || "",
        id: profile.id,
        likesOk: likes.ok,
        likesError: likes.ok ? null : likes.error,
        bookmarksOk: bookmarks.ok,
        bookmarksError: bookmarks.ok ? null : bookmarks.error
      };
    }
    async function fetchProfile() {
      const auth = twitterAuth2.getAuth();
      if (!auth)
        return { ok: false, error: "no-cookie" };
      const profile = await getProfile(auth);
      if (profile.ok) {
        await withAvatarData(profile);
        saveProfile(profile);
      }
      return profile;
    }
    async function init() {
      const prefs = getPrefs();
      if (!prefs.enabled || !twitterAuth2.hasAuth())
        return { ok: false, skipped: true };
      let result = null;
      try {
        result = await catchUp();
      } catch (error) {
        result = { ok: false, error: error && error.message || "unknown" };
      }
      const interval = Math.max(MIN_INTERVAL_MS, prefs.ms || DEFAULT_INTERVAL_MINUTES * 6e4);
      runCycle();
      if (timer)
        clearInterval(timer);
      markNextRun(interval);
      timer = setInterval(runCycle, interval);
      setPrefs({ enabled: true, ms: interval });
      return result;
    }
    function refreshForLibrary() {
      const wasRunning = isRunning();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      const prefs = getPrefs();
      if (prefs.enabled && twitterAuth2.hasAuth()) {
        runCycle();
        const interval = Math.max(MIN_INTERVAL_MS, prefs.ms);
        markNextRun(interval);
        timer = setInterval(runCycle, interval);
        return true;
      }
      return false;
    }
    module2.exports = {
      MIN_INTERVAL_MS,
      findTweetIds,
      extractTimeline,
      describeError,
      init,
      catchUp,
      start,
      stop,
      isRunning,
      getStatus,
      testConnection,
      pollOnce,
      runCycle,
      getPrefs,
      setPrefs,
      fetchProfile,
      getSavedProfile,
      saveProfile,
      getLastCheckAt,
      setLastCheckAt,
      setBaselineAt,
      refreshForLibrary
    };
  }
});

// js/ui.js
var require_ui = __commonJS({
  "js/ui.js"(exports2, module2) {
    var sankakuAuth2 = require_sankaku_auth();
    var twitterAuth2 = require_twitter_auth();
    var twitterMonitor2 = require_twitter_monitor();
    var { scopedKey } = require_library_context();
    var INTERVAL_CHOICE_KEY = "eagle-video-downloader.twitterIntervalChoice";
    function getIntervalChoice() {
      try {
        const raw = localStorage.getItem(scopedKey(INTERVAL_CHOICE_KEY));
        if (raw === null)
          return null;
        return Number(raw) || 0;
      } catch (e) {
        return null;
      }
    }
    function setIntervalChoice(minutes) {
      try {
        localStorage.setItem(scopedKey(INTERVAL_CHOICE_KEY), String(Number(minutes) || 0));
      } catch (e) {
      }
    }
    function updateTheme() {
      const THEME_SUPPORT = {
        AUTO: eagle.app.isDarkColors() ? "gray" : "light",
        LIGHT: "light",
        LIGHTGRAY: "lightgray",
        GRAY: "gray",
        DARK: "dark",
        BLUE: "blue",
        PURPLE: "purple"
      };
      const theme = eagle.app.theme.toUpperCase();
      const themeName = THEME_SUPPORT[theme] ?? "dark";
      const htmlEl = document.querySelector("html");
      htmlEl.classList.add("no-transition");
      htmlEl.setAttribute("theme", themeName);
      htmlEl.setAttribute("platform", eagle.app.platform);
      htmlEl.classList.remove("no-transition");
    }
    function showMainUI() {
      var _a;
      (_a = document.getElementById("mainContainer")) == null ? void 0 : _a.classList.remove("hidden");
    }
    function isValidUrl(string) {
      try {
        const url = new URL(string);
        return url.protocol === "https:";
      } catch (_) {
        return false;
      }
    }
    function setupInputBar() {
      const urlInput = document.getElementById("urlInput");
      const addButton = document.getElementById("addButton");
      if (!urlInput || !addButton)
        return;
      addButton.classList.add("disabled");
      urlInput.addEventListener("input", () => {
        setInputBarState("idle");
        addButton.classList.toggle("disabled", urlInput.value.trim().length === 0);
      });
      const handleSubmit = () => {
        const url = urlInput.value.trim();
        if (!url)
          return;
        if (!isValidUrl(url)) {
          setInputBarState("error", i18next.t("error.invalidUrl"));
          return;
        }
        document.dispatchEvent(new CustomEvent("startDownload", { detail: { url } }));
        urlInput.value = "";
        addButton.classList.add("disabled");
        setInputBarState("idle");
      };
      addButton.addEventListener("click", handleSubmit);
      urlInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter")
          handleSubmit();
      });
      const pasteButton = document.getElementById("pasteButton");
      if (pasteButton) {
        pasteButton.addEventListener("click", () => {
          let clipboardText = "";
          try {
            clipboardText = eagle && eagle.clipboard && typeof eagle.clipboard.readText === "function" ? eagle.clipboard.readText() : "";
          } catch (e) {
            clipboardText = "";
          }
          clipboardText = String(clipboardText || "").trim();
          const urlMatch = clipboardText.match(/https:\/\/[^\s"'<>]+/i);
          const value = urlMatch ? urlMatch[0] : clipboardText;
          if (!value)
            return;
          urlInput.value = value;
          urlInput.dispatchEvent(new Event("input", { bubbles: true }));
          handleSubmit();
        });
      }
    }
    function setInputBarState(state, errorMessage = "") {
      const addButton = document.getElementById("addButton");
      const buttonImg = addButton == null ? void 0 : addButton.querySelector("img");
      const tooltip = addButton == null ? void 0 : addButton.querySelector(".error-tooltip");
      addButton == null ? void 0 : addButton.classList.remove("error");
      if (tooltip)
        tooltip.textContent = "";
      if (buttonImg)
        buttonImg.src = "assets/icon_download.svg";
      if (state === "error") {
        addButton == null ? void 0 : addButton.classList.add("error");
        if (tooltip && errorMessage)
          tooltip.textContent = errorMessage;
        if (buttonImg)
          buttonImg.src = "assets/icon_error.svg";
      }
    }
    function canDeleteQueueItem(item) {
      return !!item && item.state !== "preparing" && item.state !== "downloading";
    }
    function removeQueueItem(id) {
      const el = document.querySelector(`.download-item[data-id="${id}"]`);
      if (el)
        el.remove();
    }
    function appendQueueItem(item) {
      const list = document.querySelector(".download-list");
      if (!list)
        return;
      list.appendChild(createQueueItemEl(item));
      list.scrollTop = list.scrollHeight;
    }
    function createQueueItemEl(item) {
      const el = document.createElement("div");
      el.className = `download-item ${item.state}`;
      el.dataset.id = item.id;
      const isError = item.state === "error";
      el.innerHTML = `
    <button class="item-delete" data-action="delete" data-id="${item.id}" title="${escapeHtml(i18next.t("queue.remove"))}">&#215;</button>
    <div class="item-title">${escapeHtml(item.title)}</div>
    <div class="item-progress-bar">
      <div class="item-progress-fill" style="width: ${item.progress}%"></div>
    </div>
    <div class="item-footer">
      <span class="item-meta">${escapeHtml(getMetaText(item))}</span>
      <div class="item-actions${isError ? "" : " hidden"}">
        <button class="item-action-btn" data-action="retry" data-id="${item.id}">${i18next.t("queue.retry")}</button>
        <button class="item-action-btn" data-action="copyError" data-id="${item.id}" id="copy-error-btn-${item.id}">${i18next.t("queue.copyError")}</button>
        <button class="item-action-btn" data-action="copy" data-id="${item.id}" id="copy-btn-${item.id}">${i18next.t("queue.copyUrl")}</button>
      </div>
    </div>
  `;
      return el;
    }
    function updateQueueItem(id, data) {
      const el = document.querySelector(`.download-item[data-id="${id}"]`);
      if (!el)
        return;
      el.className = `download-item ${data.state}`;
      const titleEl = el.querySelector(".item-title");
      if (titleEl)
        titleEl.textContent = data.title;
      const bar = el.querySelector(".item-progress-bar");
      const fill = el.querySelector(".item-progress-fill");
      const isProcessing = data.state === "downloading" && (data.phase === "merge" || data.phase === "convert");
      const hasProcessingPercent = isProcessing && typeof data.processingPercent === "number";
      const width = isProcessing ? hasProcessingPercent ? data.processingPercent : 100 : data.progress;
      if (bar)
        bar.classList.toggle("indeterminate", isProcessing && !hasProcessingPercent);
      if (fill)
        fill.style.width = `${Math.max(0, Math.min(100, width || 0))}%`;
      const footer = el.querySelector(".item-footer");
      if (footer) {
        const meta = footer.querySelector(".item-meta");
        if (meta)
          meta.textContent = getMetaText(data);
        const actions = footer.querySelector(".item-actions");
        if (actions)
          actions.classList.toggle("hidden", data.state !== "error");
        const deleteBtn = el.querySelector(".item-delete");
        if (deleteBtn)
          deleteBtn.disabled = !canDeleteQueueItem(data);
      }
    }
    function showCopiedFeedback(id) {
      const btn = document.getElementById(`copy-btn-${id}`);
      if (!btn)
        return;
      const original = btn.textContent;
      btn.textContent = i18next.t("queue.copied");
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    }
    function showCopiedErrorFeedback(id) {
      const btn = document.getElementById(`copy-error-btn-${id}`);
      if (!btn)
        return;
      const original = btn.textContent;
      btn.textContent = i18next.t("queue.copied");
      setTimeout(() => {
        btn.textContent = original;
      }, 1500);
    }
    function getMetaText(item) {
      if (item.state === "error") {
        return item.error || i18next.t("queue.error");
      }
      if (item.state === "completed") {
        return i18next.t("queue.completed");
      }
      if (item.phase === "merge" || item.phase === "convert") {
        const label = i18next.t(item.phase === "merge" ? "queue.merging" : "queue.converting");
        return typeof item.processingPercent === "number" ? `${label} ${Math.round(item.processingPercent)}%` : `${label}...`;
      }
      if (item.state === "downloading") {
        const parts = [];
        if (typeof item.progress === "number")
          parts.push(`${item.progress.toFixed(1)}%`);
        if (item.speed)
          parts.push(item.speed);
        if (item.eta)
          parts.push(`${i18next.t("queue.eta")} ${item.eta}`);
        return parts.join(" \xB7 ");
      }
      return "";
    }
    function escapeHtml(str) {
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function getDepCardEls(prefix) {
      return {
        statusEl: document.getElementById(`${prefix}Badge`),
        detailEl: document.getElementById(`${prefix}Detail`),
        progressWrap: document.getElementById(`${prefix}ProgressWrap`),
        progressFill: document.getElementById(`${prefix}ProgressFill`),
        actionsEl: document.getElementById(`${prefix}Actions`)
      };
    }
    function updateDepsBadge(hasNotice) {
      const badge = document.getElementById("depsBadge");
      if (!badge)
        return;
      badge.classList.toggle("hidden", !hasNotice);
    }
    function switchSubpageTab(tabName) {
      var _a, _b;
      const tabs = {
        settings: { btn: document.getElementById("tabBtnSettings"), panel: document.getElementById("settingsPanel") },
        dependencies: { btn: document.getElementById("tabBtnDeps"), panel: document.getElementById("depsPanel") },
        account: { btn: document.getElementById("tabBtnAccount"), panel: document.getElementById("accountPanel") }
      };
      for (const [name, item] of Object.entries(tabs)) {
        (_a = item.btn) == null ? void 0 : _a.classList.toggle("active", name === tabName);
        (_b = item.panel) == null ? void 0 : _b.classList.toggle("hidden", name !== tabName);
      }
    }
    function renderTwitterProfile(profile) {
      const box = document.getElementById("twitterProfile");
      if (!box)
        return;
      const data = profile || twitterMonitor2.getSavedProfile();
      if (!data || !data.screenName && !data.name) {
        box.classList.add("hidden");
        return;
      }
      const avatar = document.getElementById("twitterAvatar");
      const name = document.getElementById("twitterName");
      const handle = document.getElementById("twitterHandle");
      const avatarSrc = data.avatarData || data.avatar;
      if (avatar) {
        if (avatarSrc) {
          avatar.onerror = () => {
            avatar.style.display = "none";
          };
          avatar.src = avatarSrc;
          avatar.style.display = "";
        } else {
          avatar.removeAttribute("src");
          avatar.style.display = "none";
        }
      }
      if (name)
        name.textContent = data.name || data.screenName || "";
      if (handle)
        handle.textContent = data.screenName ? "@" + data.screenName : "";
      box.classList.remove("hidden");
    }
    function applySourceCheckboxes() {
      const likesBox = document.getElementById("twitterMonitorLikes");
      const bookmarksBox = document.getElementById("twitterMonitorBookmarks");
      const prefs = twitterMonitor2.getPrefs();
      if (likesBox)
        likesBox.checked = prefs.likes !== false;
      if (bookmarksBox)
        bookmarksBox.checked = prefs.bookmarks !== false;
    }
    function fitIntervalSelectWidth() {
      const select = document.getElementById("twitterMonitorInterval");
      if (!select)
        return;
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context)
          return;
        const style = typeof getComputedStyle === "function" ? getComputedStyle(select) : null;
        const font = style && style.font ? style.font : "12px sans-serif";
        context.font = font;
        let maxWidth = 0;
        for (const option of Array.from(select.options)) {
          maxWidth = Math.max(maxWidth, context.measureText(option.textContent || "").width);
        }
        if (maxWidth > 0) {
          const width = Math.ceil(maxWidth + 44);
          select.style.width = width + "px";
          const column = select.parentElement;
          if (column && column.classList.contains("setting-monitor-right")) {
            column.style.width = width + "px";
          }
        }
      } catch (e) {
      }
    }
    function applyIntervalSelect() {
      const select = document.getElementById("twitterMonitorInterval");
      if (!select)
        return;
      const prefs = twitterMonitor2.getPrefs();
      const savedChoice = getIntervalChoice();
      const minutes = savedChoice === null ? prefs.enabled ? Math.max(2, Math.round((prefs.ms || 6e5) / 6e4)) : 0 : savedChoice;
      const values = Array.from(select.options).map((option) => Number(option.value));
      let chosen = values.includes(minutes) ? minutes : 0;
      if (!chosen && minutes) {
        const positives = values.filter((value) => value > 0);
        chosen = positives.reduce((best, value) => Math.abs(value - minutes) < Math.abs(best - minutes) ? value : best, positives[0]);
      }
      select.value = String(chosen || 0);
      fitIntervalSelectWidth();
    }
    function refreshAccountFields() {
      const sankakuInput = document.getElementById("sankakuAuthInput");
      if (sankakuInput) {
        sankakuInput.value = sankakuAuth2.getStoredAuth();
        autoGrowTextarea(sankakuInput);
      }
      const sankakuStatus = document.getElementById("sankakuAuthStatus");
      if (sankakuStatus)
        sankakuStatus.textContent = "";
      const token = document.getElementById("twitterAuthToken");
      const ct0 = document.getElementById("twitterCt0");
      if (token || ct0) {
        const parts = twitterAuth2.splitCookie();
        if (token)
          token.value = parts.authToken;
        if (ct0)
          ct0.value = parts.ct0;
      }
      applyIntervalSelect();
      applySourceCheckboxes();
      const status = document.getElementById("twitterAuthStatus");
      if (status) {
        status.textContent = twitterAuth2.hasAuth() ? i18next.t("deps.twitterAuthReady") : "";
      }
      renderTwitterProfile();
    }
    function autoGrowTextarea(el) {
      if (!el)
        return;
      el.style.height = "auto";
      el.style.height = Math.max(38, el.scrollHeight) + "px";
    }
    function showDepsPage({ tab = "settings", gating = false, autoAddSourcePref = true, maxResolutionPref = "auto", maxFrameratePref = "auto", threadCountPref = "auto" } = {}) {
      var _a, _b;
      const tabBtnSettings = document.getElementById("tabBtnSettings");
      const tabBtnDeps = document.getElementById("tabBtnDeps");
      const tabBtnAccount = document.getElementById("tabBtnAccount");
      const autoAddLabel = document.getElementById("autoAddSourceLabel");
      const autoAddHint = document.getElementById("autoAddSourceHint");
      const autoAddToggle = document.getElementById("autoAddSourceToggle");
      const maxResLabel = document.getElementById("maxResolutionLabel");
      const maxResHint = document.getElementById("maxResolutionHint");
      const maxResSelect = document.getElementById("maxResolutionSelect");
      const maxFpsLabel = document.getElementById("maxFramerateLabel");
      const maxFpsHint = document.getElementById("maxFramerateHint");
      const maxFpsSelect = document.getElementById("maxFramerateSelect");
      const threadLabel = document.getElementById("threadCountLabel");
      const threadHint = document.getElementById("threadCountHint");
      const threadSelect = document.getElementById("threadCountSelect");
      const notice = document.getElementById("depsNotice");
      const ytdlpDesc = document.getElementById("ytdlpDesc");
      const ffmpegDesc = document.getElementById("ffmpegDesc");
      if (tabBtnSettings)
        tabBtnSettings.textContent = i18next.t("deps.tabSettings");
      if (tabBtnDeps)
        tabBtnDeps.textContent = i18next.t("deps.tabDependencies");
      if (autoAddLabel)
        autoAddLabel.textContent = i18next.t("deps.autoAddSourceLabel");
      if (autoAddHint)
        autoAddHint.textContent = i18next.t("deps.autoAddSourceHint");
      if (autoAddToggle)
        autoAddToggle.checked = autoAddSourcePref;
      if (maxResLabel)
        maxResLabel.textContent = i18next.t("deps.maxResolutionLabel");
      if (maxResHint)
        maxResHint.textContent = i18next.t("deps.maxResolutionHint");
      if (maxResSelect) {
        if (maxResSelect.options[0])
          maxResSelect.options[0].textContent = i18next.t("deps.resAuto");
        maxResSelect.value = maxResolutionPref || "auto";
      }
      if (maxFpsLabel)
        maxFpsLabel.textContent = i18next.t("deps.maxFramerateLabel");
      if (maxFpsHint)
        maxFpsHint.textContent = i18next.t("deps.maxFramerateHint");
      if (maxFpsSelect) {
        if (maxFpsSelect.options[0])
          maxFpsSelect.options[0].textContent = i18next.t("deps.fpsAuto");
        maxFpsSelect.value = maxFrameratePref || "auto";
      }
      if (threadLabel)
        threadLabel.textContent = i18next.t("deps.threadCountLabel");
      if (threadHint)
        threadHint.textContent = i18next.t("deps.threadCountHint");
      if (threadSelect) {
        if (threadSelect.options[0])
          threadSelect.options[0].textContent = i18next.t("deps.threadAuto");
        threadSelect.value = String(threadCountPref || "auto");
      }
      const authLabel = document.getElementById("sankakuAuthLabel");
      const authHint = document.getElementById("sankakuAuthHint");
      const authInput = document.getElementById("sankakuAuthInput");
      const authSave = document.getElementById("sankakuAuthSave");
      const authClear = document.getElementById("sankakuAuthClear");
      if (authLabel)
        authLabel.textContent = i18next.t("deps.sankakuAuthLabel");
      if (authHint)
        authHint.textContent = i18next.t("deps.sankakuAuthHint");
      if (authInput) {
        authInput.value = sankakuAuth2.getStoredAuth();
      }
      const sankakuTokenLabel = document.getElementById("sankakuAuthTokenLabel");
      if (sankakuTokenLabel)
        sankakuTokenLabel.textContent = "accessToken";
      if (tabBtnAccount)
        tabBtnAccount.textContent = i18next.t("deps.tabAccount");
      const twLabel = document.getElementById("twitterAuthLabel");
      const twHint = document.getElementById("twitterAuthHint");
      const twMonLabel = document.getElementById("twitterMonitorLabel");
      const twMonHint = document.getElementById("twitterMonitorHint");
      if (twLabel)
        twLabel.textContent = i18next.t("deps.twitterAuthLabel");
      if (twHint)
        twHint.textContent = i18next.t("deps.twitterAuthHint");
      if (twMonLabel)
        twMonLabel.textContent = i18next.t("deps.twitterMonitorLabel");
      if (twMonHint)
        twMonHint.textContent = i18next.t("deps.twitterMonitorHint");
      renderTwitterProfile();
      const twitterToken = document.getElementById("twitterAuthToken");
      const twitterCt0 = document.getElementById("twitterCt0");
      const twitterStatus = document.getElementById("twitterAuthStatus");
      const twitterInterval = document.getElementById("twitterMonitorInterval");
      if (twitterToken || twitterCt0) {
        const parts = twitterAuth2.splitCookie();
        if (twitterToken)
          twitterToken.value = parts.authToken;
        if (twitterCt0)
          twitterCt0.value = parts.ct0;
      }
      const twitterTokenLabel = document.getElementById("twitterAuthTokenLabel");
      const twitterCt0Label = document.getElementById("twitterCt0Label");
      if (twitterTokenLabel)
        twitterTokenLabel.textContent = "auth_token";
      if (twitterCt0Label)
        twitterCt0Label.textContent = "ct0";
      if (twitterStatus && !twitterStatus.textContent) {
        twitterStatus.textContent = twitterAuth2.hasAuth() ? i18next.t("deps.twitterAuthReady") : "";
      }
      if (twitterInterval) {
        const prefs = twitterMonitor2.getPrefs();
        twitterInterval.value = prefs.enabled ? String(prefs.minutes) : "0";
      }
      applyIntervalSelect();
      applySourceCheckboxes();
      const likesLabel = document.getElementById("twitterMonitorLikesLabel");
      const bookmarksLabel = document.getElementById("twitterMonitorBookmarksLabel");
      if (likesLabel)
        likesLabel.textContent = i18next.t("deps.twitterMonitorLikesLabel");
      if (bookmarksLabel)
        bookmarksLabel.textContent = i18next.t("deps.twitterMonitorBookmarksLabel");
      const twSaveBtn = document.getElementById("twitterAuthSave");
      const twClearBtn = document.getElementById("twitterAuthClear");
      if (twSaveBtn)
        twSaveBtn.textContent = i18next.t("deps.twitterAuthSave");
      if (twClearBtn)
        twClearBtn.textContent = i18next.t("deps.twitterAuthClear");
      const twMinHint = document.getElementById("twitterMonitorMinHint");
      if (twMinHint)
        twMinHint.textContent = i18next.t("deps.twitterMonitorMinHint");
      if (authSave)
        authSave.textContent = i18next.t("deps.sankakuAuthSave");
      if (authClear)
        authClear.textContent = i18next.t("deps.sankakuAuthClear");
      if (notice)
        notice.textContent = i18next.t("deps.setupRequired");
      if (ytdlpDesc)
        ytdlpDesc.textContent = i18next.t("deps.ytdlpDesc");
      if (ffmpegDesc)
        ffmpegDesc.textContent = i18next.t("deps.ffmpegDesc");
      switchSubpageTab(gating ? "dependencies" : tab);
      (_a = document.getElementById("depsContainer")) == null ? void 0 : _a.classList.remove("hidden");
      (_b = document.getElementById("mainContainer")) == null ? void 0 : _b.classList.add("hidden");
      setDepsGating(gating);
    }
    function setDepsGating(gating) {
      var _a, _b;
      (_a = document.querySelector(".subpage-header")) == null ? void 0 : _a.classList.toggle("hidden", gating);
      (_b = document.getElementById("depsNotice")) == null ? void 0 : _b.classList.toggle("hidden", !gating);
      if (gating) {
        switchSubpageTab("dependencies");
      }
    }
    function hideDepsPage() {
      var _a, _b;
      setDepsGating(false);
      (_a = document.getElementById("depsContainer")) == null ? void 0 : _a.classList.add("hidden");
      (_b = document.getElementById("mainContainer")) == null ? void 0 : _b.classList.remove("hidden");
    }
    function updateYtdlpCard(state, data = {}) {
      const { statusEl, detailEl, progressWrap, progressFill, actionsEl } = getDepCardEls("ytdlp");
      if (!statusEl)
        return;
      statusEl.className = "dep-badge";
      progressWrap == null ? void 0 : progressWrap.classList.add("hidden");
      switch (state) {
        case "checking":
          statusEl.classList.add("checking");
          statusEl.textContent = i18next.t("deps.checking");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "installed": {
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.installed");
          if (detailEl) {
            const versionPart = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
            const checkingPart = data.checkingUpdate ? i18next.t("deps.checkingUpdate") : "";
            detailEl.textContent = [versionPart, checkingPart].filter(Boolean).join("  \xB7  ");
          }
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        }
        case "latest":
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.latest");
          if (detailEl)
            detailEl.textContent = i18next.t("deps.versionInstalled", { version: data.version });
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        case "outdated":
          statusEl.classList.add("update");
          statusEl.textContent = i18next.t("deps.outdated");
          if (detailEl)
            detailEl.textContent = i18next.t("deps.versionUpdate", { from: data.installedVersion, to: data.latestVersion });
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="update">${i18next.t("deps.update")}</button>
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
        case "missing":
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.missing");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="install">${i18next.t("deps.install")}</button>
        `;
          }
          break;
        case "error":
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.downloadFailed");
          if (detailEl)
            detailEl.textContent = data.message || "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn primary" data-ytdlp-action="${data.retryAction || "install"}">${i18next.t("deps.retry")}</button>
        `;
          }
          break;
        case "busy": {
          statusEl.classList.add("busy");
          statusEl.textContent = data.statusText || i18next.t("deps.updating");
          const pct = Math.round(data.percent || 0);
          if (detailEl)
            detailEl.textContent = i18next.t("deps.progressText", { percent: pct });
          progressWrap == null ? void 0 : progressWrap.classList.remove("hidden");
          if (progressFill)
            progressFill.style.width = `${pct}%`;
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        }
        case "done":
          statusEl.classList.add("ok");
          statusEl.textContent = data.statusText || i18next.t("deps.doneInstalled");
          if (detailEl)
            detailEl.textContent = data.version ? i18next.t("deps.versionInstalled", { version: data.version }) : "";
          if (actionsEl) {
            actionsEl.innerHTML = `
          <button class="dep-btn" data-ytdlp-action="reinstall">${i18next.t("deps.reinstall")}</button>
          <button class="dep-btn danger" data-ytdlp-action="uninstall">${i18next.t("deps.uninstall")}</button>
        `;
          }
          break;
      }
    }
    function updateFfmpegCard(state, data = {}) {
      const { statusEl, detailEl, progressWrap, actionsEl } = getDepCardEls("ffmpeg");
      if (!statusEl)
        return;
      statusEl.className = "dep-badge";
      progressWrap == null ? void 0 : progressWrap.classList.add("hidden");
      switch (state) {
        case "checking":
          statusEl.classList.add("checking");
          statusEl.textContent = i18next.t("deps.checking");
          if (detailEl)
            detailEl.textContent = "";
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "eagle":
          statusEl.classList.add("ok");
          statusEl.textContent = i18next.t("deps.eagleBuiltin");
          if (detailEl) {
            detailEl.textContent = i18next.t("deps.ffmpegManaged");
          }
          if (actionsEl)
            actionsEl.innerHTML = "";
          break;
        case "missing":
        default:
          statusEl.classList.add("missing");
          statusEl.textContent = i18next.t("deps.notFound");
          if (detailEl) {
            detailEl.textContent = i18next.t("deps.ffmpegNotFoundHint");
          }
          if (actionsEl) {
            actionsEl.innerHTML = `<button class="dep-btn primary" data-ffmpeg-action="open-store">${i18next.t("deps.installFfmpegDep")}</button>`;
          }
          break;
      }
    }
    module2.exports = {
      updateTheme,
      showMainUI,
      isValidUrl,
      setupInputBar,
      setInputBarState,
      appendQueueItem,
      updateQueueItem,
      showCopiedFeedback,
      showCopiedErrorFeedback,
      canDeleteQueueItem,
      removeQueueItem,
      showDepsPage,
      hideDepsPage,
      setDepsGating,
      switchSubpageTab,
      autoGrowTextarea,
      refreshAccountFields,
      applyIntervalSelect,
      getIntervalChoice,
      setIntervalChoice,
      applySourceCheckboxes,
      renderTwitterProfile,
      updateDepsBadge,
      updateYtdlpCard,
      updateFfmpegCard
    };
  }
});

// Plugin/_locales/en.json
var require_en = __commonJS({
  "Plugin/_locales/en.json"(exports2, module2) {
    module2.exports = {
      manifest: {
        app: {
          name: "Video Downloader"
        }
      },
      ui: {
        appTitle: "Video Downloader",
        inputPlaceholder: "Paste any video URL...",
        downloadBtn: "Download",
        downloadingBtn: "Downloading...",
        preparing: "Preparing...",
        waiting: "Waiting...",
        downloading: "Downloading...",
        completed: "Complete",
        retry: "Retry",
        cancel: "Cancel",
        addToQueue: "Add to Queue",
        loading: "Loading...",
        successDownload: "Successful download",
        paste: "Paste from clipboard",
        pin: "Always on Top"
      },
      queue: {
        waiting: "Waiting...",
        preparing: "Fetching video info...",
        downloading: "Downloading",
        completed: "Completed",
        error: "Download failed",
        retry: "Retry",
        copyUrl: "Copy URL",
        copyError: "Copy Error",
        copied: "Copied!",
        eta: "ETA",
        merging: "Merging",
        converting: "Converting",
        remove: "Remove from list"
      },
      download: {
        fetchingInfo: "Fetching video information...",
        foundVideo: "Found video",
        complete: "Download complete, importing to Eagle...",
        importSuccess: "Import successful",
        failed: "Download failed"
      },
      error: {
        notInitialized: "Plugin not yet initialized",
        emptyUrl: "Please enter a video URL",
        invalidUrl: "Please enter a valid HTTPS video URL",
        fileNotFound: "Download complete but file not found",
        eagleImportFailed: "Failed to import to Eagle",
        duplicateFound: "This video already exists in library",
        checkingDuplicate: "Checking for duplicates...",
        clickToRedownload: "Click to re-download and import",
        eagleApiNotAvailable: "Eagle API not available",
        untitledVideo: "Untitled Video",
        downloadedVideo: "Downloaded Video",
        ytdlpNotInstalled: "yt-dlp not installed",
        ytdlpNotFound: "yt-dlp executable not found, please restart the plugin to re-download",
        ytdlpPermissionDenied: "yt-dlp has no execute permission",
        failedToExecuteYtdlp: "Failed to execute yt-dlp",
        ytdlpExitedWithCode: "yt-dlp exited with code",
        networkUnavailable: "Network unavailable \u2014 check your connection or proxy settings and retry",
        blockedAddress: "Access blocked \u2014 this address is not allowed",
        unsupportedUrl: "Unsupported website or link \u2014 please verify that the platform is supported",
        dribbbleProtected: "Dribbble pages are bot-protected. Please right-click the video in your browser, copy the direct video URL (.mp4), and paste it here",
        dribbbleExtractFailed: "Failed to extract Dribbble shot content, please check your network or copy the direct video URL from browser",
        dribbbleNoMedia: "No downloadable video or image found in this Dribbble shot",
        sankakuExtractFailed: "Failed to read Sankaku post data, please check your network and try again",
        sankakuRateLimited: "Sankaku API rate limit reached, please wait a minute and retry",
        sankakuNotFound: "Sankaku post not found - the link may be wrong or the post was deleted",
        sankakuUnavailable: "This Sankaku post is unavailable (deleted or restricted)",
        sankakuLoginRequired: "This Sankaku post requires a signed-in account to download",
        sankakuNoMedia: "No downloadable video or image found in this Sankaku post",
        videoUnavailable: "Video is unavailable or has been removed",
        privateVideo: "This video is private or requires sign-in",
        unknown: "Unknown",
        sankakuLoginOrDeleted: "Sankaku post not found for anonymous requests; it may require login or be deleted. Add your account cookie in Settings -> Sankaku Account.",
        sankakuAuthExpired: "Sankaku login expired. Please update the account cookie in Settings -> Sankaku Account."
      },
      progress: {
        remaining: "Remaining"
      },
      update: {
        available: "New yt-dlp version available ({{version}})",
        clickToUpdate: "Update",
        updating: "Updating... {{percent}}%",
        done: "\u2713 Updated to latest version"
      },
      deps: {
        title: "Settings & Dependencies",
        tabSettings: "Settings",
        tabDependencies: "Dependencies",
        sectionPreferences: "Preferences",
        sectionEngines: "Core Engines",
        autoAddSourceLabel: "Auto-set Eagle Data Source",
        autoAddSourceHint: "When enabled, original web URLs are automatically saved to Eagle items",
        maxResolutionLabel: "Max Resolution",
        maxResolutionHint: "Limit the maximum video resolution. If not available, automatically falls back to the highest available resolution.",
        maxFramerateLabel: "Max Frame Rate",
        maxFramerateHint: "Limit the maximum frame rate. If not available, automatically falls back to the highest available frame rate.",
        resAuto: "Auto (Best)",
        fpsAuto: "Auto (Best)",
        setupRequired: "These components are required for first-time use. The main view will open automatically once setup is complete.",
        back: "Back",
        ytdlpDesc: "Video extraction & download engine",
        ffmpegDesc: "Video merging & transcoding engine",
        ffmpegManaged: "Managed by Eagle, no action needed",
        ffmpegNotFoundHint: "Eagle built-in FFmpeg plugin not found. Please click the button below to install it.",
        ffmpegUnsupported: "Eagle official FFmpeg plugin is required for audio/video merging",
        installFfmpegDep: "Install FFmpeg Dependency",
        checking: "Checking...",
        installed: "Installed",
        checkingUpdate: "Checking for updates...",
        latest: "Up to date",
        outdated: "Update",
        missing: "Not installed",
        eagleBuiltin: "Eagle built-in",
        notFound: "Not found",
        installing: "Installing...",
        updating: "Updating...",
        reinstalling: "Reinstalling...",
        doneInstalled: "Installed",
        doneUpdated: "Updated",
        doneReinstalled: "Reinstalled",
        install: "Install",
        update: "Update",
        reinstall: "Reinstall",
        uninstall: "Uninstall",
        retry: "Retry",
        downloadFailed: "Download failed",
        versionInstalled: "Version: {{version}}",
        versionUpdate: "{{from}} \u2192 {{to}}",
        progressText: "Downloading... {{percent}}%",
        threadCountLabel: "Download Threads",
        threadCountHint: "Concurrent fragments for HLS/DASH. Not always faster; direct MP4 stays single-connection.",
        threadAuto: "Auto (Default)",
        sankakuAuthLabel: "Sankaku Account",
        sankakuAuthHint: "Paste the accessToken cookie (or JSON from get-cookies / Cookie-Editor) to download login-only posts.",
        sankakuAuthPlaceholder: '{"accessToken":"..."} or accessToken=...',
        sankakuAuthSave: "Save",
        sankakuAuthClear: "Clear",
        sankakuAuthSaved: "Saved. Login-only posts will use this session.",
        sankakuAuthCleared: "Cleared.",
        sankakuAuthInvalid: "No accessToken found in the pasted text.",
        tabAccount: "Accounts",
        twitterAuthLabel: "Twitter / X Account",
        twitterAuthHint: "Copy auth_token and ct0 from the browser cookies of a logged-in x.com session.",
        twitterAuthReady: "Cookie saved",
        twitterAuthSaved: "Saved, account: {{name}}",
        twitterAuthInvalid: "Cookie needs both auth_token and ct0",
        twitterAuthCleared: "Cookie cleared",
        twitterAuthTesting: "Testing\u2026",
        twitterAuthFailed: "Connection failed: {{error}}",
        twitterMonitorLabel: "Auto fetch likes & bookmarks",
        twitterMonitorHint: "New likes and bookmarks are pushed to the download queue automatically.",
        twitterMonitorOn: "Fetching every {{interval}}",
        twitterMonitorOff: "Fetching is off",
        twitterCatchup: "Caught up {{count}} new posts since last session",
        twitterCatchupTruncated: "more pending in the next cycle",
        twitterAuthSave: "Save & Test",
        twitterAuthClear: "Clear",
        unitSeconds: "seconds",
        unitMinutes: "minutes",
        unitHours: "hours",
        twitterMonitorMinHint: "Recommended minimum: 2 minutes",
        twitterMonitorLikesLabel: "Fetch likes",
        twitterMonitorBookmarksLabel: "Fetch bookmarks",
        twitterMonitorNoSource: "Select at least one of fetch likes / fetch bookmarks",
        twitterIntervalOffLabel: "Off",
        sankakuAuthTesting: "Testing\u2026",
        monitorIdle: "Idle",
        monitorCountdown: "Next {{time}}",
        twitterFetching: "Fetching\u2026",
        twitterMonitorTest: "Fetch test"
      }
    };
  }
});

// Plugin/_locales/zh_CN.json
var require_zh_CN = __commonJS({
  "Plugin/_locales/zh_CN.json"(exports2, module2) {
    module2.exports = {
      manifest: {
        app: {
          name: "\u89C6\u9891\u4E0B\u8F7D\u5668"
        }
      },
      ui: {
        appTitle: "\u89C6\u9891\u4E0B\u8F7D\u5668",
        inputPlaceholder: "\u7C98\u8D34\u4EFB\u610F\u89C6\u9891\u94FE\u63A5...",
        downloadBtn: "\u4E0B\u8F7D",
        downloadingBtn: "\u4E0B\u8F7D\u4E2D...",
        preparing: "\u51C6\u5907\u4E2D...",
        waiting: "\u7B49\u5F85\u4E2D...",
        downloading: "\u4E0B\u8F7D\u4E2D...",
        completed: "\u5B8C\u6210",
        retry: "\u91CD\u8BD5",
        cancel: "\u53D6\u6D88",
        addToQueue: "\u6DFB\u52A0\u5230\u961F\u5217",
        loading: "\u52A0\u8F7D\u4E2D...",
        successDownload: "\u4E0B\u8F7D\u6210\u529F",
        paste: "\u7C98\u8D34\u526A\u8D34\u677F\u5185\u5BB9",
        pin: "\u7A97\u53E3\u7F6E\u9876"
      },
      queue: {
        waiting: "\u7B49\u5F85\u4E2D...",
        preparing: "\u83B7\u53D6\u89C6\u9891\u4FE1\u606F...",
        downloading: "\u4E0B\u8F7D\u4E2D",
        completed: "\u5DF2\u5B8C\u6210",
        error: "\u4E0B\u8F7D\u5931\u8D25",
        retry: "\u91CD\u8BD5",
        copyUrl: "\u590D\u5236\u94FE\u63A5",
        copyError: "\u590D\u5236\u9519\u8BEF",
        copied: "\u5DF2\u590D\u5236",
        eta: "\u5269\u4F59",
        merging: "\u5408\u5E76\u4E2D",
        converting: "\u8F6C\u7801\u4E2D",
        remove: "\u5220\u9664\u8BB0\u5F55"
      },
      download: {
        fetchingInfo: "\u6B63\u5728\u83B7\u53D6\u89C6\u9891\u4FE1\u606F...",
        foundVideo: "\u627E\u5230\u89C6\u9891",
        complete: "\u4E0B\u8F7D\u5B8C\u6210\uFF0C\u6B63\u5728\u5BFC\u5165 Eagle...",
        importSuccess: "\u5BFC\u5165\u6210\u529F",
        failed: "\u4E0B\u8F7D\u5931\u8D25"
      },
      error: {
        notInitialized: "\u63D2\u4EF6\u5C1A\u672A\u521D\u59CB\u5316\u5B8C\u6210",
        emptyUrl: "\u8BF7\u8F93\u5165\u89C6\u9891\u94FE\u63A5",
        invalidUrl: "\u8BF7\u8F93\u5165\u6709\u6548\u7684 HTTPS \u89C6\u9891\u94FE\u63A5",
        fileNotFound: "\u4E0B\u8F7D\u5B8C\u6210\u4F46\u627E\u4E0D\u5230\u6587\u4EF6",
        eagleImportFailed: "\u5BFC\u5165 Eagle \u5931\u8D25",
        duplicateFound: "\u8BE5\u89C6\u9891\u5DF2\u5B58\u5728\u4E8E\u5E93\u4E2D",
        checkingDuplicate: "\u6B63\u5728\u68C0\u67E5\u91CD\u590D...",
        clickToRedownload: "\u70B9\u51FB\u91CD\u65B0\u4E0B\u8F7D\u5E76\u5BFC\u5165",
        eagleApiNotAvailable: "Eagle API \u4E0D\u53EF\u7528",
        untitledVideo: "\u672A\u547D\u540D\u89C6\u9891",
        downloadedVideo: "\u5DF2\u4E0B\u8F7D\u89C6\u9891",
        ytdlpNotInstalled: "yt-dlp \u672A\u5B89\u88C5",
        ytdlpNotFound: "\u627E\u4E0D\u5230 yt-dlp \u6267\u884C\u6587\u4EF6\uFF0C\u8BF7\u91CD\u542F\u63D2\u4EF6\u91CD\u65B0\u4E0B\u8F7D",
        ytdlpPermissionDenied: "yt-dlp \u6CA1\u6709\u6267\u884C\u6743\u9650",
        failedToExecuteYtdlp: "\u6267\u884C yt-dlp \u5931\u8D25",
        ytdlpExitedWithCode: "yt-dlp \u9000\u51FA\uFF0C\u4EE3\u7801",
        networkUnavailable: "\u7F51\u7EDC\u4E0D\u53EF\u7528 \u2014\u2014 \u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216\u4EE3\u7406\u8BBE\u7F6E\u540E\u91CD\u8BD5",
        blockedAddress: "\u8BBF\u95EE\u88AB\u963B\u65AD \u2014\u2014 \u8BE5\u5730\u5740\u4E0D\u88AB\u5141\u8BB8",
        unsupportedUrl: "\u6682\u4E0D\u652F\u6301\u6B64\u7F51\u7AD9\u6216\u94FE\u63A5 \u2014\u2014 \u8BF7\u786E\u8BA4\u662F\u5426\u4E3A\u53D7\u652F\u6301\u7684\u89C6\u9891\u5E73\u53F0",
        dribbbleProtected: "Dribbble \u9875\u9762\u53D7\u9632\u722C\u4FDD\u62A4\u65E0\u6CD5\u76F4\u63A5\u89E3\u6790\uFF0C\u8BF7\u5728\u6D4F\u89C8\u5668\u4E2D\u53F3\u952E\u89C6\u9891\u590D\u5236\u300C\u89C6\u9891\u5730\u5740\u300D(.mp4) \u540E\u4E0B\u8F7D",
        dribbbleExtractFailed: "Dribbble \u5185\u5BB9\u89E3\u6790\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u6216\u5728\u6D4F\u89C8\u5668\u4E2D\u590D\u5236\u89C6\u9891\u76F4\u94FE",
        dribbbleNoMedia: "\u672A\u5728\u8BE5 Dribbble \u9875\u9762\u4E2D\u627E\u5230\u53EF\u4E0B\u8F7D\u7684\u89C6\u9891\u6216\u56FE\u7247",
        sankakuExtractFailed: "Sankaku \u6295\u7A3F\u89E3\u6790\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5",
        sankakuRateLimited: "Sankaku API \u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u7B49\u4E00\u5206\u949F\u518D\u8BD5",
        sankakuNotFound: "\u672A\u627E\u5230\u8BE5 Sankaku \u6295\u7A3F\uFF0C\u94FE\u63A5\u53EF\u80FD\u6709\u8BEF\u6216\u6295\u7A3F\u5DF2\u5220\u9664",
        sankakuUnavailable: "\u8BE5 Sankaku \u6295\u7A3F\u4E0D\u53EF\u7528\uFF08\u5DF2\u5220\u9664\u6216\u53D7\u9650\uFF09",
        sankakuLoginRequired: "\u8BE5 Sankaku \u6295\u7A3F\u9700\u8981\u767B\u5F55\u8D26\u53F7\u624D\u80FD\u4E0B\u8F7D",
        sankakuNoMedia: "\u672A\u5728\u8BE5 Sankaku \u6295\u7A3F\u4E2D\u627E\u5230\u53EF\u4E0B\u8F7D\u7684\u89C6\u9891\u6216\u56FE\u7247",
        videoUnavailable: "\u89C6\u9891\u4E0D\u53EF\u7528\u6216\u5DF2\u88AB\u5220\u9664",
        privateVideo: "\u79C1\u5BC6\u89C6\u9891\u6216\u9700\u8981\u767B\u5F55\u8BBF\u95EE",
        unknown: "\u672A\u77E5",
        sankakuLoginOrDeleted: "\u672A\u627E\u5230\u8BE5\u6295\u7A3F\uFF0C\u53EF\u80FD\u9700\u8981\u767B\u5F55\u540E\u624D\u80FD\u67E5\u770B\uFF0C\u6216\u6295\u7A3F\u5DF2\u5220\u9664\u3002\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 Sankaku \u8D26\u53F7\u300D\u4E2D\u586B\u5199 Cookie \u540E\u91CD\u8BD5\u3002",
        sankakuAuthExpired: "Sankaku \u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u5728\u300C\u8BBE\u7F6E \u2192 Sankaku \u8D26\u53F7\u300D\u4E2D\u66F4\u65B0 Cookie\u3002"
      },
      progress: {
        remaining: "\u5269\u4F59"
      },
      update: {
        available: "\u53D1\u73B0\u65B0\u7248\u672C yt-dlp ({{version}})",
        clickToUpdate: "\u66F4\u65B0",
        updating: "\u6B63\u5728\u66F4\u65B0... {{percent}}%",
        done: "\u2713 \u5DF2\u66F4\u65B0\u81F3\u6700\u65B0\u7248"
      },
      deps: {
        title: "\u8BBE\u7F6E\u4E0E\u4F9D\u8D56\u7BA1\u7406",
        tabSettings: "\u504F\u597D\u8BBE\u7F6E",
        tabDependencies: "\u4F9D\u8D56\u7BA1\u7406",
        sectionPreferences: "\u504F\u597D\u8BBE\u7F6E",
        sectionEngines: "\u6838\u5FC3\u5F15\u64CE\u4F9D\u8D56",
        autoAddSourceLabel: "\u81EA\u52A8\u8BBE\u7F6E Eagle \u6570\u636E\u6765\u6E90",
        autoAddSourceHint: "\u5F00\u542F\u540E\uFF0C\u4E0B\u8F7D\u89C6\u9891\u65F6\u4F1A\u81EA\u52A8\u5728 Eagle \u4E2D\u8BB0\u5F55\u539F\u59CB\u7F51\u9875 URL",
        maxResolutionLabel: "\u6E05\u6670\u5EA6\u4E0A\u9650",
        maxResolutionHint: "\u9650\u5236\u4E0B\u8F7D\u7684\u6700\u5927\u6E05\u6670\u5EA6\u3002\u82E5\u76EE\u6807\u89C6\u9891\u65E0\u5BF9\u5E94\u753B\u8D28\uFF0C\u5C06\u81EA\u52A8\u5411\u4E0B\u5339\u914D\u6700\u9AD8\u53EF\u7528\u6E05\u6670\u5EA6\u3002",
        maxFramerateLabel: "\u5E27\u7387\u4E0A\u9650",
        maxFramerateHint: "\u9650\u5236\u4E0B\u8F7D\u7684\u6700\u5927\u5E27\u7387\u3002\u82E5\u76EE\u6807\u89C6\u9891\u65E0\u5BF9\u5E94\u5E27\u7387\uFF0C\u5C06\u81EA\u52A8\u5411\u4E0B\u5339\u914D\u6700\u9AD8\u53EF\u7528\u5E27\u7387\u3002",
        resAuto: "Auto (\u6700\u9AD8\u753B\u8D28)",
        fpsAuto: "Auto (\u6700\u9AD8\u5E27\u7387)",
        setupRequired: "\u9996\u6B21\u4F7F\u7528\u9700\u8981\u5148\u5B89\u88C5\u4EE5\u4E0B\u7EC4\u4EF6\uFF0C\u5B89\u88C5\u5B8C\u6210\u540E\u5C06\u81EA\u52A8\u8FDB\u5165\u4E3B\u754C\u9762",
        back: "\u8FD4\u56DE",
        ytdlpDesc: "\u89C6\u9891\u89E3\u6790\u4E0E\u4E0B\u8F7D\u5F15\u64CE",
        ffmpegDesc: "\u89C6\u9891\u5408\u5E76\u4E0E\u8F6C\u7801\u5F15\u64CE",
        ffmpegManaged: "\u7531 Eagle \u7BA1\u7406\uFF0C\u65E0\u9700\u624B\u52A8\u64CD\u4F5C",
        ffmpegNotFoundHint: "\u672A\u68C0\u6D4B\u5230 Eagle \u5185\u7F6E FFmpeg \u63D2\u4EF6\uFF0C\u8BF7\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u5B89\u88C5",
        ffmpegUnsupported: "\u9700\u5B89\u88C5 Eagle \u5B98\u65B9 FFmpeg \u63D2\u4EF6\u4EE5\u652F\u6301\u97F3\u89C6\u9891\u5408\u5E76",
        installFfmpegDep: "\u5B89\u88C5 FFmpeg \u4F9D\u8D56",
        checking: "\u68C0\u67E5\u4E2D...",
        installed: "\u5DF2\u5B89\u88C5",
        checkingUpdate: "\u68C0\u67E5\u66F4\u65B0\u4E2D...",
        latest: "\u5DF2\u662F\u6700\u65B0\u7248",
        outdated: "\u6709\u65B0\u7248\u672C",
        missing: "\u672A\u5B89\u88C5",
        eagleBuiltin: "Eagle \u5185\u7F6E",
        notFound: "\u672A\u627E\u5230",
        installing: "\u5B89\u88C5\u4E2D...",
        updating: "\u66F4\u65B0\u4E2D...",
        reinstalling: "\u91CD\u88C5\u4E2D...",
        doneInstalled: "\u5B89\u88C5\u5B8C\u6210",
        doneUpdated: "\u66F4\u65B0\u5B8C\u6210",
        doneReinstalled: "\u91CD\u88C5\u5B8C\u6210",
        install: "\u5B89\u88C5",
        update: "\u66F4\u65B0",
        reinstall: "\u91CD\u65B0\u5B89\u88C5",
        uninstall: "\u5378\u8F7D",
        retry: "\u91CD\u8BD5",
        downloadFailed: "\u4E0B\u8F7D\u5931\u8D25",
        versionInstalled: "\u7248\u672C\uFF1A{{version}}",
        versionUpdate: "{{from}} \u2192 {{to}}",
        progressText: "\u6B63\u5728\u4E0B\u8F7D... {{percent}}%",
        threadCountLabel: "\u4E0B\u8F7D\u7EBF\u7A0B\u6570",
        threadCountHint: "\u5206\u7247\u89C6\u9891\uFF08HLS/DASH\uFF09\u7684\u5E76\u53D1\u7EBF\u7A0B\u6570\u3002\u4E0D\u4E00\u5B9A\u8D8A\u5FEB\uFF1B\u76F4\u94FE MP4 \u5355\u8FDE\u63A5\u3002",
        threadAuto: "\u81EA\u52A8\uFF08\u9ED8\u8BA4\uFF09",
        sankakuAuthLabel: "Sankaku \u8D26\u53F7",
        sankakuAuthHint: "\u7C98\u8D34 accessToken cookie\uFF08\u4E5F\u652F\u6301 get-cookies / Cookie-Editor \u5BFC\u51FA\u7684 JSON\uFF09\u4EE5\u4E0B\u8F7D\u4EC5\u767B\u5F55\u53EF\u89C1\u6295\u7A3F\u3002",
        sankakuAuthPlaceholder: '{"accessToken":"..."} \u6216 accessToken=...',
        sankakuAuthSave: "\u4FDD\u5B58",
        sankakuAuthClear: "\u6E05\u9664",
        sankakuAuthSaved: "\u5DF2\u4FDD\u5B58\uFF0C\u4E0B\u8F7D\u65F6\u4F1A\u4F7F\u7528\u8BE5\u767B\u5F55\u6001\u3002",
        sankakuAuthCleared: "\u5DF2\u6E05\u9664\u3002",
        sankakuAuthInvalid: "\u672A\u8BC6\u522B\u5230 accessToken\uFF0C\u8BF7\u68C0\u67E5\u7C98\u8D34\u5185\u5BB9\u3002",
        tabAccount: "\u8D26\u53F7",
        twitterAuthLabel: "\u63A8\u7279 / X \u8D26\u53F7",
        twitterAuthHint: "\u4ECE\u5DF2\u767B\u5F55 x.com \u7684\u6D4F\u89C8\u5668 Cookie \u91CC\u590D\u5236 auth_token \u548C ct0 \u4E24\u4E2A\u503C\u3002",
        twitterAuthReady: "Cookie \u5DF2\u4FDD\u5B58",
        twitterAuthSaved: "\u5DF2\u4FDD\u5B58\uFF0C\u8D26\u53F7\uFF1A@{{name}}",
        twitterAuthInvalid: "Cookie \u9700\u8981\u540C\u65F6\u5305\u542B auth_token \u548C ct0",
        twitterAuthCleared: "Cookie \u5DF2\u6E05\u9664",
        twitterAuthTesting: "\u6B63\u5728\u6D4B\u8BD5\u2026",
        twitterAuthFailed: "\u8FDE\u63A5\u5931\u8D25\uFF1A{{error}}",
        twitterMonitorLabel: "\u81EA\u52A8\u83B7\u53D6\u70B9\u8D5E\u4E0E\u6536\u85CF",
        twitterMonitorHint: "\u65B0\u589E\u7684\u70B9\u8D5E / \u6536\u85CF\u4F1A\u81EA\u52A8\u52A0\u5165\u4E0B\u8F7D\u961F\u5217\u3002",
        twitterMonitorOn: "\u83B7\u53D6\u5DF2\u5F00\u542F\uFF1A\u6BCF {{interval}} \u68C0\u67E5\u4E00\u6B21",
        twitterMonitorOff: "\u83B7\u53D6\u5DF2\u5173\u95ED",
        twitterCatchup: "\u5DF2\u8865\u6293\u4E0A\u6B21\u5173\u95ED\u540E\u65B0\u589E\u7684 {{count}} \u6761\u5185\u5BB9",
        twitterCatchupTruncated: "\u5269\u4F59\u4E0B\u6B21\u7EE7\u7EED",
        twitterAuthSave: "\u4FDD\u5B58\u5E76\u6D4B\u8BD5",
        twitterAuthClear: "\u6E05\u9664",
        unitSeconds: "\u79D2",
        unitMinutes: "\u5206\u949F",
        unitHours: "\u5C0F\u65F6",
        twitterMonitorMinHint: "\u5EFA\u8BAE\u6700\u4F4E 2 \u5206\u949F",
        twitterMonitorLikesLabel: "\u83B7\u53D6\u70B9\u8D5E",
        twitterMonitorBookmarksLabel: "\u83B7\u53D6\u6536\u85CF",
        twitterMonitorNoSource: "\u8BF7\u81F3\u5C11\u52FE\u9009\u83B7\u53D6\u70B9\u8D5E\u6216\u83B7\u53D6\u6536\u85CF",
        twitterIntervalOffLabel: "\u5173\u95ED",
        sankakuAuthTesting: "\u6B63\u5728\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u2026",
        monitorIdle: "\u672A\u76D1\u63A7",
        monitorCountdown: "\u4E0B\u6B21 {{time}}",
        twitterFetching: "\u6B63\u5728\u6293\u53D6\u2026",
        twitterMonitorTest: "\u6293\u53D6\u6D4B\u8BD5"
      }
    };
  }
});

// js/plugin.js
var i18next2 = require_i18next();
var {
  isYtDlpInstalled,
  downloadYtDlp,
  uninstallYtDlp,
  getYtDlpUpdateInfo,
  getInstalledYtDlpVersion,
  getLatestYtDlpVersion,
  getFfmpegSource
} = require_binary();
var { isNetworkError } = require_net_guard();
var downloader = require_downloader();
var sankakuAuth = require_sankaku_auth();
var twitterAuth = require_twitter_auth();
var twitterMonitor = require_twitter_monitor();
var ui = require_ui();
var isInitialized = false;
async function importToEagle(videoPath, metadata, sourceUrl) {
  if (typeof eagle === "undefined") {
    throw new Error(i18next2.t("error.eagleApiNotAvailable"));
  }
  const importOptions = {
    name: metadata.title || i18next2.t("error.downloadedVideo"),
    website: sourceUrl || void 0,
    tags: [metadata.extractor || "video"],
    annotation: metadata.description ? metadata.description.slice(0, 500) : ""
  };
  try {
    return await eagle.item.addFromPath(videoPath, importOptions);
  } catch (error) {
    throw new Error(`${i18next2.t("error.eagleImportFailed")}: ${error.message}`);
  }
}
var AUTO_ADD_SOURCE_KEY = "eagle-video-downloader.autoAddSource";
var MAX_RESOLUTION_KEY = "eagle-video-downloader.maxResolution";
var MAX_FRAMERATE_KEY = "eagle-video-downloader.maxFramerate";
var THREAD_COUNT_KEY = "eagle-video-downloader.threadCount";
function getAutoAddSourcePref() {
  const val = localStorage.getItem(AUTO_ADD_SOURCE_KEY);
  return val === null ? true : val === "true";
}
function setAutoAddSourcePref(value) {
  localStorage.setItem(AUTO_ADD_SOURCE_KEY, String(value));
}
function getMaxResolutionPref() {
  return localStorage.getItem(MAX_RESOLUTION_KEY) || "auto";
}
function setMaxResolutionPref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_RESOLUTION_KEY, val);
  downloader.setQualityPrefs({
    resolution: val,
    framerate: getMaxFrameratePref()
  });
}
function getMaxFrameratePref() {
  return localStorage.getItem(MAX_FRAMERATE_KEY) || "auto";
}
function setMaxFrameratePref(value) {
  const val = value || "auto";
  localStorage.setItem(MAX_FRAMERATE_KEY, val);
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: val
  });
}
function getThreadCountPref() {
  return localStorage.getItem(THREAD_COUNT_KEY) || "auto";
}
function setThreadCountPref(value) {
  const val = value || "auto";
  localStorage.setItem(THREAD_COUNT_KEY, val);
  downloader.setThreadCount(val);
}
var downloadQueue = [];
var MAX_CONCURRENT = 3;
var activeCount = 0;
var queueIdCounter = 0;
async function initI18n() {
  const enTranslation = require_en();
  const zhCNTranslation = require_zh_CN();
  await i18next2.init({
    lng: eagle.app.locale || "en",
    fallbackLng: "en",
    resources: {
      en: { translation: enTranslation },
      zh_CN: { translation: zhCNTranslation }
    }
  });
  global.i18next = i18next2;
}
function applyTranslations() {
  const appName = document.getElementById("appName");
  if (appName)
    appName.textContent = i18next2.t("ui.appTitle");
  const urlInput = document.getElementById("urlInput");
  if (urlInput)
    urlInput.placeholder = i18next2.t("ui.inputPlaceholder");
  const pinButton = document.getElementById("pinButton");
  if (pinButton)
    pinButton.title = i18next2.t("ui.pin");
  const pasteButton = document.getElementById("pasteButton");
  if (pasteButton)
    pasteButton.title = i18next2.t("ui.paste");
}
eagle.onPluginCreate(async (plugin) => {
  await initI18n();
  applyTranslations();
  ui.updateTheme();
  setupEventListeners();
  startLibraryWatcher();
  try {
    ui.renderTwitterProfile();
    twitterMonitor.fetchProfile().then((profile) => {
      if (profile && profile.ok)
        ui.renderTwitterProfile(profile);
    }).catch(() => {
    });
  } catch (e) {
  }
  twitterMonitor.init().then((result) => {
    const status = document.getElementById("twitterAuthStatus");
    if (!status || !result)
      return;
    if (result.skipped)
      return;
    if (result.ok === false) {
      status.textContent = i18next2.t("deps.twitterAuthFailed", { error: result.error || "error" });
      return;
    }
    if (result.baseline) {
      status.textContent = i18next2.t("deps.twitterAuthReady");
      return;
    }
    const parts = [i18next2.t("deps.twitterCatchup", { count: result.newCount || 0 })];
    if (result.truncated)
      parts.push(i18next2.t("deps.twitterCatchupTruncated"));
    status.textContent = parts.join(" \xB7 ");
  }).catch((e) => {
    console.warn("[twitter-monitor] init failed:", e && e.message);
  });
  setupWindowState();
  startIngestBridge();
  downloader.setQualityPrefs({
    resolution: getMaxResolutionPref(),
    framerate: getMaxFrameratePref()
  });
  downloader.setThreadCount(getThreadCountPref());
  await initializeBinaries();
});
eagle.onThemeChanged(() => {
  ui.updateTheme();
});
var lastLibraryPath = null;
function startLibraryWatcher() {
  try {
    lastLibraryPath = eagle.library && eagle.library.path || "";
  } catch (e) {
    lastLibraryPath = "";
  }
  setInterval(() => {
    let current = "";
    try {
      current = eagle.library && eagle.library.path || "";
    } catch (e) {
      current = "";
    }
    if (current === lastLibraryPath)
      return;
    lastLibraryPath = current;
    try {
      ui.refreshAccountFields();
    } catch (e) {
    }
    try {
      twitterMonitor.refreshForLibrary();
    } catch (e) {
    }
  }, 3e3);
}
function setupEventListeners() {
  var _a, _b, _c;
  document.getElementById("closeButton").addEventListener("click", () => {
    saveWindowSize();
    window.close();
  });
  setupPinButton();
  document.getElementById("depsEntryBtn").addEventListener("click", openDepsPage);
  document.getElementById("depsBackBtn").addEventListener("click", closeDepsPage);
  (_a = document.getElementById("tabBtnSettings")) == null ? void 0 : _a.addEventListener("click", () => {
    ui.switchSubpageTab("settings");
  });
  (_b = document.getElementById("tabBtnDeps")) == null ? void 0 : _b.addEventListener("click", () => {
    ui.switchSubpageTab("dependencies");
  });
  (_c = document.getElementById("tabBtnAccount")) == null ? void 0 : _c.addEventListener("click", () => {
    ui.switchSubpageTab("account");
  });
  const autoAddToggle = document.getElementById("autoAddSourceToggle");
  if (autoAddToggle) {
    autoAddToggle.addEventListener("change", (e) => {
      setAutoAddSourcePref(e.target.checked);
    });
  }
  const maxResSelect = document.getElementById("maxResolutionSelect");
  if (maxResSelect) {
    maxResSelect.addEventListener("change", (e) => {
      setMaxResolutionPref(e.target.value);
    });
  }
  const maxFpsSelect = document.getElementById("maxFramerateSelect");
  if (maxFpsSelect) {
    maxFpsSelect.addEventListener("change", (e) => {
      setMaxFrameratePref(e.target.value);
    });
  }
  const threadSelect = document.getElementById("threadCountSelect");
  if (threadSelect) {
    threadSelect.addEventListener("change", (e) => {
      setThreadCountPref(e.target.value);
    });
  }
  const authInput = document.getElementById("sankakuAuthInput");
  const authStatus = document.getElementById("sankakuAuthStatus");
  const authSave = document.getElementById("sankakuAuthSave");
  const authClear = document.getElementById("sankakuAuthClear");
  if (authSave && authInput) {
    authSave.addEventListener("click", () => {
      const token = sankakuAuth.parseAccessToken(authInput.value);
      if (!token) {
        if (authStatus)
          authStatus.textContent = i18next2.t("deps.sankakuAuthInvalid");
        return;
      }
      sankakuAuth.setStoredAuth(authInput.value);
      if (authStatus)
        authStatus.textContent = i18next2.t("deps.sankakuAuthSaved");
    });
  }
  if (authClear && authInput) {
    authClear.addEventListener("click", () => {
      sankakuAuth.setStoredAuth("");
      authInput.value = "";
      if (authStatus)
        authStatus.textContent = i18next2.t("deps.sankakuAuthCleared");
    });
  }
  const twToken = document.getElementById("twitterAuthToken");
  const twCt0 = document.getElementById("twitterCt0");
  const twStatus = document.getElementById("twitterAuthStatus");
  const twSave = document.getElementById("twitterAuthSave");
  const twClear = document.getElementById("twitterAuthClear");
  const twIntervals = document.getElementById("twitterMonitorInterval");
  const setTwStatus = (text) => {
    if (twStatus)
      twStatus.textContent = text;
  };
  const getIntervalMinutes = () => {
    return twIntervals ? Number(twIntervals.value) || 0 : 0;
  };
  const describeInterval = (ms) => {
    if (ms % 36e5 === 0)
      return ms / 36e5 + " " + i18next2.t("deps.unitHours");
    return ms / 6e4 + " " + i18next2.t("deps.unitMinutes");
  };
  const applyInterval = () => {
    const minutes = getIntervalMinutes();
    ui.setIntervalChoice(minutes);
    if (!minutes) {
      twitterMonitor.stop();
      setTwStatus(i18next2.t("deps.twitterMonitorOff"));
      return false;
    }
    if (!twitterAuth.hasAuth()) {
      setTwStatus(i18next2.t("deps.twitterAuthInvalid"));
      return false;
    }
    const intervalMs = Math.max(twitterMonitor.MIN_INTERVAL_MS, minutes * 6e4);
    twitterMonitor.start(intervalMs);
    setTwStatus(i18next2.t("deps.twitterMonitorOn", { interval: describeInterval(intervalMs) }));
    return true;
  };
  if (twSave && twToken && twCt0) {
    twSave.addEventListener("click", async () => {
      const cookie = twitterAuth.buildCookie(twToken.value, twCt0.value);
      if (!cookie) {
        setTwStatus(i18next2.t("deps.twitterAuthInvalid"));
        return;
      }
      twitterAuth.setStoredCookie(cookie);
      setTwStatus(i18next2.t("deps.twitterAuthTesting"));
      const result = await twitterMonitor.testConnection();
      if (!result.ok) {
        setTwStatus(i18next2.t("deps.twitterAuthFailed", { error: result.error }));
        return;
      }
      const parts = [i18next2.t("deps.twitterAuthSaved", { name: result.screenName || "?" })];
      if (!result.likesOk)
        parts.push("likes: " + (result.likesError || "error"));
      if (!result.bookmarksOk)
        parts.push("bookmarks: " + (result.bookmarksError || "error"));
      setTwStatus(parts.join(" \xB7 "));
      ui.renderTwitterProfile(result);
      applyInterval();
    });
  }
  if (twClear && twToken && twCt0) {
    twClear.addEventListener("click", () => {
      twitterAuth.setStoredCookie("");
      twToken.value = "";
      twCt0.value = "";
      twitterMonitor.saveProfile({});
      ui.renderTwitterProfile(null);
      setTwStatus(i18next2.t("deps.twitterAuthCleared"));
      twitterMonitor.stop();
      if (twIntervals)
        twIntervals.value = "0";
    });
  }
  if (twIntervals)
    twIntervals.addEventListener("change", applyInterval);
  const twLikes = document.getElementById("twitterMonitorLikes");
  const twBookmarks = document.getElementById("twitterMonitorBookmarks");
  const onSourceChange = () => {
    twitterMonitor.setPrefs({ likes: !!(twLikes && twLikes.checked), bookmarks: !!(twBookmarks && twBookmarks.checked) });
    if (!(twLikes && twLikes.checked) && !(twBookmarks && twBookmarks.checked)) {
      twitterMonitor.stop();
      setTwStatus(i18next2.t("deps.twitterMonitorNoSource"));
      return;
    }
    applyInterval();
  };
  if (twLikes)
    twLikes.addEventListener("change", onSourceChange);
  if (twBookmarks)
    twBookmarks.addEventListener("change", onSourceChange);
  const twTest = document.getElementById("twitterMonitorTest");
  if (twTest) {
    twTest.addEventListener("click", async () => {
      if (!twitterAuth.hasAuth()) {
        setTwStatus(i18next2.t("deps.twitterAuthInvalid"));
        return;
      }
      twTest.disabled = true;
      setTwStatus(i18next2.t("deps.twitterFetching"));
      let result = null;
      try {
        result = await twitterMonitor.catchUp();
      } catch (e) {
        result = { ok: false, error: e && e.message || "error" };
      }
      twTest.disabled = false;
      if (!result || result.ok === false) {
        setTwStatus(i18next2.t("deps.twitterAuthFailed", { error: result && result.error || "error" }));
        return;
      }
      const parts = [i18next2.t("deps.twitterCatchup", { count: result.newCount || 0 })];
      if (result.truncated)
        parts.push(i18next2.t("deps.twitterCatchupTruncated"));
      setTwStatus(parts.join(" \xB7 "));
    });
  }
  document.getElementById("ytdlpActions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-ytdlp-action]");
    if (btn)
      handleYtdlpAction(btn.dataset.ytdlpAction);
  });
  const ffmpegActions = document.getElementById("ffmpegActions");
  if (ffmpegActions) {
    ffmpegActions.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-ffmpeg-action]");
      if (btn && btn.dataset.ffmpegAction === "open-store") {
        openEagleFfmpegStore();
      }
    });
  }
  document.addEventListener("startDownload", (e) => {
    addToQueue(e.detail.url);
  });
  document.querySelector(".download-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    if (action === "retry")
      retryDownload(id);
    if (action === "copyError")
      copyError(id);
    if (action === "copy")
      copyUrl(id);
    if (action === "delete")
      deleteDownloadItem(id);
  });
}
async function openEagleFfmpegStore() {
  if (typeof eagle !== "undefined" && eagle.extraModule && eagle.extraModule.ffmpeg && typeof eagle.extraModule.ffmpeg.install === "function") {
    try {
      await eagle.extraModule.ffmpeg.install();
      return;
    } catch (e) {
    }
  }
  const isZh = eagle.app.locale && eagle.app.locale.startsWith("zh");
  const url = isZh ? "https://community-cn.eagle.cool/plugin/detail/eagle-plugin-ffmpeg" : "https://community.eagle.cool/plugin/detail/eagle-plugin-ffmpeg";
  try {
    const { shell } = require("electron");
    shell.openExternal(url);
  } catch (e) {
    window.open(url, "_blank");
  }
}
async function initializeBinaries() {
  if (depsReady()) {
    isInitialized = true;
    initializeMainUI();
    checkForUpdateAndNotify();
    return;
  }
  ui.showDepsPage({
    tab: "dependencies",
    gating: true,
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
    threadCountPref: getThreadCountPref()
  });
  ui.updateDepsBadge(true);
  loadDepsInfo();
}
function depsReady() {
  return isYtDlpInstalled() && !!getFfmpegSource();
}
function refreshDepsGatingState() {
  if (depsReady()) {
    if (!isInitialized) {
      isInitialized = true;
      ui.hideDepsPage();
      initializeMainUI();
      checkForUpdateAndNotify();
    } else {
      getYtDlpUpdateInfo().then(({ hasUpdate }) => {
        ui.updateDepsBadge(hasUpdate);
      }).catch(() => {
        ui.updateDepsBadge(false);
      });
    }
  } else {
    isInitialized = false;
    ui.setDepsGating(true);
    ui.updateDepsBadge(true);
  }
}
function initializeMainUI() {
  ui.showMainUI();
  ui.setupInputBar();
  const urlInput = document.getElementById("urlInput");
  if (urlInput)
    urlInput.focus();
}
function addToQueue(url) {
  if (!isInitialized)
    return;
  const item = {
    id: ++queueIdCounter,
    url,
    title: url,
    state: "waiting",
    progress: 0,
    speed: "",
    eta: "",
    phase: null,
    processingPercent: void 0,
    error: null
  };
  downloadQueue.push(item);
  ui.appendQueueItem(item);
  processQueue();
}
function processQueue() {
  while (activeCount < MAX_CONCURRENT) {
    const nextItem = downloadQueue.find((item) => item.state === "waiting");
    if (!nextItem)
      break;
    activeCount++;
    executeDownload(nextItem);
  }
}
function formatDownloadError(error, url) {
  if ((error == null ? void 0 : error.code) === "ENETBOUNDARY") {
    return i18next2.t("error.blockedAddress");
  }
  if (isNetworkError(error)) {
    return i18next2.t("error.networkUnavailable");
  }
  const msg = (error == null ? void 0 : error.message) || "";
  if (/Unsupported URL/i.test(msg)) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname === "dribbble.com" || hostname.endsWith(".dribbble.com")) {
        return i18next2.t("error.dribbbleProtected");
      }
    } catch {
    }
    return i18next2.t("error.unsupportedUrl");
  }
  if (/Video unavailable|This video is unavailable|Unable to download video/i.test(msg)) {
    return i18next2.t("error.videoUnavailable");
  }
  if (/Private video|This video is private|Sign in to confirm/i.test(msg)) {
    return i18next2.t("error.privateVideo");
  }
  return msg || i18next2.t("download.failed");
}
async function executeDownload(item) {
  try {
    item.state = "preparing";
    ui.updateQueueItem(item.id, item);
    const videoInfo = await downloader.getVideoInfo(item.url);
    item.title = videoInfo.title || i18next2.t("error.untitledVideo");
    item.state = "downloading";
    item.phase = null;
    item.processingPercent = void 0;
    item.eta = "";
    ui.updateQueueItem(item.id, item);
    const results = await downloader.downloadVideo(
      item.url,
      (progress) => {
        if (progress.phase) {
          item.phase = progress.phase;
          item.processingPercent = void 0;
        }
        if (typeof progress.processingPercent === "number")
          item.processingPercent = progress.processingPercent;
        if (typeof progress.percent === "number" && !progress.phase)
          item.progress = progress.percent;
        if (typeof progress.currentSpeed === "string")
          item.speed = progress.currentSpeed;
        if (typeof progress.eta === "string")
          item.eta = progress.eta;
        ui.updateQueueItem(item.id, item);
      },
      null,
      videoInfo
    );
    item.state = "completed";
    item.progress = 100;
    item.speed = "";
    item.eta = "";
    item.phase = null;
    item.processingPercent = void 0;
    ui.updateQueueItem(item.id, item);
    for (const result of results) {
      const sourceUrl = getAutoAddSourcePref() ? item.url : void 0;
      await importToEagle(result.path, result.metadata, sourceUrl);
      downloader.cleanup(result.path);
    }
  } catch (error) {
    item.state = "error";
    item.error = formatDownloadError(error, item.url);
    ui.updateQueueItem(item.id, item);
  } finally {
    activeCount--;
    processQueue();
  }
}
function retryDownload(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item || item.state !== "error")
    return;
  item.state = "waiting";
  item.progress = 0;
  item.error = null;
  item.speed = "";
  item.eta = "";
  item.phase = null;
  item.processingPercent = void 0;
  ui.updateQueueItem(item.id, item);
  processQueue();
}
async function copyError(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item || !item.error)
    return;
  try {
    await navigator.clipboard.writeText(item.error);
    ui.showCopiedErrorFeedback(id);
  } catch (error) {
    console.error("Failed to copy error:", error);
  }
}
async function checkForUpdateAndNotify() {
  try {
    const { hasUpdate } = await getYtDlpUpdateInfo();
    ui.updateDepsBadge(hasUpdate || !depsReady());
  } catch (e) {
    ui.updateDepsBadge(!depsReady());
  }
}
function openDepsPage() {
  ui.showDepsPage({
    tab: "settings",
    autoAddSourcePref: getAutoAddSourcePref(),
    maxResolutionPref: getMaxResolutionPref(),
    maxFrameratePref: getMaxFrameratePref(),
    threadCountPref: getThreadCountPref()
  });
  loadDepsInfo();
}
function closeDepsPage() {
  ui.hideDepsPage();
}
function loadDepsInfo(options = {}) {
  const ffmpegSource = getFfmpegSource();
  const ytdlpInstalled = isYtDlpInstalled();
  if (ffmpegSource === "eagle") {
    ui.updateFfmpegCard("eagle", {});
  } else {
    ui.updateFfmpegCard("missing", {});
  }
  if (!ytdlpInstalled) {
    ui.updateYtdlpCard("missing");
    return;
  }
  if (options.ytdlpKnownLatest) {
    ui.updateYtdlpCard("latest", { version: options.ytdlpKnownLatest });
  } else {
    loadYtdlpUpdateStatus();
  }
}
function loadYtdlpUpdateStatus() {
  ui.updateYtdlpCard("installed", { checkingUpdate: true });
  const latestVersion = getLatestYtDlpVersion();
  getInstalledYtDlpVersion().then((installedVersion) => {
    if (!installedVersion) {
      ui.updateYtdlpCard("missing");
      return;
    }
    if (installedVersion !== latestVersion) {
      ui.updateYtdlpCard("outdated", { installedVersion, latestVersion });
    } else {
      ui.updateYtdlpCard("latest", { version: installedVersion });
    }
  }).catch(() => {
  });
}
async function handleYtdlpAction(action) {
  if (action === "uninstall") {
    uninstallYtDlp();
    ui.updateYtdlpCard("missing");
    refreshDepsGatingState();
    return;
  }
  const statusKey = {
    install: "deps.installing",
    update: "deps.updating",
    reinstall: "deps.reinstalling"
  }[action] || "deps.updating";
  const doneKey = {
    install: "deps.doneInstalled",
    update: "deps.doneUpdated",
    reinstall: "deps.doneReinstalled"
  }[action] || "deps.doneInstalled";
  const statusText = i18next2.t(statusKey);
  ui.updateYtdlpCard("busy", { statusText, percent: 0 });
  try {
    await downloadYtDlp((progress) => {
      ui.updateYtdlpCard("busy", { statusText, percent: progress });
    });
    const version = await getInstalledYtDlpVersion();
    ui.updateYtdlpCard("done", { statusText: i18next2.t(doneKey), version });
    setTimeout(() => {
      loadDepsInfo({ ytdlpKnownLatest: version });
      refreshDepsGatingState();
    }, 1500);
  } catch (e) {
    const message = isNetworkError(e) ? i18next2.t("error.networkUnavailable") : e.message;
    ui.updateYtdlpCard("error", { message, retryAction: action });
  }
}
async function copyUrl(id) {
  const item = downloadQueue.find((item2) => item2.id === id);
  if (!item)
    return;
  try {
    await navigator.clipboard.writeText(item.url);
    ui.showCopiedFeedback(id);
  } catch (error) {
    console.error("Failed to copy URL:", error);
  }
}
function deleteDownloadItem(id) {
  const index = downloadQueue.findIndex((entry) => entry.id === id);
  if (index < 0)
    return;
  if (!ui.canDeleteQueueItem(downloadQueue[index]))
    return;
  downloadQueue.splice(index, 1);
  ui.removeQueueItem(id);
}
var WINDOW_SIZE_KEY = "evd.windowSize";
function getSavedWindowSize() {
  try {
    const raw = localStorage.getItem(WINDOW_SIZE_KEY);
    if (!raw)
      return null;
    const size = JSON.parse(raw);
    const width = Number(size && size.width);
    const height = Number(size && size.height);
    if (!Number.isFinite(width) || !Number.isFinite(height))
      return null;
    if (width < 320 || height < 320 || width > 4e3 || height > 4e3)
      return null;
    return { width: Math.round(width), height: Math.round(height) };
  } catch (e) {
    return null;
  }
}
function saveWindowSize() {
  try {
    const width = Math.round(window.innerWidth);
    const height = Math.round(window.innerHeight);
    if (width > 0 && height > 0) {
      localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify({ width, height }));
    }
  } catch (e) {
  }
}
function setupWindowState() {
  const saved = getSavedWindowSize();
  const api = typeof eagle !== "undefined" && eagle.window ? eagle.window : null;
  if (saved && api && typeof api.setSize === "function") {
    Promise.resolve().then(async () => {
      try {
        const current = typeof api.getSize === "function" ? await api.getSize() : null;
        const width = Array.isArray(current) ? current[0] : current && current.width;
        const height = Array.isArray(current) ? current[1] : current && current.height;
        if (width == null || height == null || Math.abs(width - saved.width) > 2 || Math.abs(height - saved.height) > 2) {
          await api.setSize(saved.width, saved.height);
        }
      } catch (e) {
      }
    });
  }
  let saveTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowSize, 300);
  });
  window.addEventListener("beforeunload", saveWindowSize);
}
var INGEST_PORT = 43110;
var INGEST_ALLOWED_HOSTS = ["x.com", "twitter.com", "mobile.twitter.com", "video.twimg.com", "pbs.twimg.com", "sankaku.app", "sankakucomplex.com"];
function isIngestUrlAllowed(value) {
  try {
    const parsed = new URL(String(value || ""));
    if (parsed.protocol !== "https:")
      return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return INGEST_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
  } catch (e) {
    return false;
  }
}
function writeBridgeResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}
function startIngestBridge() {
  if (startIngestBridge.server)
    return startIngestBridge.server;
  let http;
  try {
    http = require("http");
  } catch (e) {
    return null;
  }
  const server = http.createServer((req, res) => {
    const pathname = String(req.url || "/").split("?")[0];
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      res.end();
      return;
    }
    if (pathname === "/ping") {
      writeBridgeResponse(res, 200, { ok: true, app: "eagle-video-downloader", ready: !!isInitialized });
      return;
    }
    if (pathname !== "/ingest" || req.method !== "POST") {
      writeBridgeResponse(res, 404, { ok: false, error: "not-found" });
      return;
    }
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16 * 1024) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (tooLarge)
        return;
      let payload = null;
      try {
        payload = JSON.parse(body || "{}");
      } catch (e) {
        payload = null;
      }
      const target = payload && typeof payload.url === "string" ? payload.url.trim() : "";
      if (!target || !isIngestUrlAllowed(target)) {
        writeBridgeResponse(res, 400, { ok: false, error: "invalid-url" });
        return;
      }
      if (!isInitialized) {
        writeBridgeResponse(res, 503, { ok: false, error: "not-ready" });
        return;
      }
      addToQueue(target);
      try {
        if (eagle.window && typeof eagle.window.restore === "function")
          eagle.window.restore();
        if (eagle.window && typeof eagle.window.focus === "function")
          eagle.window.focus();
      } catch (e) {
      }
      writeBridgeResponse(res, 200, { ok: true, url: target });
    });
    req.on("error", () => {
    });
  });
  server.on("error", (error) => {
    console.warn("[ingest] bridge error:", error && error.message);
  });
  server.listen(INGEST_PORT, "127.0.0.1");
  startIngestBridge.server = server;
  return server;
}
function setupPinButton() {
  const pinButton = document.getElementById("pinButton");
  if (!pinButton)
    return;
  const STORAGE_KEY = "evd.alwaysOnTop";
  const api = typeof eagle !== "undefined" && eagle.window ? eagle.window : null;
  const render = (pinned2) => {
    pinButton.classList.toggle("active", pinned2);
    pinButton.setAttribute("aria-pressed", pinned2 ? "true" : "false");
  };
  const apply = async (pinned2) => {
    try {
      if (api && typeof api.setAlwaysOnTop === "function") {
        await api.setAlwaysOnTop(pinned2);
      }
    } catch (e) {
      console.error("Failed to set always on top:", e);
      return;
    }
    render(pinned2);
    try {
      localStorage.setItem(STORAGE_KEY, pinned2 ? "1" : "0");
    } catch (e) {
    }
  };
  let pinned = false;
  try {
    pinned = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {
  }
  render(pinned);
  if (pinned)
    apply(true);
  pinButton.addEventListener("click", () => {
    pinned = !pinned;
    apply(pinned);
  });
}
module.exports = {};
