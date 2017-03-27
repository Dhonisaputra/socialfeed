/*
	var a = new Youtubefeed({
		APIkey: blablabla,
		fields: [{
			name: 'search_a',
			method: 'search'
			accounts: ['@kobasolo', ':youtubeid', '?videoname'],
			parameters: {},
			data: function(){}
			onSearch: function(){},
			onSuccess: function(){},
		}]
	})
	a.add_field({
		...
	})
	a.remove_field('name')
	a.remove_accounts('name_fields', '?videoname' )
	a.options(name_field, 'options_name', value )
	
	var a = new Youtubefeed({
		APIkey: 'AIzaSyDo1wHwH0MLcK8WVCBYXecya62uKkddyXo',
		fields: [{
				name: 'search_a',
				method: 'search',
				accounts: ['@Hujikoman', '!_duWnJ6nsz0', ':UCDbQblY1XASbgqOXmy6FOFQ', '?kobasolo'],
				parameters: {
					part: 'snippet',
					type: 'video'
				},
				dataCustom: function(data)
				{
					return {
						description: data.description
					}
				},
				data: function(){},
				onSuccess: function(res){console.log(res)},
				onRender: function(){},
			}, {
				name: 'search_a',
				method: 'channels',
				parameters: {
					part: 'snippet', forUsername: 'Hujikoman'
				},
				data: function(){},
				onSuccess: function(res){console.log(res)},
				onRender: function(){},
			}]
	})
*/

var Youtubefeed = function(options)
{
	if(!options.APIkey){ var error_text = 'no APIkey defined.'; alert(error_text); console.error(error_text); return false; }
	if(options.fields.length < 1){ var error_text = 'please add some fields.'; alert(error_text); console.error(error_text); return false; }

	var _def_options = 
	{
		graph: 'https://www.googleapis.com/youtube/',
        loaded: false,
        version: 'v3',
        __data_preserve: {}
	}
	this._options = $.extend(_def_options, options);
	this.__helper_check_name();


	var __parents = this;
	var __pre_unifydata = []
	var __defDeff = $.Deferred();
	this.__fields_process(options)
	.done(function(res){
		__defDeff.resolve(__parents)
		if(__parents._options.complete && typeof __parents._options.complete(res) == 'function')
		{
			__parents._options.complete(res)
		}
	})	
	return $.when(__defDeff.promise())
}
Youtubefeed.prototype = 
{
	__helper_check_name: function()
	{
		var name = this._options.fields.map(function(res){
			return res.name
		})
		var originalName = name.length;
		var shrinkenName = $.unique(name).length;
		if(originalName !== shrinkenName || name.indexOf(undefined) > -1)
		{
			var error_text = 'Ada kesalahan dalam penamaan. terdapat nama yang sama. nama harus diisi unik!';
			console.error(error_text);
			alert(error_text)
			return false;
		}
	},
	__construct: function(data)
	{
		var __parents = this;
		this.__active_data = data;
		// separate type accounts
        if(this.__active_data.method == 'search' && data.accounts && data.accounts.length > 0)
        {
        	var promises = []
			var deff = $.Deferred()
        	

			var deferreds = $.map(data.accounts, function(current) {
				var separate = __parents.__separate_type(current, data);
				separate.done(function(res){
					promises.push(res)
				})
				return separate;
		    });

		    $.when.apply($, deferreds).then(function(res) {
		        deff.resolve(promises);
		    });
		    return deff.promise();
			
		}else
        {
        	return this.__bind();
        }
	},
	__fields_process: function(options)
	{
		var __parents = this;
		var deff = $.Deferred();
		var deferreds = $.map(options.fields, function(current) {
			var curDeff = $.Deferred();
			var __cons = __parents.__construct(current)
			$.when(__cons)
			.done(function(res){
				if(current.onSuccess && typeof current.onSuccess == 'function'){ current.onSuccess(res); }
				if(Array.isArray(res) )
				{
					var curData = []
					var mappingDef = $.map(res, function(b){
						$.each(b.items, function(c,d){
							var __unify = __parents.__unifydata(d)
							if(current.dataCustom && typeof current.dataCustom == 'function') { __unify = $.extend( current.dataCustom(d), __unify ); }
							__unify.__raw = d;
							__unify.__results = b;
							curData.push(__unify)
							if(current.data && typeof current.data == 'function') { current.data(__unify) }
						})
					})
					$.when.apply($, curDeff)
					.done(function(res) {
						__parents._options.__data_preserve[current.name] = curData

				    	curDeff.resolve(curData)
				    })
				}else
				{
					var curData = []
					var mappingDef = $.map(res.items, function(d){
						var __unify = __parents.__unifydata(d)
						if(current.dataCustom && typeof current.dataCustom == 'function') { __unify = $.extend( current.dataCustom(d), __unify ); }
						__unify.__raw = d;
						__unify.__results = res;
						curData.push(__unify)
						if(current.data && typeof current.data == 'function') { current.data(__unify) }
					})
					$.when.apply($, curDeff)
					.done(function(res) {
						__parents._options.__data_preserve[current.name] = curData

				    	curDeff.resolve(curData)
				    })
				}
			})
			return curDeff;
	    });
		$.when.apply($, deferreds)
		.done(function(res) {
			$.each(__parents._options.__data_preserve, function(a,b){
				var options = __parents._options.fields;
				var index 	= options.map(function(res){return res.name}).indexOf(a);
				options 	= options[index];
				if(options.template || options.template_html)
				{
					$.each(b, function(c,d){
						__parents.__render_template(options, function(content){
							__parents._options.__data_preserve[a][c]['content'] = content(d);
							if(options.template_target)
							{
								$(options.template_target).append(__parents._options.__data_preserve[a][c]['content'])
							}
						});
					})
				}
			})
	        deff.resolve(__parents._options.__data_preserve);
	    })
	    .fail(function(res){
	    	console.log(arguments)
	    })
	    return $.when(deff.promise());
	},
	__load_process: function(url, callback)
	{
		var default_callback = function(res)
		{
			return res;
		}
		return $.ajax({
            url: url,
            dataType: 'jsonp',
            success: callback?callback : default_callback
        });
	},
	__render_template: function(options, callback)
	{
		this.__transform_template(options, callback);
	},
	__transform_template: function(options, callback)
	{
		var __parents = this;
        if (options.template_html) {
        	if(callback){callback( doT.template(options.template_html) )}
        } else if(options.template){
            $.get(options.template, function(template_html) {
            	if(callback){callback(doT.template(template_html))}
            });
        }
	},
	__get_users: function(account, is_username, callback)
	{
		var deff = $.Deferred();

		var graph = this._options.graph;
		var version = this._options.version;
		var APIkey = this._options.APIkey;
		if(is_username)
		{
			var grabUser = graph+version+'/channels?part=contentDetails,snippet&forUsername='+account+'&key='+APIkey
		}else
		{
			var grabUser = graph+version+'/channels?part=contentDetails,snippet&id='+account+'&key='+APIkey
		}
        var username = this.__load_process(grabUser, function(res){

			if(typeof callback == 'function')
        	{
				callback(res)
        	}

    			deff.resolve(res);
        });

        return deff.promise();
	},
	__get_video: function(videoId, callback)
	{

		var deff = $.Deferred();
		
		var graph = this._options.graph;
		var version = this._options.version;
		var APIkey = this._options.APIkey;
		var grabContent = graph+version+'/videos?';
		
		var _arr_params = []
		$.each(this.__active_data.parameters, function(c,d){
			_arr_params.push(c+'='+d);
		});
		_arr_params.push('key='+APIkey);
		_arr_params.push('id='+videoId);
		// _arr_params.push('channelId='+res.items[0].id);
		grabContent += _arr_params.join('&');

		var username = this.__load_process(grabContent, function(res){
			if(typeof callback == 'function')
        	{
				callback(res)
        	}
    		deff.resolve(res);
        });
        return deff.promise();
	},
	__get_search: function(q, callback)
	{
		var deff = $.Deferred();
		var graph = this._options.graph;
		var version = this._options.version;
		var APIkey = this._options.APIkey;
		var grabContent = graph+version+'/search?';
		
		var _arr_params = []
		$.each(this.__active_data.parameters, function(c,d){
			_arr_params.push(c+'='+d);
		});
		_arr_params.push('key='+APIkey);
		_arr_params.push('q='+q);
		// _arr_params.push('channelId='+res.items[0].id);
		grabContent += _arr_params.join('&');

		var username = this.__load_process(grabContent, function(res){
        	if(typeof callback == 'function')
        	{
				callback(res)
        	}
    		deff.resolve(res);
        });
        return deff.promise();
	},
	__bind: function(callback)
	{
		var deff = $.Deferred();
		var graph = this._options.graph;
		var version = this._options.version;
		var APIkey = this._options.APIkey;
		var grabContent = graph+version+'/'+this.__active_data.method+'?';
		
		var _arr_params = []
		$.each(this.__active_data.parameters, function(c,d){
			_arr_params.push(c+'='+d);
		});
		_arr_params.push('key='+APIkey);
		// _arr_params.push('channelId='+res.items[0].id);
		grabContent += _arr_params.join('&');

		var username = this.__load_process(grabContent, function(res){
        	if(typeof callback == 'function')
        	{
        		callback(res)
        	}
    		deff.resolve(res);
        });
        return deff.promise();
	},
	__separate_type: function(account, data)
	{
		var __parents = this;
        var _real_account = account.substr(1);

		switch (account[0]) {
            case '@':
            	// get users
            	// console.log('channel')
            	return __parents.__get_users(_real_account, true)
                break;

            case '?':
            	// console.log('search')
            	return __parents.__get_search(_real_account)
                break;

            case ':':
            	// console.log('channel with id not name')
            	return __parents.__get_users(_real_account)
                break;
            case '!':
            	// console.log('video with videoId')
            	return __parents.__get_video(_real_account)
                break;
            default:
            	console.error(account[0]+' not recognized!')
            	break;
        }

	},
	__unifydata: function(data)
	{
		var _data = {
			kind: data.kind,
			etag: data.etag,
		}
		return _data
	},

	// ambil data
	get_results: function(name)
	{
		if(name)
		{
			return this._options.__data_preserve[name]
		}else
		{
			return this._options.__data_preserve;
		}
	},
	remove_field: function(name)
	{
		if(this._options.__data_preserve[name])
		{
			delete this._options.__data_preserve[name];
		}	
		return this.get_results();
	},
	add_field: function(options)
	{
		this._options.fields.push(options);
		this.__helper_check_name();
		var __parents = this;
		var __pre_unifydata = []
		this.__fields_process(this._options)
	},
	update: function()
	{
		var __parents = this;
		var __pre_unifydata = []
		this.__fields_process(this._options)	
	}

}