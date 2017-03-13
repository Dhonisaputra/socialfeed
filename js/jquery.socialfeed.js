
Array.prototype.diff = function(arr2) {
    var ret = [];
    for(var i in this) {   
        if(arr2.indexOf( this[i] ) > -1){
            ret.push( this[i] );
        }
    }
    return ret;
};


if (typeof Object.create !== 'function') {
    Object.create = function(obj) {
        function F() {}
        F.prototype = obj;
        return new F();
    };
}

(function($, window, document, undefined) {
    $.fn.socialfeed = function(_options) {

        var   _glob_records = []
        var   _glob_media = []

        var defaults = {
            plugin_folder: '', // a folder in which the plugin is located (with a slash in the end)
            template: false, // a path to the template file
            show_media: false, // show images of attachments if available
            media_min_width: 300,
            length: 500, // maximum length of post message shown
            date_format: 'll',
            date_locale: 'en',
            update_period: undefined,
            onRender: function(event, data)
            {

            },
            raw: function(event, data)
            {

            }
        };
        //---------------------------------------------------------------------------------
        var options = $.extend(defaults, _options),
            container = $(this),
            template,
            social_networks = ['facebook', 'instagram', 'vk', 'google', 'blogspot', 'twitter', 'pinterest', 'rss', 'weibo'],
            posts_to_load_count = 0,
            loaded_post_count = 0,
            diff = social_networks.diff(Object.keys(_options));

        $.fn.socialfeed.options = options;
        // container.empty().css('display', 'block');
        //---------------------------------------------------------------------------------

        //---------------------------------------------------------------------------------
        // This function performs consequent data loading from all of the sources by calling corresponding functions
        function calculatePostsToLoadCount() {
            var promises = [];
            social_networks.forEach(function(network) {
                var def = new $.Deferred();
                if (options[network]) {
                    if (options[network].accounts) {
                        if(typeof options[network].limit == 'number')
                        {
                            posts_to_load_count += options[network].limit * options[network].accounts.length;
                            def.resolve(posts_to_load_count);
                        }
                    } else if (options[network].urls ){
                        if(typeof options[network].limit == 'number')
                        {
                            posts_to_load_count += options[network].limit * options[network].urls.length;
                            def.resolve(posts_to_load_count);
                        }
                    } else {
                        if(typeof options[network].limit == 'number')
                        {
                            posts_to_load_count += options[network].limit;
                            def.resolve(posts_to_load_count);
                        }
                    }
                    promises.push(def);
                }
            });
            return $.when.apply(undefined, promises).promise();
        }


        function fireCallback() {
            var fire = true;
            /*$.each(Object.keys(loaded), function() {
                if (loaded[this] > 0)
                    fire = false;
            });*/
        }

        var Utility = {
            request: function(url, callback) {
                $.ajax({
                    url: url,
                    dataType: 'jsonp',
                    success: callback
                });
            },
            get_request: function(url, callback) {
                $.get(url, callback, 'json');
            },
            wrapLinks: function(string, social_network) {
                var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
                if (social_network === 'google-plus') {
                    string = string.replace(/(@|#)([a-z0-9_]+['])/ig, Utility.wrapGoogleplusTagTemplate);
                } else {
                    string = string.replace(exp, Utility.wrapLinkTemplate);
                }
                return string;
            },
            wrapLinkTemplate: function(string) {
                return '<a target="_blank" href="' + string + '">' + string + '<\/a>';
            },
            wrapGoogleplusTagTemplate: function(string) {
                return '<a target="_blank" href="https://plus.google.com/s/' + string + '" >' + string + '<\/a>';
            },
            shorten: function(string) {
                string = $.trim(string);
                if (string.length > options.length) {
                    return jQuery.trim(string).substring(0, options.length).split(" ").slice(0, -1).join(" ") + "...";
                } else {
                    return string;
                }
            },
            stripHTML: function(string) {
                if (typeof string === "undefined" || string === null) {
                    return '';
                }
                return string.replace(/(<([^>]+)>)|nbsp;|\s{2,}|/ig, "");
            },
            sort_feed : function(a,b) {
              if (a.dt_create < b.dt_create)
                return -1;
              if (a.dt_create > b.dt_create)
                return 1;
              return 0;
            }
        };

        function SocialFeedPost(social_network, data) {
            this.content                = data;
            this.content.social_network = social_network;
            this.content.attachment     = (this.content.attachment === undefined) ? '' : this.content.attachment;
            this.content.time_ago       = data.dt_create.locale(options.date_locale).fromNow();
            this.content.date           = data.dt_create.locale(options.date_locale).format(options.date_format);
            this.content.dt_create      = this.content.dt_create.valueOf();
            this.content.text           = Utility.wrapLinks(Utility.shorten(data.message + ' ' + data.description), data.social_network);
            this.content.moderation_passed = (options.moderation) ? options.moderation(this.content) : true;
            Feed[social_network].posts.push(this);

        }
        SocialFeedPost.prototype = {
            template_builder: function(data)
            {

                var rendered_html = Feed.template(data);
                if ($(container).children('[social-feed-id=' + data.id + ']').length !== 0) {
                    return false;
                }
                if ($(container).children().length === 0) {
                    $(container).append(rendered_html);
                } else {
                    var i = 0,
                        insert_index = -1;
                    $.each($(container).children(), function() {
                        if ($(this).attr('dt-create') < data.dt_create) {
                            insert_index = i;
                            return false;
                        }
                        i++;
                    });
                    $(container).append(rendered_html);
                    if (insert_index >= 0) {
                        insert_index++;
                        var before = $(container).children('div:nth-child(' + insert_index + ')'),
                            current = $(container).children('div:last-child');
                        $(current).insertBefore(before);
                    }

                }
                if (options.media_min_width) {

                    var query = '[social-feed-id=' + data.id + '] img.attachment';
                    var image = $(query);

                    // preload the image
                    var height, width = '';
                    var img = new Image();
                    var imgSrc = image.attr("src");

                    $(img).load(function() {

                        if (img.width < options.media_min_width) {
                            image.hide();
                        }
                        // garbage collect img
                        delete img;

                    }).error(function() {
                        // image couldnt be loaded
                        image.hide();

                    }).attr({
                        src: imgSrc
                    });

                }
            },
            render: function() {
                var data = this.content;
                data.dt_create_unix = moment(data.dt_create).unix();

                options.onRender(event, data)

                _glob_records.push(data);



                loaded_post_count++;

                // terkadang, sistem sudah menghitung jumlah sama karena yang lain masih dalam proses. jadi saya tambah jika media.length sama dengan unique media feed.length
                // console.log( loaded_post_count, posts_to_load_count, $.unique(_glob_media).length, diff.length )
                if (loaded_post_count == posts_to_load_count && $.unique(_glob_media).length == diff.length) {

                    $.fn.socialfeed.records = _glob_records.sort(Utility.sort_feed)
                    if(options.template || options.template_html)
                    {
                        $.each($.fn.socialfeed.records, function(a,b){
                            SocialFeedPost.prototype.template_builder(b)
                        })
                    }

                    if(options.callback){ options.callback($.fn.socialfeed.records); }
                    if(options.raw){ options.raw(event, $.fn.socialfeed.raw_records) }
                    
                }

            }

        };

        var Feed = {
            template: false,
            init: function() {

                Feed.getTemplate(function() {
                    social_networks.forEach(function(network) {
                        if (options[network]) {
                            if ( options[network].accounts ) {
                                //loaded[network] = 0;
                                options[network].accounts.forEach(function(account) {
                                    //loaded[network]++;
                                    Feed[network].getData(account);
                                });
                            } else if ( options[network].urls ) {
                                options[network].urls.forEach(function(url) {
                                    Feed[network].getData(url);
                                });
                            } else {
                                Feed[network].getData();
                            }
                        }
                    });
                });
            },
            getTemplate: function(callback) {
                if (Feed.template)
                    return callback();
                else {
                    if (options.template_html) {
                        Feed.template = doT.template(options.template_html);
                        return callback();
                    } else {
                        $.get(options.template, function(template_html) {
                            Feed.template = doT.template(template_html);
                            return callback();
                        });
                    }
                }
            },
            twitter: {
                posts: [],
                loaded: false,
                api: 'http://api.tweecool.com/',

                getData: function(account) {

                    var cb = new Codebird();
                    cb.setConsumerKey(options.twitter.consumer_key, options.twitter.consumer_secret);

                    // Allow setting your own proxy with Codebird
                    if (options.twitter.proxy !== undefined) {
                        cb.setProxy(options.twitter.proxy);
                    }

                    switch (account[0]) {
                        case '@':
                            var userid = account.substr(1);
                            cb.__call(
                                "statuses_userTimeline",
                                "id=" + userid + "&count=" + options.twitter.limit,
                                Feed.twitter.utility.getPosts,
                                true // this parameter required
                            );
                            break;
                        case '#':
                            var hashtag = account.substr(1);
                            cb.__call(
                                "search_tweets",
                                "q=" + hashtag + "&count=" + options.twitter.limit,
                                function(reply) {
                                    Feed.twitter.utility.getPosts(reply.statuses);
                                },
                                true // this parameter required
                            );
                            break;
                        default:
                    }
                },
                utility: {
                    getPosts: function(json) {
                        _glob_media.push('twitter');

                        if (json) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json.length
                            }else
                            {
                                posts_to_load_count += json.length;
                            }
                            $.fn.socialfeed.raw_records['twitter'] = json;
                            $.each(json, function() {
                                var element = this;
                                var post = new SocialFeedPost('twitter', Feed.twitter.utility.unifyPostData(element));
                                post.render();
                            });
                        }
                    },
                    unifyPostData: function(element) {
                        var post = {};
                        if (element.id) {
                            post.id = element.id_str;
                            //prevent a moment.js console warning due to Twitter's poor date format.
                            post.dt_create = moment(element.created_at, 'dd MMM DD HH:mm:ss ZZ YYYY');
                            post.author_link = 'http://twitter.com/' + element.user.screen_name;
                            post.author_picture = element.user.profile_image_url_https;
                            post.post_url = post.author_link + '/status/' + element.id_str;
                            post.author_name = element.user.name;
                            post.message = element.text;
                            post.description = '';
                            post.link = 'http://twitter.com/' + element.user.screen_name + '/status/' + element.id_str;
                            post.raw = element;
                            if (options.show_media === true) {
                                if (element.entities.media && element.entities.media.length > 0) {
                                    var image_url = element.entities.media[0].media_url_https;
                                    if (image_url) {
                                        post.attachment = '<img class="attachment" src="' + image_url + '" />';
                                    }
                                }
                            }
                        }
                        return post;
                    }
                }
            },
            facebook: {
                posts: [],
                graph: 'https://graph.facebook.com/',
                loaded: false,
                getData: function(account) {
                    var proceed = function(request_url){
                        Utility.request(request_url, Feed.facebook.utility.getPosts);
                    };

                    // jika tersedia option.facebook.url (digunakan untuk fetching pagination next / previous of facebook feed);
                    if(options.facebook.url)
                    {
                        proceed(options.facebook.url);
                        return false;
                    }

                    var fields = [ 'id','from','name','message','created_time','story','description','link' ];

                    // jika options.fields tersedia
                    if(options.facebook.fields && Array.isArray(options.facebook.fields) ) { fields  = $.unique( fields.concat(options.facebook.fields) ); }

                    fields = fields.join(',');
                    fields = '?fields='+fields;
                    fields += (options.show_media === true)?',picture,object_id':'';
                    var request_url, limit = '&limit=' + options.facebook.limit,
                        query_extention = '&access_token=' + options.facebook.access_token + '&callback=?';
                    switch (account[0]) {
                        case '@':
                            var username = account.substr(1);
                            Feed.facebook.utility.getUserId(username, function(userdata) {
                                if (userdata.id !== '') {
                                    request_url = Feed.facebook.graph + 'v2.4/' + userdata.id + '/posts'+ fields + limit + query_extention;
                                    proceed(request_url);
                                }
                            });
                            break;
                        case '!':
                            var page = account.substr(1);
                            request_url = Feed.facebook.graph + 'v2.4/' + page + '/feed'+ fields + limit + query_extention;
                            proceed(request_url);
                            break;
                        default:
                            proceed(request_url);
                    }
                },
                utility: {
                    getUserId: function(username, callback) {
                        var query_extention = '&access_token=' + options.facebook.access_token + '&callback=?';
                        var url = 'https://graph.facebook.com/' + username + '?' + query_extention;
                        var result = '';
                        $.get(url, callback, 'json');
                    },
                    prepareAttachment: function(element) {
                        var image_url = element.picture;
                        if (image_url.indexOf('_b.') !== -1) {
                            //do nothing it is already big
                        } else if (image_url.indexOf('safe_image.php') !== -1) {
                            image_url = Feed.facebook.utility.getExternalImageURL(image_url, 'url');

                        } else if (image_url.indexOf('app_full_proxy.php') !== -1) {
                            image_url = Feed.facebook.utility.getExternalImageURL(image_url, 'src');

                        } else if (element.object_id) {
                            image_url = Feed.facebook.graph + element.object_id + '/picture/?type=normal';
                        }
                        return '<img class="attachment" src="' + image_url + '" />';
                    },
                    getExternalImageURL: function(image_url, parameter) {
                        image_url = decodeURIComponent(image_url).split(parameter + '=')[1];
                        if (image_url.indexOf('fbcdn-sphotos') === -1) {
                            return image_url.split('&')[0];
                        } else {
                            return image_url;
                        }

                    },
                    getPosts: function(json) {
                        _glob_media.push('facebook');
                        if (json['data']) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json['data'].length
                            }else
                            {
                                posts_to_load_count += json['data'].length;
                            }

                            // save raw records
                            $.fn.socialfeed.raw_records['facebook'] = json;
                            // save paging
                            $.fn.socialfeed.paging['facebook'] = json.paging;
                            json['data'].forEach(function(element) {
                                var post = new SocialFeedPost('facebook', Feed.facebook.utility.unifyPostData(element));
                                post.render();
                            });
                        }
                    },
                    unifyPostData: function(element) {
                        var post = {},
                            text = (element.message) ? element.message : element.story;

                        post.id             = element.id;
                        post.dt_create      = moment(element.created_time);
                        post.author_link    = 'http://facebook.com/' + element.from.id;
                        post.author_picture = Feed.facebook.graph + element.from.id + '/picture';
                        post.author_name    = element.from.name;
                        post.name           = element.name || "";
                        post.message        = (text) ? text : '';
                        post.description    = (element.description) ? element.description : '';
                        post.link           = (element.link) ? element.link : 'http://facebook.com/' + element.from.id;
                        post.raw            = element
                        if (options.show_media === true) {
                            if (element.picture) {
                                var attachment = Feed.facebook.utility.prepareAttachment(element);
                                if (attachment) {
                                    post.attachment = attachment;
                                }
                            }
                        }
                        return post;
                    }
                }
            },
            google: {
                posts: [],
                loaded: false,
                api: 'https://www.googleapis.com/plus/v1/',
                getData: function(account) {
                    var request_url;
                    switch (account[0]) {
                        case '#':
                            var hashtag = account.substr(1);
                            request_url = Feed.google.api + 'activities?query=' + hashtag + '&key=' + options.google.access_token + '&maxResults=' + options.google.limit;
                            Utility.get_request(request_url, Feed.google.utility.getPosts);
                            break;
                        case '@':
                            var username = account.substr(1);
                            request_url = Feed.google.api + 'people/' + username + '/activities/public?key=' + options.google.access_token + '&maxResults=' + options.google.limit;
                            Utility.get_request(request_url, Feed.google.utility.getPosts);
                            break;
                        default:
                    }
                },
                utility: {
                    getPosts: function(json) {
                        _glob_media.push('google');
                        if (json.items) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json.items.length
                            }else
                            {
                                posts_to_load_count += json.items.length;
                            }
                            $.fn.socialfeed.raw_records['google'] = json;
                            $.each(json.items, function(i) {
                                var post = new SocialFeedPost('google', Feed.google.utility.unifyPostData(json.items[i]));
                                post.render();
                            });
                        }
                    },
                    unifyPostData: function(element) {
                        var post = {};

                        post.id = element.id;
                        post.attachment = '';
                        post.description = '';
                        post.dt_create = moment(element.published);
                        post.author_link = element.actor.url;
                        post.author_picture = element.actor.image.url;
                        post.author_name = element.actor.displayName;
                        post.raw = element;

                        if (options.show_media === true) {
                            if (element.object.attachments) {
                                $.each(element.object.attachments, function() {
                                    var image = '';
                                    if (this.fullImage) {
                                        image = this.fullImage.url;
                                    } else {
                                        if (this.objectType === 'album') {
                                            if (this.thumbnails && this.thumbnails.length > 0) {
                                                if (this.thumbnails[0].image) {
                                                    image = this.thumbnails[0].image.url;
                                                }
                                            }
                                        }
                                    }
                                    post.attachment = '<img class="attachment" src="' + image + '"/>';
                                });
                            }
                        }
                        post.message = element.title;
                        post.link = element.url;

                        return post;
                    }
                }
            },
            instagram: {
                posts: [],
                api: 'https://api.instagram.com/v1/',
                loaded: false,
                accessType: function() {
                    // If we have both the client_id and access_token set in options,
                    // use access_token for authentication. If client_id is not set
                    // then use access_token. If neither are set, log an error to console.
                    if (typeof options.instagram.access_token === 'undefined' && typeof options.instagram.client_id === 'undefined') {
                        console.log('You need to define a client_id or access_token to authenticate with Instagram\'s API.');
                        return undefined;
                    }
                    if (options.instagram.access_token) { options.instagram.client_id = undefined; }
                    options.instagram.access_type = (typeof options.instagram.client_id === 'undefined' ? 'access_token' : 'client_id');
                    return options.instagram.access_type;
                },
                getData: function(account) {
                    var url;
                    if(options.instagram.url)
                    {
                        url = options.instagram.url
                        Utility.request(url, Feed.instagram.utility.getImages);
                        return false;
                    }

                    // API endpoint URL depends on which authentication type we're using.
                    var accessType = this.accessType();
                    if (accessType !== 'undefined') {
                        var authTokenParams = options.instagram.access_type + '=' + options.instagram[options.instagram.access_type];
                    }
                    switch (account[0]) {
                        case '@':
                            var username = account.substr(1);
                            url = Feed.instagram.api + 'users/search/?q=' + username + '&' + authTokenParams + '&count=1' + '&callback=?';
                            Utility.request(url, Feed.instagram.utility.getUsers);
                            break;
                        case '#':
                            var hashtag = account.substr(1);
                            url = Feed.instagram.api + 'tags/' + hashtag + '/media/recent/?' + authTokenParams + '&' + 'count=' + options.instagram.limit + '&callback=?';
                            console.log(url)
                            Utility.request(url, Feed.instagram.utility.getImages);
                            break;
                        case '&':
                            var id = account.substr(1);
                            url = Feed.instagram.api + 'users/' + id + '/?' + authTokenParams + '&' + 'count=' + options.instagram.limit + '&callback=?';
                            Utility.request(url, Feed.instagram.utility.getUsers);
                        default:
                    }
                },
                utility: {
                    getImages: function(json) {
                        _glob_media.push('instagram');
                        if (json.data) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json.data.length
                            }else
                            {
                                posts_to_load_count += json.data.length;
                            }
                            $.fn.socialfeed.raw_records['instagram'] = json
                            // save paging
                            $.fn.socialfeed.paging['instagram'] = {next: json.pagination.next_url};
                            json.data.forEach(function(element) {
                                var post = new SocialFeedPost('instagram', Feed.instagram.utility.unifyPostData(element));
                                post.render();
                            });
                        }
                    },
                    getUsers: function(json) {

                        // API endpoint URL depends on which authentication type we're using.
                        if (options.instagram.access_type !== 'undefined') {
                            var authTokenParams = options.instagram.access_type + '=' + options.instagram[options.instagram.access_type];
                        }

                        if (!jQuery.isArray(json.data)) json.data = [json.data]
                        json.data.forEach(function(user) {
                            var url = Feed.instagram.api + 'users/' + user.id + '/media/recent/?' + authTokenParams + '&' + 'count=' + options.instagram.limit + '&callback=?';
                            Utility.request(url, Feed.instagram.utility.getImages);
                        });
                    },
                    unifyPostData: function(element) {
                        var post = {};

                        post.id             = element.id;
                        post.dt_create      = moment(element.created_time * 1000);
                        post.author_link    = 'http://instagram.com/' + element.user.username;
                        post.author_picture = element.user.profile_picture;
                        post.author_name    = element.user.full_name || element.user.username;
                        post.message        = (element.caption && element.caption) ? element.caption.text : '';
                        post.description    = '';
                        post.link           = element.link;
                        post.raw            = element;
                        if (options.show_media) {
                            post.attachment = '<img class="attachment" src="' + element.images.standard_resolution.url + '' + '" />';
                        }
                        return post;
                    }
                }
            },
            vk: {
                posts: [],
                loaded: false,
                base: 'http://vk.com/',
                api: 'https://api.vk.com/method/',
                user_json_template: 'https://api.vk.com/method/' + 'users.get?fields=first_name,%20last_name,%20screen_name,%20photo&uid=',
                group_json_template: 'https://api.vk.com/method/' + 'groups.getById?fields=first_name,%20last_name,%20screen_name,%20photo&gid=',
                getData: function(account) {
                    var request_url;

                    switch (account[0]) {
                        case '@':
                            var username = account.substr(1);
                            request_url = Feed.vk.api + 'wall.get?owner_id=' + username + '&filter=' + options.vk.source + '&count=' + options.vk.limit + '&callback=?';
                            Utility.get_request(request_url, Feed.vk.utility.getPosts);
                            break;
                        case '#':
                            var hashtag = account.substr(1);
                            request_url = Feed.vk.api + 'newsfeed.search?q=' + hashtag + '&count=' + options.vk.limit + '&callback=?';
                            Utility.get_request(request_url, Feed.vk.utility.getPosts);
                            break;
                        default:
                    }
                },
                utility: {
                    getPosts: function(json) {
                        _glob_media.push('vk');
                        if (json.response) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json.response.length
                            }else
                            {
                                posts_to_load_count += json.response.length;
                            }
                            $.fn.socialfeed.raw_records['vk'] = json
                            $.each(json.response, function() {
                                if (this != parseInt(this) && this.post_type === 'post') {
                                    var owner_id = (this.owner_id) ? this.owner_id : this.from_id,
                                        vk_wall_owner_url = (owner_id > 0) ? (Feed.vk.user_json_template + owner_id + '&callback=?') : (Feed.vk.group_json_template + (-1) * owner_id + '&callback=?'),
                                        element = this;
                                    Utility.get_request(vk_wall_owner_url, function(wall_owner) {
                                        Feed.vk.utility.unifyPostData(wall_owner, element, json);
                                    });
                                }
                            });
                        }
                    },
                    unifyPostData: function(wall_owner, element, json) {
                        var post = {};

                        post.id = element.id;
                        post.dt_create = moment.unix(element.date);
                        post.description = ' ';
                        post.raw = element;
                        post.message = Utility.stripHTML(element.text);
                        if (options.show_media) {
                            if (element.attachment) {
                                if (element.attachment.type === 'link')
                                    post.attachment = '<img class="attachment" src="' + element.attachment.link.image_src + '" />';
                                if (element.attachment.type === 'video')
                                    post.attachment = '<img class="attachment" src="' + element.attachment.video.image_big + '" />';
                                if (element.attachment.type === 'photo')
                                    post.attachment = '<img class="attachment" src="' + element.attachment.photo.src_big + '" />';
                            }
                        }

                        if (element.from_id > 0) {
                            var vk_user_json = Feed.vk.user_json_template + element.from_id + '&callback=?';
                            Utility.get_request(vk_user_json, function(user_json) {
                                var vk_post = new SocialFeedPost('vk', Feed.vk.utility.getUser(user_json, post, element, json));
                                vk_post.render();
                            });

                        } else {
                            var vk_group_json = Feed.vk.group_json_template + (-1) * element.from_id + '&callback=?';
                            Utility.get_request(vk_group_json, function(user_json) {
                                var vk_post = new SocialFeedPost('vk', Feed.vk.utility.getGroup(user_json, post, element, json));
                                vk_post.render();
                            });
                        }
                    },
                    getUser: function(user_json, post, element, json) {
                        post.author_name = user_json.response[0].first_name + ' ' + user_json.response[0].last_name;
                        post.author_picture = user_json.response[0].photo;
                        post.author_link = Feed.vk.base + user_json.response[0].screen_name;
                        post.link = Feed.vk.base + user_json.response[0].screen_name + '?w=wall' + element.from_id + '_' + element.id;

                        return post;
                    },
                    getGroup: function(user_json, post, element, json) {
                        post.author_name = user_json.response[0].name;
                        post.author_picture = user_json.response[0].photo;
                        post.author_link = Feed.vk.base + user_json.response[0].screen_name;
                        post.link = Feed.vk.base + user_json.response[0].screen_name + '?w=wall-' + user_json.response[0].gid + '_' + element.id;

                        return post;
                    }
                }
            },
            blogspot: {
                loaded: false,
                getData: function(account) {
                    var url;

                    switch (account[0]) {
                        case '@':
                            var username = account.substr(1);
                            url = 'http://' + username + '.blogspot.com/feeds/posts/default?alt=json-in-script&callback=?';
                            request(url, getPosts);
                            break;
                        default:
                    }
                },
                utility: {
                    getPosts: function(json) {
                        _glob_media.push('blogspot');
                        if(!posts_to_load_count || posts_to_load_count <= 0)
                        {
                            posts_to_load_count = json.feed.entry.length
                        }else
                        {
                            posts_to_load_count += json.feed.entry.length;
                        }
                        $.fn.socialfeed.raw_records['blogspot'] = json

                        $.each(json.feed.entry, function() {
                            var post = {},
                                element = this;
                            post.id = element.id['$t'].replace(/[^a-z0-9]/gi, '');
                            post.dt_create = moment((element.published['$t']));
                            post.author_link = element.author[0]['uri']['$t'];
                            post.author_picture = 'http:' + element.author[0]['gd$image']['src'];
                            post.author_name = element.author[0]['name']['$t'];
                            post.message = element.title['$t'] + '</br></br>' + stripHTML(element.content['$t']);
                            post.description = '';
                            post.link = element.link.pop().href;
                            post.raw = element;

                            if (options.show_media) {
                                if (element['media$thumbnail']) {
                                    post.attachment = '<img class="attachment" src="' + element['media$thumbnail']['url'] + '" />';
                                }
                            }

                            post.render();

                        });
                    }
                }
            },
            pinterest: {
                posts: [],
                loaded: false,
                apiv1: 'https://api.pinterest.com/v1/',

                getData: function(account) {
                    var request_url,
                      limit = 'limit=' + options.pinterest.limit,
                      fields = 'fields=id,created_at,link,note,creator(url,first_name,last_name,image),image',
                      query_extention = fields + '&access_token=' + options.pinterest.access_token + '&' + limit + '&callback=?';
                    switch (account[0]) {
                        case '@':
                            var username = account.substr(1);
                            if (username === 'me') {
                                request_url = Feed.pinterest.apiv1 + 'me/pins/?' + query_extention;
                            } else {
                                request_url = Feed.pinterest.apiv1 + 'boards/' + username + '/pins?' + query_extention;
                            }
                            break;
                        default:
                    }
                    Utility.request(request_url, Feed.pinterest.utility.getPosts);
                },
                utility: {

                    getPosts: function(json) {
                        _glob_media.push('pinterest');
                        if(!posts_to_load_count || posts_to_load_count <= 0)
                        {
                            posts_to_load_count = json.data.length
                        }else
                        {
                            posts_to_load_count += json.data.length;
                        }
                        $.fn.socialfeed.raw_records['pinterest'] = json
                        json.data.forEach(function(element) {
                            var post = new SocialFeedPost('pinterest', Feed.pinterest.utility.unifyPostData(element));
                            post.render();
                        });
                    },

                    unifyPostData: function(element){
                        var post = {};

                        post.id = element.id;
                        post.dt_create= moment(element.created_at);
                        post.author_link = element.creator.url;
                        post.author_picture = element.creator.image['60x60' ].url;
                        post.author_name =  element.creator.first_name + element.creator.last_name;
                        post.message = element.note;
                        post.description = '';
                        post.social_network = 'pinterest';
                        post.raw = element;
                        post.link = element.link ? element.link : 'https://www.pinterest.com/pin/' + element.id;
                        if (options.show_media) {
                            post.attachment = '<img class="attachment" src="' + element.image['original'].url + '" />';
                        }
                        return post;
                    }
                }
            },
            weibo: {
                posts: [],
                loaded: false,
                api_base : 'https://api.weibo.com/2/',      
                parameters: {
                    page: 1
                },
                __construct: function(_def_opts, opts)
                {
                    // extend main configuration
                    var _conf = $.extend(_def_opts, opts);
                    // extend parameters configuration
                    _conf.parameters = $.extend(Feed.weibo.parameters, opts.parameters);
                    if(!_conf.access_token) {console.error('Weibo need access token!'); return false}

                    return _conf;

                },
                url_builder: function(opts)
                {
                    
                    var _params = [];

                    opts.parameters['access_token'] = opts.access_token;
                    $.each(opts.parameters, function(a,b){
                        _params.push(a+'='+b);
                    })
                    _params = _params.join('&');
                    return opts.api_base+opts.method+'?'+_params;
                },
                getData: function()
                {
                    var _def_config = {
                        api_base : Feed.weibo.api_base,
                        method: undefined,
                    }
                    var _conf = Feed.weibo.__construct(_def_config, options.weibo, $.fn.socialfeed.options.weibo)
                    $.fn.socialfeed.options.weibo = $.extend($.fn.socialfeed.options.weibo, _conf)
                    var url = (options.weibo.url)? options.weibo.url : Feed.weibo.url_builder(_conf);
                    Utility.request(url, Feed.weibo.utility.getPosts);


                },
                utility: {
                    getPosts: function(json) {
                        _glob_media.push('weibo');
                        if (json) {
                            if(!posts_to_load_count || posts_to_load_count <= 0)
                            {
                                posts_to_load_count = json.data.statuses.length
                            }else
                            {
                                posts_to_load_count += json.data.statuses.length;
                            }
                            $.fn.socialfeed.raw_records['weibo'] = json
                            // save paging
                            $.fn.socialfeed.options.weibo.parameters.page += 1; 
                            var url = Feed.weibo.url_builder($.fn.socialfeed.options.weibo);
                            $.fn.socialfeed.paging['weibo'] = {next: url};
                            $.each(json.data.statuses, function() {
                                var element = this;
                                var post = new SocialFeedPost('weibo', Feed.weibo.utility.unifyPostData(element));
                                post.render();
                            });
                        }
                    },
                    unifyPostData: function(element) {
                        var post = {};

                        post.id = element.id;
                        post.raw = element;
                        post.dt_create = moment(element.created_at);
                        post.author_picture = element.user.avatar_hd;
                        post.author_id = element.user.id;
                        post.author_name = element.user.name || element.user.screen_name;
                        post.author_link = 'http://weibo.com/u/2712633784' + element.user.idstr;
                        post.message = element.text;
                        post.description = '';
                        post.link = 'http://api.weibo.com/2/statuses/go?source='+options.weibo.app_key+'&access_token='+options.weibo.access_token+'&uid='+element.user.id+'&id='+element.id;
                        if (options.show_media) {
                            post.attachment = '<img class="attachment" src="' + element.images.standard_resolution.url + '' + '" />';
                        }
                        return post;
                    },
                    link_encode: function(num)
                    {
                        var alphabet = '0123456789abcdefghijklmn opqrstuvwxyzABCDEFGHIJKL MNOPQRSTUVWXYZ';
                        If (num == 0)
                        {
                            return alphabet[0]
                        }
                        var enc = []
                        var Base = alphabet.length

                    }
                }
            },
            rss : {
                posts: [],
                loaded: false,
                api : 'https://query.yahooapis.com/v1/public/yql?q=',
                datatype: 'json',

                getData: function(url) {
                    var limit = options.rss.limit,
                      yql = encodeURIComponent('select entry FROM feednormalizer where url=\'' + url + '\' AND output=\'atom_1.0\' | truncate(count=' + limit + ')' ),
                      request_url = Feed.rss.api + yql + '&format=json&callback=?';

                    Utility.request(request_url, Feed.rss.utility.getPosts, Feed.rss.datatype);
                },
                utility: {

                    getPosts: function(json) {
                        _glob_media.push('rss');
                        if (json.query.count > 0 ){
                            $.each(json.query.results.feed, function(index, element) {
                                var post = new SocialFeedPost('rss', Feed.rss.utility.unifyPostData(index, element));
                                post.render();
                            });
                        }
                    },

                    unifyPostData: function(index, element){

                        var item = element;

                        if ( element.entry !== undefined ){
                            item = element.entry;
                        }
                        var post = {};

                        post.id = '"' + item.id + '"';
                        post.dt_create= moment(item.published, 'YYYY-MM-DDTHH:mm:ssZ', 'en');

                        post.author_link = '';
                        post.author_picture = '';
                        post.author_name = '';
                        if( item.creator !== undefined ){
                            post.author_name = item.creator;
                        }
                        post.message = item.title;
                        post.description = '';
                        if( item.summary !== undefined ){
                            post.description = Utility.stripHTML(item.summary.content);
                        }
                        post.social_network = 'rss';
                        post.link = item.link.href;
                        if (options.show_media && item.thumbnail !== undefined ) {
                            post.attachment = '<img class="attachment" src="' + item.thumbnail.url + '" />';
                        }
                        return post;
                    }
                }
            }
        };

        // console.log(this)

        //make the plugin chainable
        // return $(this).each(function() {
            // Initialization
           /* $.when( calculatePostsToLoadCount() )
            .done(function(){
            })*/
            Feed.init();
            if (options.update_period) {
                setInterval(function() {
                    return Feed.init();
                }, options.update_period);
            }
        // })
    };

    $.fn.socialfeed.paging = {}
    $.fn.socialfeed.records = {}
    $.fn.socialfeed.raw_records = {}
    $.fn.socialfeed.options = undefined
    $.fn.socialfeed.next = function(options)
    {
        var _options = {
            callback: function(data){
            },
            onRender: function(event, data)
            {

            }
        }
        // var options = $.extend(_options, options);

        $.each($.fn.socialfeed.paging, function(a,b){
            if(b.next)
            {
                $.fn.socialfeed.options[a]['url'] = b.next;
            }
        })
        
        var options = $.extend($.fn.socialfeed.options, options);

        $.fn.socialfeed(options)

    }

})(jQuery);
