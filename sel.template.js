window.SEL || (window.SEL = {});

/**
 * {{ var }}
 * {{ var.key1.key }}
 * {{ var1 || var2 || "constant" }}
 * {{ var ? var1 : "constant" }}
 * {{ var | time }}	// support time, date, datetime
 * 
 * {{ var:for }} ... {{ var:forelse }} ... {{ var:forend }}
 */
SEL.template = (function(){
	// since RE pair match not support nest , workaround varname:for .... varname:forend
	var forRE = /\{\{\s*(\w+):for\s*\}\}([\s\S]*?)\{\{\s*\1:forend\s*\}\}/;
	var wordRE = /^\w+$/;
	var hashRE = /^\w+(\.\w+)*$/;
	var defRE = /\s*\|\|\s*/;
	var dblQuoteRE = /^"(.*?)"$/;
	var evalRE = /^(.+?)\s*\?\s*(\S+?)\s*:\s*(\S+)$/;
	var pipeRE = /^(.*?)\|\s*(\w+)\s*$/;
	
	var fnDecide = function(key, vars){
		var match;
		if (match = key.match(wordRE)) {
			return vars[match[0]];
		} else if (match = key.match(hashRE)) {
			return _.reduce(key.split("."), function(memo, k){
				return ($.isPlainObject(memo) || $.isArray(memo)) ? memo[k] : undefined
			}, vars);
		} else if (match = key.match(dblQuoteRE)) {
			return match[1];
		} 
	};
	
	var fnPipe = {
		"time": function(ts) {
			var time = new Date(ts);
			return time.getHours() + ":" + time.getMinutes();
		},
		"date": function(ts) {
			return new Date(ts).toLocaleDateString();
		},
		"datetime": function(ts) {
			var time = new Date(ts);
			return fnPipe.date(time) + " " + fnPipe.time(time);
		},
		"round": function(num, decimal) {
		    return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
		},
		"deg": function(dec) {
			return (dec+'').replace(/(\d+)\.\d+/, function(a,b){
				return b + '&#176;' + (Math.round((a-b)*60000)).toString().replace(/(\d{2})/, '$1.') 
			}); 
		}
		
	}
	
	var render = function(tpl, hashVar){
		var match;
		if (match = tpl.match(forRE)) {
			var loopTpl = match[2], elseTpl;

			var forElseRE = new RegExp("\{\{\s*" + match[1] + ":forelse\s*\}\}");
			var tpl2 = loopTpl.split(forElseRE);
			if (tpl2.length > 1) {
				loopTpl = tpl2[0];
				elseTpl = tpl2[1];
			}

			var loopVar = hashVar[match[1]], loop = "";
			
			if (loopVar && loopVar.length) {
				loop = $.map(loopVar, function(va, ix){
					return render(loopTpl, va);
				}).join("");
			} else if (elseTpl) {
				loop =  render(elseTpl, hashVar);
			}
			
			return render(tpl.replace(match[0], loop), hashVar);
			
		} else {
			return tpl.replace(/\{\{(.+?)\}\}/g, function(_, va) {
				var match, va = va.trim(), place;
				
				if (va.match(defRE)) {
					var opts = va.split(defRE);
					var grp = $.grep($.map(opts, function(key){return fnDecide(key, hashVar)}), function(nm){ 
						return nm !== undefined && nm !== null && nm !== ""
					});
					
					if (grp.length) {
						place = grp[0];
					}
				} else if (match = va.match(evalRE)) {
					place = fnDecide(match[1], hashVar) ?fnDecide(match[2], hashVar) : fnDecide(match[3], hashVar);

				} else if (match = va.match(pipeRE)) {
					place = fnDecide(match[1].trim(), hashVar);

					if (place !== undefined && fnPipe[match[2]]) {
						place = fnPipe[match[2]](place);
					}
				} else {
					place = fnDecide(va, hashVar);
				}
				
				
				// never ever spit out 
				return (place === undefined || place === null) ? "" : place;
			});
		}		
	}

	return function(tpl){
		return function(hashVar) {
			return render(tpl, hashVar);
		}
	}

})();