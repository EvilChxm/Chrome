var main = function () {
    return {
        tabId: -1,

        userInfo: null,

        matchInfo: null,

        config: {},

        option: function () {
            return {
                currentTab: function (_main) {
                    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                        _main.tabId = tabs[0].id;
                    });
                },

                token: function (token) {
                    chrome.storage.local.set({
                        token: token,
                        time: +new Date()
                    });
                },

                initConfig: function (_main, callback) {
                    //var configUrl = chrome.runtime.getURL('config.json');
                    var configUrl = "config.json";
                    this.xhr({
                        type: 'GET',
                        url: configUrl,
                        json: true,
                        async: true,
                        callback: function (data) {
                            _main.config = data;
                            callback && callback();
                        }
                    });
                },

                xhr: function (config) {
                    var xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState == 4 && xhr.status == 200) {
                            var data = config['json'] ? (xhr.response ? JSON.parse(xhr.response) : {}) : xhr.response;
                            if (config['callback']) {
                                config['callback'](data);
                            }
                        }
                    };
                    xhr.open(config['type'], config['url'], config['async']);
                    var data = null;
                    if (config['data']) {
                        data = new FormData();
                        for (var index in config['data']) {
                            data.append(index, config['data'][index]);
                        }
                    }
                    /*var data = null;
                     if(config['data']){
                     data = [];
                     for(var index in config['data']){
                     data.push(index + '=' + config['data'][index]);
                     }
                     data = data.join('&');
                     }*/
                    xhr.send(data);
                },

                base64: function (str, salt, en) {
                    if (en) {
                        return salt + Base64.encode(salt + '' + str);
                    } else {
                        var reg = new RegExp(salt);
                        return Base64.decode(str.replace(reg, '')).replace(reg, '');
                    }
                },

                check: function (config) {
                    var id = config.customid;
                    var key = config.customkey;
                    var yss = config.yss;
                    var ysg = config.ysg;
                    var _this = this;
                    var data = {
                        data: this.base64(id + ':' + key, yss, true)
                    };
                    this.xhr({
                        url: config.checkurl,
                        type: 'post',
                        async: false,
                        data: data,
                        callback: function (data) {
                            try {
                                var backInfo = _this.base64(data, ysg, false);
                                backInfo = JSON.parse(backInfo);
                                if (backInfo && backInfo['gather_expire']) {
                                    config.checkResult = true;
                                }
                            } catch (e) {
                            }
                        }
                    });
                }

            };
        }()
    };
}();

//chrome.extension.onRequest.addListener(
//    function(request, sender, sendResponse) {
//        main.config=request;
//    }
//);

main.option.initConfig(main, function () {
    //main.option.check(main);
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {
        case 'setter':
            main.config = message.info;
            main.option.check(main.config);
            sendResponse({userinfo: main.userInfo, configs: main.config});
            break;

        case 'getUser':
            sendResponse({userinfo: main.userInfo, configs: main.config});
            break;

        case 'setUser':
            main.userInfo = message.info;
            //userInfo.set(message.info);
            sendResponse({userinfo: main.userInfo, configs: main.config});
            break;

        case 'removeUser':
            main.userInfo = null;
            userInfo.remove();
            break;

        case 'saveSortId':
            main.userInfo['sortId'] = message.sortId;
            chrome.storage.local.set({
                sortId: message.sortId
            });
            break;

        case 'getMatch':
            sendResponse(main.matchInfo[message.domain]);
            break;

        case 'setMatch':
            $.matchInfo[message.domain] = message.info;
            matchInfo.set($.matchInfo);
            break;

    }
});

var userInfo = function () {
    return {
        set: function (info) {
            chrome.storage.local.set(info);
        },

        get: function () {
            chrome.storage.local.get({
                user: null,
                token: null,
                time: null,
                sort: null,
                sortId: null
            }, function (items) {
                //chrome.tabs.sendMessage(main.tabId, {type : 'sendUser', user : items.user, token : items.token, time : items.time}, function(response){});
                main.userInfo = items;
            });
        },

        remove: function () {
            chrome.storage.local.remove(['user', 'token', 'time', 'sort', 'sortId']);
        }
    };
}();
userInfo.get();

var matchInfo = function () {
    return {
        set: function (info) {
            chrome.storage.local.set({
                matchInfo: info
            });
        },

        get: function () {
            chrome.storage.local.get({
                matchInfo: null
            }, function (items) {
                main.matchInfo = items['matchInfo'];
            });
        }
    };
}();
matchInfo.get();


chrome.browserAction.onClicked.addListener(function (tab) {
//    if(tab.id == main.tabId){
//        chrome.tabs.executeScript(tab ? tab.id : null, {file : 'tab.js'});
//        return;
//    }
    main.tabId = tab.id;
    chrome.tabs.insertCSS(tab ? tab.id : null, {file: 'tab.css'});
    chrome.tabs.executeScript(tab ? tab.id : null, {file: 'jquery-2.0.0.min.js'});
    chrome.tabs.executeScript(tab ? tab.id : null, {file: 'spin.min.js'});
    chrome.tabs.executeScript(tab ? tab.id : null, {file: 'tab.js'});
//    chrome.storage.local.get({'token' : null, time : 0}, function(items){
//        if(items.token && items.time && (items.time + main.config.exprise) <= +new Date()){
//            main.option.close();
//        }else{
//            main.option.open(tab);
//        }
//    });
});


(function (global) {
    'use strict';
    // existing version for noConflict()
    var _Base64 = global.Base64;
    var version = "2.1.2";
    // if node.js, we use Buffer
    var buffer;
    if (typeof module !== 'undefined' && module.exports) {
        buffer = require('buffer').Buffer;
    }
    // constants
    var b64chars
        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var b64tab = function (bin) {
        var t = {};
        for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
        return t;
    }(b64chars);
    var fromCharCode = String.fromCharCode;
    // encoder stuff
    var cb_utob = function (c) {
        if (c.length < 2) {
            var cc = c.charCodeAt(0);
            return cc < 0x80 ? c
                : cc < 0x800 ? (fromCharCode(0xc0 | (cc >>> 6))
            + fromCharCode(0x80 | (cc & 0x3f)))
                : (fromCharCode(0xe0 | ((cc >>> 12) & 0x0f))
            + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
            + fromCharCode(0x80 | ( cc & 0x3f)));
        } else {
            var cc = 0x10000
                + (c.charCodeAt(0) - 0xD800) * 0x400
                + (c.charCodeAt(1) - 0xDC00);
            return (fromCharCode(0xf0 | ((cc >>> 18) & 0x07))
            + fromCharCode(0x80 | ((cc >>> 12) & 0x3f))
            + fromCharCode(0x80 | ((cc >>> 6) & 0x3f))
            + fromCharCode(0x80 | ( cc & 0x3f)));
        }
    };
    var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
    var utob = function (u) {
        return u.replace(re_utob, cb_utob);
    };
    var cb_encode = function (ccc) {
        var padlen = [0, 2, 1][ccc.length % 3],
            ord = ccc.charCodeAt(0) << 16
                | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
                | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0)),
            chars = [
                b64chars.charAt(ord >>> 18),
                b64chars.charAt((ord >>> 12) & 63),
                padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
                padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
            ];
        return chars.join('');
    };
    var btoa = global.btoa ? function (b) {
        return global.btoa(b);
    } : function (b) {
        return b.replace(/[\s\S]{1,3}/g, cb_encode);
    };
    var _encode = buffer
            ? function (u) {
            return (new buffer(u)).toString('base64')
        }
            : function (u) {
            return btoa(utob(u))
        }
        ;
    var encode = function (u, urisafe) {
        return !urisafe
            ? _encode(u)
            : _encode(u).replace(/[+\/]/g, function (m0) {
            return m0 == '+' ? '-' : '_';
        }).replace(/=/g, '');
    };
    var encodeURI = function (u) {
        return encode(u, true)
    };
    // decoder stuff
    var re_btou = new RegExp([
        '[\xC0-\xDF][\x80-\xBF]',
        '[\xE0-\xEF][\x80-\xBF]{2}',
        '[\xF0-\xF7][\x80-\xBF]{3}'
    ].join('|'), 'g');
    var cb_btou = function (cccc) {
        switch (cccc.length) {
            case 4:
                var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                        | ((0x3f & cccc.charCodeAt(1)) << 12)
                        | ((0x3f & cccc.charCodeAt(2)) << 6)
                        | (0x3f & cccc.charCodeAt(3)),
                    offset = cp - 0x10000;
                return (fromCharCode((offset >>> 10) + 0xD800)
                + fromCharCode((offset & 0x3FF) + 0xDC00));
            case 3:
                return fromCharCode(
                    ((0x0f & cccc.charCodeAt(0)) << 12)
                    | ((0x3f & cccc.charCodeAt(1)) << 6)
                    | (0x3f & cccc.charCodeAt(2))
                );
            default:
                return fromCharCode(
                    ((0x1f & cccc.charCodeAt(0)) << 6)
                    | (0x3f & cccc.charCodeAt(1))
                );
        }
    };
    var btou = function (b) {
        return b.replace(re_btou, cb_btou);
    };
    var cb_decode = function (cccc) {
        var len = cccc.length,
            padlen = len % 4,
            n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
                | (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
                | (len > 2 ? b64tab[cccc.charAt(2)] << 6 : 0)
                | (len > 3 ? b64tab[cccc.charAt(3)] : 0),
            chars = [
                fromCharCode(n >>> 16),
                fromCharCode((n >>> 8) & 0xff),
                fromCharCode(n & 0xff)
            ];
        chars.length -= [0, 0, 2, 1][padlen];
        return chars.join('');
    };
    var atob = global.atob ? function (a) {
        return global.atob(a);
    } : function (a) {
        return a.replace(/[\s\S]{1,4}/g, cb_decode);
    };
    var _decode = buffer
        ? function (a) {
        return (new buffer(a, 'base64')).toString()
    }
        : function (a) {
        return btou(atob(a))
    };
    var decode = function (a) {
        return _decode(
            a.replace(/[-_]/g, function (m0) {
                return m0 == '-' ? '+' : '/'
            })
                .replace(/[^A-Za-z0-9\+\/]/g, '')
        );
    };
    var noConflict = function () {
        var Base64 = global.Base64;
        global.Base64 = _Base64;
        return Base64;
    };
    // export Base64
    global.Base64 = {
        VERSION: version,
        atob: atob,
        btoa: btoa,
        fromBase64: decode,
        toBase64: encode,
        utob: utob,
        encode: encode,
        encodeURI: encodeURI,
        btou: btou,
        decode: decode,
        noConflict: noConflict
    };
    // if ES5 is available, make Base64.extendString() available
    if (typeof Object.defineProperty === 'function') {
        var noEnum = function (v) {
            return {value: v, enumerable: false, writable: true, configurable: true};
        };
        global.Base64.extendString = function () {
            Object.defineProperty(
                String.prototype, 'fromBase64', noEnum(function () {
                    return decode(this)
                }));
            Object.defineProperty(
                String.prototype, 'toBase64', noEnum(function (urisafe) {
                    return encode(this, urisafe)
                }));
            Object.defineProperty(
                String.prototype, 'toBase64URI', noEnum(function () {
                    return encode(this, true)
                }));
        };
    }
    // that's it!
})(window);



