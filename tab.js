(function($){
    if($.m2o){
        $.m2oInstance && $.m2oInstance.init();

        if($.m2oInstance.allInfo){
            $.m2oInstance.start($.m2oInstance.allInfo);
        }else{
            $.m2oInstance.createUser();
            $.m2oInstance.initEvents();
        }
        return;
    }

    $.m2o = function(){
        this.box = null;
    }

    $.extend($.m2o.prototype, {
        init : function(){
            if(this.box) return;
            this.box = $('<div/>').attr({
                class : 'm2o-box'
            }).appendTo('body');
            this.createForm();
            this.exit();
        },

        createForm : function(){
            var html = '<div class="m2o-inner-wrapper">' +
                '<span class="m2o-tip"></span>' +
                '<span class="m2o-close"><span class="m2o-close-btn">关闭</span></span>' +
                '<div class="m2o-inner-box"></div>' +
                /*'<span class="m2o-hook"></span>' +*/
                '<span class="m2o-clear">退出</span>' +
                '</div>';
            this.box.html(html);
            this.innerBox = this.box.find('.m2o-inner-box');
            this.tip = this.box.find('.m2o-tip');

        },

        createUser:function(){
            var usrform='<form class="m2o-user-form" onsubmit="return false;">' +
                '<div class="m2o-uf-head">帐号登录</div>' +
                '<div class="m2o-uf-item"><input name="name" placeholder="帐号"/></div>' +
                '<div class="m2o-uf-item"><input name="password" type="password" placeholder="密码"/></div>' +
                '<div class="m2o-uf-option"><input type="submit" value="登录"/></div>' +
                '</form>';
            this.innerBox.html(usrform);
            this.userForm = this.box.find('.m2o-user-form');
        },

        createCj: function(){
            var cj='<form class="m2o-cj-form" method="post" onsubmit="return false;">' +
                '<span class="m2o-fullscreen">全屏</span>' +
                '<div class="m2o-item"><label>分类：</label><div class="m2o-each"><select class="m2o-sort_id"></select></div></div>' +
                '<div class="m2o-item"><label>标题：</label><div class="m2o-each"><input class="m2o-title"/></div></div>' +
                '<div class="m2o-item"><label>作者：</label><div class="m2o-each"><input class="m2o-author"/></div></div>' +
                '<div class="m2o-item"><label>时间：</label><div class="m2o-each"><input class="m2o-date"/></div></div>' +
                '<div class="m2o-item"><label>来源：</label><div class="m2o-each"><input class="m2o-source"/></div></div>' +
                '<div class="m2o-item"><label>关键字：</label><div class="m2o-each"><input class="m2o-keywords"/></div></div>' +
                '<div class="m2o-item"><label>摘要：</label><div class="m2o-each"><textarea class="m2o-brief"></textarea></div></div>' +
                '<div class="m2o-item"><label>内容：</label><div class="content-box m2o-each"><textarea class="m2o-content"></textarea></div></div>' +
                '<div class="m2o-option"><div class="m2o-img-local-tip">发现内容中有图片，正在进行本地化</div><input type="submit" value="提交"/></div>' + /*<span class="m2o-img-local">发现内容中有图片，<button class="m2o-img-local-btn" onclick="return false;">进行本地化</button></button></span>*/
                '</form>';
            this.innerBox.html(cj);
            this.cjForm = this.box.find('.m2o-cj-form');
            this.contentBox = this.box.find('.content-box');
        },

        _sqOut : function(){
            this.box.html('<div class="m2o-sq-error">未授权或者授权已到期</div>');
        },

        exit:function(){
            var _this=this;
            this.box.find('.m2o-close-btn').on({
                click : function(){
                    setTimeout(function(){
                        _this.box.remove();
                        _this.box = null;
                    }, 1);
                }
            });
            this.box.find('.m2o-clear').on({
                click : function(){
                    $.localStorage.remove();
                    _this.login();
                    _this.allInfo=null;
                    chrome.runtime.sendMessage({type : 'removeUser'}, function(response){});
                }
            });
        },

        initEvents : function(){
            var _this = this;
            this.userForm.submit(function(){
                var $this = $(this);
                var name = $this.find('input[name="name"]').val();
                var password = $this.find('input[name="password"]').val();

                var domain={
                    dom:name.split("@")[1]
                };
                var confUrl="http://open.cloud.hoge.cn/news_clip.php?token=pjWjVxAlDUbMvLUa3cBabOKTPjK4m36gerNZARrd&host="+domain.dom;
                $.ajax({
                    method: "GET",
                    url: confUrl,
                    async: false
                }).done(function( data ) {
                    _this.sysconfig=data.result;
                });

                //console.log(_this.sysconfig,"接口获取");

                chrome.runtime.sendMessage({type : 'setter',info:_this.sysconfig}, function(response){
                    //console.log(response);
                    $.m2oInstance.start(response);
                });

                var data = {
                    username : name.split("@")[0],
                    password : password,
                    appid : _this.sysconfig.appid,
                    appkey : _this.sysconfig.appkey
                };
                var submit = $this.find('input[type="submit"]');
                submit.prop('disabled', true);

                _this.ajax(_this.sysconfig.user, 'POST', data, function(data){
                    submit.prop('disabled', false);
                    if(data['ErrorCode']){
                        _this.tipExcute('登录错误', 0);
                    }else{
                        data = data[0];
                        var info = {
                            user : name,
                            token : data['token'],
                            time : data['expired_time'],
                            sort : data['sort']
                        };
                        chrome.runtime.sendMessage({
                            type : 'setUser',
                            info : info
                        },function(response){
                            _this.allInfo=response;

                        });
                        _this.tipExcute('登陆成功', 1);
                        _this.caiji(info);
                    }
                });
                return false;
            });


        },

        cjEvent:function(){
            var _this = this;
            this.cjForm.submit(function(){
                if(_this.contentBox.find('.m2o-cpage .spinner').length){
                    if(!confirm('还有内容正在采集中...确定要提交？')){
                        return false;
                    }
                }
                var content = [];
                var noIframe = _this.contentBox.find('.m2o-content');
                if(noIframe.length){
                    content.push(noIframe.val());
                }else{
                    var iframes = _this.contentBox.find('.m2o-cbox iframe');
                    iframes.each(function(){
                        try{
                            content.push($(this).contents().find('body').html());
                        }catch(e){}
                    });
                }



                content = content.join(_this.sysconfig.page);
                var data = {
                    access_token : _this.userInfo.token,
                    source_url : location.href,
                    content : content
                };
                _this.cjForm.find('.m2o-each select, .m2o-each input, .m2o-each textarea').each(function(){
                    var name = $(this).attr('class');
                    name = name.replace(/m2o-/, '');
                    var val = $.trim($(this).val());
                    if(!val){
                        //val = $('meta[name="'+ name +'"]').attr('content');
                    }
                    data[name] = val || '';
                });
                /*if(_this.currentMatchInfo && _this.currentMatchInfo['name']){
                 data['source'] = _this.currentMatchInfo['name'];
                 }*/

                _this.materialIds && (data['material_ids'] = _this.materialIds);
                _this.ajax(_this.sysconfig.save, 'post', data, function(data){
                    if(data['ErrorCode']){
                        _this.tipExcute(data['ErrorCode'], true);
                        return;
                        //_this.login();
                    }else{
                        _this.tipExcute('采集成功！', true);
                        setTimeout(function(){
                            _this.box.remove();
                            _this.box=null;
                        }, 1000);
                    }
                });
                return false;
            });

            this.box.find('.m2o-img-local-btn').on({
                click : function(){
                    var imgs = $(this).parent().data('imgs');
                    if(!imgs && !imgs.length){
                        return false;
                    }
                    var loading = $('<span style="display:inline-block;width:20px;height:20px;vertical-align:middle;"></span>').insertAfter(this);
                    _this.spin(loading[0], '#333');
                    var $this = $(this).hide();
                    var loop = 0;
                    var total = imgs.length;
                    var localImgInfos = {};
                    var callback = function(json){
                        loop++;
                        json[0] && $.extend(localImgInfos, json[0]);
                        if(loop == total){
                            _this._getIframes().each(function(){
                                $(this).contents().find('img').each(function(){
                                    var $this = $(this);
                                    var src = $this.prop('src');
                                    var info = localImgInfos[src];
                                    if(info){
                                        $this.attr('src', info['path'] + info['dir'] + '640x/' + info['filename']);
                                        $this.attr('class', 'image');
                                        $this.attr('imageid', info['id']);
                                    }
                                });
                            });
                            $this.parent().css('color', 'green').html('本地化完成!');
                        }
                    };
                    $.each(imgs, function(index, url){
                        $.post(
                            _this.sysconfig.local,
                            {url : url, access_token : _this.userInfo.token},
                            function(json){
                                callback(json);
                            },
                            'json'
                        );
                    });
                    return false;
                }
            });

            this.box.on({
                click : function(event){
                    var $this = $(this);

                    var delegate = $(event.delegateTarget);
                    var cname = 'm2o-full-state';
                    var state = delegate.hasClass(cname);
                    if(state){
                        delegate.removeClass(cname);
                        $this.html('全屏');
                    }else{
                        delegate.addClass(cname);
                        $this.html('返回');
                    }
                    return false;
                }
            }, '.m2o-fullscreen');
        },

        tipExcute : function(string, status){
            var _this = this;
            if(_this.tipTimer) clearTimeout(_this.tipTimer);
            _this.tip.show().html(string).addClass('m2o-on').addClass(status ? 'm2o-ok' : 'm2o-no');
            _this.tipTimer = setTimeout(function(){
                _this.tip.removeClass('m2o-on, m2o-ok, m2o-no');
                setTimeout(function(){
                    _this.tip.hide();
                }, 1000);
            }, 1000);
        },

        showUserForm : function(){
            // this._position(1);
            this.createUser();
            this.initEvents();
        },

        showCjForm : function(){
            //this._position(2);
            this.createCj();
            this.cjEvent();
        },

        parseMatch : function(match){
            var returnMatch = [];
            match = match.split('&&');
            $.each(match, function(i, _match){
                _match = _match.split('::');
                returnMatch.push({
                    get : _match[0],
                    not : function(){
                        return _match[1] ? _match[1].split('||') : null;
                    }()
                });
            });
            return returnMatch;
        },

        execMatch : function(someMatch, doc, type){
            if(!someMatch) return '';
            doc = doc || $(document);
            var val = '';
            $.each(someMatch, function(index, match){
                $(match['get'], doc).each(function(){
                    var clone = $(this).clone();
                    match['not'] && $.each(match['not'], function(i, not){
                        clone.find(not).remove();
                    });
                    clone.find('img').each(function(){
                        $(this).attr('src', this.src);
                    });
                    clone.find('a').each(function(){
                        $(this).attr('href', this.href);
                    });
                    //val += clone.html();
                    //val += clone[0].outerHTML;
                    val += (type == 'content' ? clone[0].outerHTML : clone.html());
                });
            });
            return val;
        },

        doTitle : function(match){
            var val = '';
            if(match){
                var matchInfo = this.parseMatch(match);
                val = $.trim(this.execMatch(matchInfo));
            }
            if(!val){
                val = $('title').text() || '';
            }
            this.box.find('.m2o-title').val(val);
        },

        doAuthor : function(match){
            var val = '';
            if(match){
                var matchInfo = this.parseMatch(match);
                val = $.trim(this.execMatch(matchInfo));
            }
            if(!val){
                //val = $('meta[name="author"]').attr('content') || '';
            }
            this.box.find('.m2o-author').val(val);
        },

        doDate : function(match){
            var matchInfo = this.parseMatch(match);
            var val = this.execMatch(matchInfo);
            this.box.find('.m2o-date').val(val ? $.trim(val) : '');
        },

        doSource : function(match){
            var matchInfo = this.parseMatch(match);
            var val = $.trim(this.execMatch(matchInfo));
            val = $.trim(val.replace(/来源[：:]/, ''));
            if(!val && this.currentMatchInfo && this.currentMatchInfo['name']){
                val = this.currentMatchInfo['name'];
            }
            this.box.find('.m2o-source').val(val);
        },

        doKeywords : function(match){
            var val = '';
            if(match){
                var matchInfo = this.parseMatch(match);
                val = $.trim(this.execMatch(matchInfo));
            }
            if(!val){
                val = $('meta[name="keywords"]').attr('content') || '';
            }
            this.box.find('.m2o-keywords').val(val);
        },

        doBrief : function(match){
            var val = '';
            if(match){
                var matchInfo = this.parseMatch(match);
                val = $.trim(this.execMatch(matchInfo));
            }
            if(!val){
                val = $('meta[name="description"]').attr('content') || '';
            }
            this.box.find('.m2o-brief').val(val);
        },

        _createContentIframe : function(container, content){
            var iframe = $('<iframe/>').attr({
                frameborder : 0
            }).appendTo(container || this.contentBox);
            var iframeDoc = iframe[0].contentDocument;
            try{
                iframeDoc.open('text/html', 'replace');
                iframeDoc.write(content);
                iframeDoc.close();
                iframeDoc.body.contentEditable = true;
                $(iframeDoc.head).append('<style>body{font-size:12px;max-width:660px;margin:0 auto;padding:5px;}img{max-width:300px;}</style>');
            }catch(e){}
        },

        _createContentBox : function(index){
            var box = $('<div/>').appendTo(this.contentBox).attr({
                'index': index,
                'class': 'm2o-cbox'
            }).html('<div class="m2o-cpage"><span class="m2o-cspin"></span>第' + index + '页<span>采集中...</span></div>');
            this.spin(box.find('span:first')[0]);
        },

        _refreshContentBox : function(pageInfo){
            var box = this.contentBox.find('.m2o-cbox[index="' + pageInfo['index'] + '"]');
            box.find('.m2o-cpage span').remove();
            this._createContentIframe(box, pageInfo['html']);
        },

        _getIframes : function(){
            return this.contentBox.find('.m2o-cbox iframe');
        },

        _collectContentComplete : function(totalPages){
            if(totalPages.length == 1){
                this.contentBox.find('.m2o-cpage').remove();
            }

            var _this = this;
            var imgs = [];
            var iframes = _this._getIframes();
            iframes.each(function(){
                try{
                    var contentBody = $(this).contents().find('body');
                    if(contentBody[0]){
                        contentBody.find('img').each(function(){
                            imgs.push($(this).attr('src'));
                        });
                    }
                }catch(e){}
            });

            (function(){
                if(!imgs.length) return;

                var localTip = _this.cjForm.find('.m2o-img-local-tip').show();
                var loading = $('<span style="display:inline-block;margin-left:10px;width:20px;height:20px;vertical-align:middle;"></span>').appendTo(localTip);
                _this.spin(loading[0]);
                var loop = 0;
                var total = imgs.length;
                var localImgInfos = {};
                var callback = function(json){
                    loop++;
                    json[0] && $.extend(localImgInfos, json[0]);
                    if(loop == total){
                        _this._getIframes().each(function(){
                            $(this).contents().find('img').each(function(){
                                var $this = $(this);
                                var src = $this.prop('src');
                                var info = localImgInfos[src];
                                if(info){
                                    $this.attr('src', info['path'] + '640x/' + info['dir'] + info['filename']);
                                    $this.attr('class', 'image');
                                    $this.attr('imageid', info['id']);
                                }
                            });
                        });
                        localTip.hide();
                        var materialIds = [];
                        $.each(localImgInfos, function(index, info){
                            materialIds.push(info['id']);
                        });
                        _this.materialIds = materialIds.length ? materialIds.join(',') : 0;
                    }
                };

                //console.log(_this.sysconfig,'使用变量');

                $.each(imgs, function(index, url){
                    $.post(
                        _this.sysconfig.local,
                        {url : url, access_token : _this.userInfo.token},
                        function(json){
                            callback(json);
                        },
                        'json'
                    );
                });

            })();
            /*var local = this.cjForm.find('.m2o-img-local').data('imgs', imgs);
             if(imgs.length){
             local.show();
             }*/
        },

        doPage : function(matchInfo){
            var page = $.trim(matchInfo['page']);
            var totalPages = [];
            if(page){
                var getPageNumber = function(text){
                    var number = parseInt(text);
                    if(!number){
                        var numberMatch = text.match(/\d+/);
                        if(numberMatch){
                            number = numberMatch[0];
                        }
                    }
                    return number;
                };
                var normal = matchInfo['page_normal'];
                var current = matchInfo['page_current'];
                var type = matchInfo['page_type'];
                var pageBox = $(page);

                if(pageBox.length && pageBox.find(normal).length){
                    var currentNumber = -1;
                    if(current){
                        currentNumber = getPageNumber(pageBox.find(current).text());
                    }
                    var otherPages = pageBox.find(normal);
                    var otherLinks = {};
                    var otherNumber = 0;
                    var maxNumber = 0;
                    otherPages.each(function(){
                        var pageNumber = getPageNumber($(this).text());
                        if(!pageNumber){
                            return;
                        }
                        var pageHref = '';
                        if(type == 'href'){
                            pageHref = $(this).attr('href');
                        }else if(type == 'click'){
                            pageHref = $(this).attr('href');
                        }
                        otherLinks[pageNumber] = pageHref;
                        otherNumber++;
                        if(pageNumber > maxNumber){
                            maxNumber = pageNumber;
                        }
                    });

                    if(currentNumber == -1 && maxNumber != otherNumber){
                        $.each(new Array(maxNumber), function(i, n){
                            if(!otherLinks[i + 1]){
                                currentNumber = i + 1;
                                return false;
                            }
                        });
                    }


                    var totalNumber = currentNumber == -1 ? otherNumber : ++otherNumber;
                    $.each(new Array(totalNumber), function(index, val){
                        index++;
                        if(index == currentNumber){
                            totalPages.push({
                                index : index,
                                current : true
                            });
                        }else{
                            totalPages.push({
                                index : index,
                                href : otherLinks[index]
                            });
                        }
                    });
                }
            }
            if(!totalPages.length){
                totalPages.push({
                    index : 1,
                    current : true
                });
            }
            this.contentBox.empty();
            var _this = this;
            var contentMatch = this.contentMatch = this.parseMatch(matchInfo['content']);
            var totalNumber = totalPages.length;
            var loopNumber = 0;
            var completeCallback = function(index){
                loopNumber++;
                _this._refreshContentBox(totalPages[index]);
                if(loopNumber == totalNumber){
                    _this._collectContentComplete(totalPages);
                }
            };
            var setTime = 0;
            $.each(totalPages, function(index, eachPage){
                _this._createContentBox(eachPage['index']);
                if(eachPage['current']){
                    totalPages[index]['html'] = _this.execMatch(contentMatch, null, 'content');
                    completeCallback(index);
                }else{
                    setTimeout(function(){
                        _this._doPageIframe(eachPage['href'], function(content){
                            totalPages[index]['html'] = content;
                            completeCallback(index);
                        });
                    }, setTime);
                    setTime += 3000;
                }
            });
        },

        _doPageIframe : function(href, callback){
            var _this = this;
            var iframe = $('<iframe style="display:none;"></iframe>').appendTo('body');
            iframe.on('load', function(){
                var content = _this.execMatch(_this.contentMatch, $(this).contents(), 'content');
                callback && callback(content);
            });
            iframe.attr('src', href);
            return;
            setTimeout(function(){
                iframe[0].contentDocument.onreadystatechange = function(){
                    //console.log(event, 'heihei');
                }
            }, 0);
            return;

            iframe[0].onload = function(){
                timer && clearInterval(timer);
            }

            var timer = setInterval(function(){
                var doc = iframe[0].contentDocument;
                //console.log(doc, doc.defaultView.location.href, 777);
                if(doc.defaultView.location.href != 'about:blank'){
                    doc.onreadystatechange = function(event){
                        //console.log(doc, event, 777);
                        if(doc.readyState && doc.readyState == 'complete'){
                            var content = _this.execMatch(_this.contentMatch, doc);
                            callback && callback(content);
                        }
                    };
                    clearInterval(timer);
                }
            }, 50);
        },

        fillContent : function(matchInfo){
            matchInfo['title'] && this.doTitle(matchInfo['title']);
            this.doAuthor(matchInfo['author']);
            matchInfo['date'] && this.doDate(matchInfo['date']);
            matchInfo['source'] && this.doSource(matchInfo['source']);
            this.doKeywords(matchInfo['keywords']);
            this.doBrief(matchInfo['brief']);
            this.doPage(matchInfo);
        },

        ajax : function(url, type, data, callback, cb404){
            $.ajax({
                url : url,
                type : type,
                dataType : 'json',
                data : data,
                cache : false,
                success : function(data, status, jqXHR){
                    callback && callback(data);
                },
                complete : function(json){

                },
                statusCode : {
                    404 : function(){
                        cb404 && cb404();
                    }
                }
            });
        },

        setUserInfo : function(info){
            this.userInfo = info;
        },

        start : function(allInfo){
            this.sysconfig = $.extend({}, allInfo.configs);
            if(!this.sysconfig['checkResult']){
                this._sqOut();
                return false;
            }
            this.isLoad(allInfo);
        },

        isLoad:function(coninfo){

            var _this = this;
            var info = $.extend({}, coninfo.userinfo);
            //console.log(info);
            if(!info || !info['token'] || info['time'] * 1000 /*+ sysconfig.exprise*/ < +new Date()){
                _this.login();
            }else{
                _this.sysconfig=coninfo.configs;
                _this.allInfo=coninfo;
                //console.log(_this.sysconfig,"二次登陆定义");
                _this.caiji(info);

            }
        },

        login : function(){
            chrome.runtime.sendMessage({type : 'removeUser'}, function(response){});
            this.showUserForm();
        },

        caiji : function(info){
            this.setUserInfo(info);
            this.showCjForm();
            this.initSort();
            this.getMatch();
        },

        initSort : function(){
            var sortSelect = this.cjForm.find('.m2o-sort_id');
            var sortId = this.userInfo['sortId'];
            var options = '';
            if(this.userInfo['sort']){
                $.each(this.userInfo['sort'], function(i, option){
                    var selected = '';
                    if(sortId && sortId == option['id']){
                        selected = 'selected="selected"';
                    }
                    options += '<option value="' + option['id'] + '" ' + selected + ' >' + option['name'] + '</option>';
                });
            }else{
                options = '<option value="0">无</option>';
            }
            sortSelect.html(options);

            sortSelect.on({
                change : function(){
                    var sortId = $(this).val();
                    chrome.runtime.sendMessage({type : 'saveSortId', sortId : sortId}, function(response){

                    });
                }
            });
        },

        getMatch : function(){
            var storageData = $.localStorage.get();
            var matchInfo = this.currentMatchInfo = this._getMatch(storageData);
            if(!matchInfo){
                this.ajaxGetMatch();
            }else{
                this.fillContent(matchInfo);
            }
        },

        _getMatch : function(storageData){
            var currentUrl = this.parseUrl()['href'];
            var matchInfo = false;
            if(storageData){
                $.each(storageData, function(index, info){
                    if(!info['url'] || info['url'] == '*'){
                        matchInfo = info;
                        return false;
                    }
                    var reg = new RegExp(info['url']);
                    if(currentUrl.match(reg)){

                        matchInfo = info;
                        return false;
                    }
                });
            }
            return matchInfo;
        },

        ajaxGetMatch : function(file){
            var _this = this;
            var jsonConfig = this.jsonFile(file);
            var noMatch = function(){
                alert('该网站没有规则，无法自动采集，可以先手动采集！');
            };
            this.ajax(jsonConfig, 'get', {}, function(allInfo){
                $.localStorage.set(allInfo);
                var matchInfo = _this.currentMatchInfo = _this._getMatch(allInfo);
                if(matchInfo){
                    _this.fillContent(matchInfo);
                }else{
                    noMatch();
                }
            }, file ? noMatch : function(){
                var host = _this.parseUrl()['host'];
                _this.ajaxGetMatch(host.substr(host.indexOf('.') + 1));
            });
        },

        jsonFile : function(file){
            return this.sysconfig.match + (file ? file : this.parseUrl()['host']) + '.json?_t=' + Math.random();
        },

        parseUrl : function(url){
            return location;
        },

        spin : function(target, color){
            var opts = {
                lines: 11, // The number of lines to draw
                length: 0, // The length of each line
                width: 4, // The line thickness
                radius: 8, // The radius of the inner circle
                corners: 1, // Corner roundness (0..1)
                rotate: 0, // The rotation offset
                direction: 1, // 1: clockwise, -1: counterclockwise
                color: color || '#fff', // #rgb or #rrggbb or array of colors
                speed: 1, // Rounds per second
                trail: 33, // Afterglow percentage
                shadow: false, // Whether to render a shadow
                hwaccel: false, // Whether to use hardware acceleration
                className: 'spinner', // The CSS class to assign to the spinner
                zIndex: 2e9, // The z-index (defaults to 2000000000)
                top: 'auto', // Top position relative to parent in px
                left: 'auto' // Left position relative to parent in px
            };
            new Spinner(opts).spin(target);
        }
    });

    $.extend($, {
        localStorage : {
            _key : 'm2o-match-storage',
            _storage : localStorage,
            _exprise : 7 * 24 * 3600 * 14,
            //add : function(domain, match, matchInfo){
            //    var storageData = this._get() || {};
            //    var domainKey = domain;
            //    if(!storageData[domainKey]){
            //        storageData[domainKey] = {};
            //    }
            //    matchInfo['exprise'] = +new Date() + this._exprise;
            //    storageData[domainKey][match] = matchInfo;
            //    this._set(storageData);
            //},
            //
            //get : function(domain){
            //    return (this._get() || {})[domain];
            //},
            //
            //remove : function(domain, match){
            //    var storageData = this._get() || {};
            //    var domainKey = domain;
            //    if(storageData[domainKey]){
            //        delete storageData[domainKey][match];
            //    }
            //    this._set(storageData);
            //},
            //
            //_get : function(){
            //    var info = this._storage.getItem(this._key);
            //    return info ? JSON.parse(info) : '';
            //},
            //
            //_set : function(value){
            //    return this._storage.setItem(this._key, JSON.stringify(value));
            //},

            get : function(){
                return this._get() || {};
            },

            set : function(matchInfo){
                this._set(matchInfo);
            },

            remove : function(){
                this._storage.removeItem(this._key);
            },

            _get : function(){
                var info = this._storage.getItem(this._key);
                return info ? JSON.parse(info) : '';
            },

            _set : function(value){
                return this._storage.setItem(this._key, JSON.stringify(value));
            }
        }
    });

    $.m2oInstance = $.m2oInstance || (new $.m2o());
    $.m2oInstance.init();

    chrome.runtime.onMessage.addListener(function(message, sender, senderResponse){
        switch(message.type){
            case 'sendUser':
                break;
        }
    });

    chrome.runtime.sendMessage({type : 'getUser'}, function(response){
        //console.log(response,'getdata');
        $.m2oInstance.isLoad(response);
    });

})(jQuery);