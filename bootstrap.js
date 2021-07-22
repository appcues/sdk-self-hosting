(function(self, ns){
    const settings = {}

    // Your appcues account id.
    const APPCUES_ACCOUNT_ID = "<your appcues account id>";
    // The prococal and domain used to load the Appcues SDK.
    const APPCUES_BUNDLE_DOMAIN = "https://fast.appcues.com";
    // The domain used to comminucate with the Appcues API.
    const APPCUES_API_HOSTNAME = "api.appcues.net";

    var isBootstrapped = false;

    var skipAMD = false;
    var windowGlobals = window["AppcuesSettings"];
    if (
      windowGlobals &&
      typeof windowGlobals === "object" &&
      windowGlobals.skipAMD === true
    ) {
      skipAMD = true;
    }

    var doc = self.document;
    self[ns] = self[ns] || [];
    var Appcues = self[ns];
    if (Appcues.invoked) {
        if (self.console && console.error) {
            console.error('Appcues snippet included twice.');
        }
        return;
    }

    if (Appcues.identify) return;
    Appcues.invoked = true;

    var methods = [
        "identify",
        "track",
        "page",
        "anonymous",
        "start",
        "show",
        "clearShow",
        "on",
        "off",
        "once",
        "reset",
        "debug",
        "user",
        "call",
        "settings",
        "content",
        "initMixpanel",
        "initHeap",
        "initIntercom",
        "initCIO",
        "initWoopra",
        "initAmplitude",
        "initKlaviyo",
        "initTD",
        "initLl",
        "initCalq",
        "initKM",
        "initGA",
        "initGTM",
        "initSegment",
        "injectContent",
        "injectStyles",
        "injectEvents",
        "cancelEvents",
        "loadLaunchpad"
    ];

    var promises = [
        "user"
    ];

    function factory(method){
        return function(){
            var args = Array.prototype.slice.call(arguments);
            if (isBootstrapped) {
              self.Appcues[method].apply(self.Appcues, args);
            } else {
              args.unshift(method);
              Appcues.push(args);
            }
            return self.Appcues;
        };
    }

    // For each of our methods, generate a queueing stub.
    for (var i = 0; i < methods.length; i++) {
        var key = methods[i];
        Appcues[key] = factory(key);
    }

    for (var i = 0; i < promises.length; i++) {
        var key = promises[i];
        Appcues[key] = function() {
          var args = Array.prototype.slice.call(arguments);
          if (isBootstrapped) {
            return self.Appcues[key].apply(self.Appcues, args);
          } else {
            return new Promise(function(resolve, _reject) {
              args.unshift(resolve);
              args.unshift(key);
              Appcues.push(args);
            });
          }
        };
    }

    if (
      !skipAMD &&
      typeof window.define === "function" &&
      window.define.amd &&
      (window.define.amd.vendor == null ||
        window.define.amd.vendor !== "dojotoolkit.org")
    ) {
      window.define(function() { return Appcues; });
    }

    function setAccountConfig(settings) {
        self.AppcuesBundleSettings = {
            accountId: APPCUES_ACCOUNT_ID,
            VERSION: settings.version,
            RELEASE_ID: settings.release_id,
            GENERIC_BUNDLE_DOMAIN: APPCUES_BUNDLE_DOMAIN,
            GENERIC_BUNDLE_PATH: settings.generic_bundle_path,
            GENERIC_BUNDLE_INTEGRITY: settings.generic_bundle_integrity,
            API_HOSTNAME: APPCUES_API_HOSTNAME,
            styling: settings.styling,
            integrations: settings.integrations,
            account: settings.account,
            events: settings.custom_events
        }
    }

    function load(settings){
        setAccountConfig(settings)
        Appcues.SNIPPET_VERSION = self.AppcuesBundleSettings.VERSION;

        var bundleScript = doc.createElement("script");
        if (self.AppcuesBundleSettings.GENERIC_BUNDLE_INTEGRITY) {
            bundleScript.crossOrigin = "anonymous";
            bundleScript.integrity = self.AppcuesBundleSettings.GENERIC_BUNDLE_INTEGRITY
        }
        bundleScript.type = "text/javascript";
        bundleScript.src = self.AppcuesBundleSettings.GENERIC_BUNDLE_DOMAIN + self.AppcuesBundleSettings.GENERIC_BUNDLE_PATH;
        bundleScript.async = true;
        bundleScript.onload = function () {
            isBootstrapped = true;
            Appcues.forEach(function(call) {
                var fnName = call[0];
                var args = call.slice(1);
                if (promises.indexOf(fnName) === -1) {
                  self[ns] && self[ns][fnName] &&
                      self[ns][fnName].apply(self[ns], args);
                } else {
                  var resolve = args[0];
                  var promiseArgs = args.slice(1);
                  self[ns] && self[ns][fnName] &&
                    self[ns][fnName].apply(self[ns], promiseArgs).then(
                      function() { resolve(arguments[0]); }
                    );
                }
            });
        };

        var firstScript = doc.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(bundleScript, firstScript);
    }

    function loadAppcuesSettings(attempt) {
        let request = new XMLHttpRequest();

        const URL = APPCUES_BUNDLE_DOMAIN + "/bundle/accounts/" + APPCUES_ACCOUNT_ID + "/settings";
        request.open("GET", URL);

        request.onreadystatechange = function() {
            if (this.readyState > 1 && this.readyState < 4) {
                if (this.status < 200 || this.status >= 300) {
                    request.abort();
                }
            }
            else if (this.readyState == 4) {
                if (this.status >= 200 && this.status < 300) {
                    try {
                        load(JSON.parse(request.response));
                    } catch(e) {
                        return;
                    }
                }
            }
        };

        request.onerror = function() {
            loadWithBackoff(attempt * 1.5);
        }

        request.onabort = function() {
            loadWithBackoff(attempt * 1.5);
        }

        request.ontimeout = function() {
            loadWithBackoff(attempt * 1.5);
        }

        request.send();
    }

    function loadWithBackoff(attempt) {
        if (attempt > 3) {
            return;
        } else {
            var jitter = window.Math.random() * 100;
            var delay = attempt * 500 + jitter;
            window.setTimeout(function() {
                loadAppcuesSettings(attempt + .5);
            }, delay);
      }
    }

    loadWithBackoff(0);
})(window, 'Appcues');

