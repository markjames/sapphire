(function($) {
	$.entwine('ss', function($){
		/**
		 * On resize of any close the open treedropdownfields
		 * as we'll need to redo with widths
		 */
		$(window).resize(function() {
			$('.TreeDropdownField').closePanel();
		});
		
		var strings = {
			'openlink': 'Open',
			'fieldTitle': '(choose)',
			'searchFieldTitle': '(choose or search)'
		};
		
		/**
		 * @todo Error display
		 * @todo No results display for search
		 * @todo Automatic expansion of ajax children when multiselect is triggered
		 * @todo Automatic panel positioning based on available space (top/bottom)
		 * @todo forceValue
		 * @todo Automatic width
		 * @todo Expand title height to fit all elements
		 */
		$('.TreeDropdownField').entwine({
			onmatch: function() {		
				this.append(
					'<span class="treedropdownfield-title"></span>' +
					'<div class="treedropdownfield-toggle-panel-link"><a href="#" class="ui-icon ui-icon-triangle-1-s"></a></div>' +
					'<div class="treedropdownfield-panel"><div class="tree-holder"></div></div>'
				);
			
				var linkTitle = strings.openLink;
				if(linkTitle) this.find("treedropdownfield-toggle-panel-link a").attr('title', linkTitle);
				
				if(this.data('title')) this.setTitle(this.data('title'));
				
				this.getPanel().hide();
				this._super();
			},
			getPanel: function() {
				return this.find('.treedropdownfield-panel');
			},
			openPanel: function() {
				// close all other panels
				$('.TreeDropdownField').closePanel();
				
				var panel = this.getPanel(), tree = this.find('.tree-holder');
				
				// set the panel to the bottom of the field. Takes into account the
				// mouse scroll position.
				// @todo - support for opening above content
				var scrollTop = 0;
				
				this.parents().each(function(i, e) {
					if($(e).scrollTop() > 0) {
						scrollTop = $(e).scrollTop();
						return;
					}
				});

				var top = this.position().top + this.height() + scrollTop;
				
				panel.css('top', top);
				panel.css('width', this.width());
				
				panel.show();
				
				// swap the down arrow with an up arrow
				var toggle = this.find(".treedropdownfield-toggle-panel-link");
				toggle.addClass('treedropdownfield-open-tree');
				this.addClass("treedropdownfield-open-tree");
				
				toggle.find("a")
					.removeClass('ui-icon-triangle-1-s')
					.addClass('ui-icon-triangle-1-n');
				
				if(tree.is(':empty')) this.loadTree();
				
			},
			closePanel: function() {
				// swap the up arrow with a down arrow
				var toggle = this.find(".treedropdownfield-toggle-panel-link");
				toggle.removeClass('treedropdownfield-open-tree');
				this.removeClass('treedropdownfield-open-tree');
								
				toggle.find("a")
					.removeClass('ui-icon-triangle-1-n')
					.addClass('ui-icon-triangle-1-s');
					

				this.getPanel().hide();
			},
			togglePanel: function() {
				this[this.getPanel().is(':visible') ? 'closePanel' : 'openPanel']();
			},
			setTitle: function(title) {
				if(!title) title = strings.fieldTitle;
					
				this.find('.treedropdownfield-title').text(title);
				this.data('title', title); // separate view from storage (important for search cancellation)				
			},
			getTitle: function() {
				return this.find('.treedropdownfield-title').text();
			},
			setValue: function(val) {
				this.find(':input:hidden').val(val);
				
				this.trigger('change');
			},
			getValue: function() {
				return this.find(':input:hidden').val();
			},
			loadTree: function(params, callback) {
				var self = this, panel = this.getPanel(), treeHolder = $(panel).find('.tree-holder');
				var params = (params) ? this.getRequestParams().concat(params) : this.getRequestParams();
				panel.addClass('loading');
				treeHolder.load(this.data('url-tree'), params, function(html, status, xhr) {
					var firstLoad = true;
					if(status == 'success') {
						$(this)
							.bind('loaded.jstree', function(e, data) {
								var val = self.getValue();
								if(val) data.inst.select_node(treeHolder.find('*[data-id=' + val + ']'));
								firstLoad = false;
								if(callback) callback.apply(self);
							})
							.jstree(self.getTreeConfig())
							.bind('select_node.jstree', function(e, data) {
								var node = data.rslt.obj, id = $(node).data('id');
								if(self.getValue() == id) {
									self.data('metadata', null);
									self.setTitle(null);
									self.setValue(null);
								} else {
									self.data('metadata', [$.extend({id: id}, $(node).getMetaData())]);
									self.setTitle(data.inst.get_text(node));
									self.setValue(id);
								}
								
								// Avoid auto-closing panel on first load
								if(!firstLoad) self.closePanel();
							});
					}
					
					panel.removeClass('loading');
				});
			},
			getTreeConfig: function() {
				var self = this;
				return {
					'core': {
						'initially_open': ['record-0'],
						'animation': 0
					},
					'html_data': {
						// TODO Hack to avoid ajax load on init, see http://code.google.com/p/jstree/issues/detail?id=911
						'data': this.getPanel().find('.tree-holder').html(),
						'ajax': {
							'url': this.data('url-tree'),
							'data': function(node) {
								var id = $(node).data("id") ? $(node).data("id") : 0, params = self.getRequestParams();
								params = params.concat([{name: 'ID', value: id}, {name: 'ajax', value: 1}]);
								return params;
							}
						}
					},
					'ui': {
						"select_limit" : 1,
						'initially_select': [this.getPanel().find('.current').attr('id')]
					},
					'themes': {
						'theme': 'apple'
					},
					'plugins': ['html_data', 'ui', 'themes']
				};
			},
			/**
			 * If the field is contained in a form, submit all form parameters by default.
			 * This is useful to keep state like locale values which are typically
			 * encoded in hidden fields through the form.
			 * 
			 * @return {array}
			 */
			getRequestParams: function() {
				return [];
			}
		});
		
		$('.TreeDropdownField .tree-holder li').entwine({
			/**
			 * Overload to return more data. The same data should be set on initial
			 * value through PHP as well (see TreeDropdownField->Field()).
			 * 
			 * @return {object}
			 */
			getMetaData: function() {
				var matches = this.attr('class').match(/class-([^\s]*)/i);
				var klass = matches ? matches[1] : '';
				return {ClassName: klass};
			}
		});
		
		$('.TreeDropdownField *').entwine({
			getField: function() {
				return this.parents('.TreeDropdownField:first');
			}
		});
		
		$('.TreeDropdownField .treedropdownfield-toggle-panel-link, .TreeDropdownField span.treedropdownfield-title').entwine({
			onclick: function(e) {
				this.getField().togglePanel();
				return false;
			}
		});
		
		$('.TreeDropdownField.searchable').entwine({
			onmatch: function() {
				this._super();
				
				var title = this.data('title');
				this.find('.title').replaceWith(
					$('<input type="text" class="treedropdownfield-title search" />')
				);
				
				this.setTitle(title ? title : strings.searchFieldTitle);
			},
			setTitle: function(title) {
				if(!title) title = strings.fieldTitle;
				
				this.find('.treedropdownfield-title').val(title);
			},
			getTitle: function() {
				return this.find('.treedropdownfield-title').val();
			},
			search: function(str, callback) {
				this.openPanel();
				this.loadTree({search: str}, callback);
			},
			cancelSearch: function() {
				this.closePanel();
				this.loadTree();
				this.setTitle(this.data('title'));
			}
		});
		
		$('.TreeDropdownField.searchable input.search').entwine({
			onkeydown: function(e) {
				var field = this.getField();
				if(e.keyCode == 13) {
					// trigger search on ENTER key
					field.search(this.val());
					return false;
				} else if(e.keyCode == 27) {
					// cancel search on ESC key
					field.cancelSearch();
				}
			}
		});
		
		$('.TreeDropdownField.multiple').entwine({
			getTreeConfig: function() {
				var cfg = this._super();
				cfg.checkbox = {override_ui: true};
				cfg.plugins.push('checkbox');
				cfg.ui.select_limit = -1;
				return cfg;
			},
			loadTree: function(params, callback) {
				var self = this, panel = this.getPanel(), treeHolder = $(panel).find('.tree-holder');
				var params = (params) ? this.getRequestParams().concat(params) : this.getRequestParams();
				panel.addClass('loading');
				treeHolder.load(this.data('url-tree'), params, function(html, status, xhr) {
					var firstLoad = true;
					if(status == 'success') {
						$(this)
							.bind('loaded.jstree', function(e, data) {
								$.each(self.getValue(), function(i, val) {
									data.inst.check_node(treeHolder.find('*[data-id=' + val + ']'));
								});
								firstLoad = false;
								if(callback) callback.apply(self);
							})
							.jstree(self.getTreeConfig())
							.bind('uncheck_node.jstree check_node.jstree', function(e, data) {
								var nodes = data.inst.get_checked(null, true);
								self.setValue($.map(nodes, function(el, i) {
									return $(el).data('id');
								}));
								self.setTitle($.map(nodes, function(el, i) {
									return data.inst.get_text(el);
								}));
								self.data('metadata', $.map(nodes, function(el, i) {
									return {id: $(el).data('id'), metadata: $(el).getMetaData()};
								}));
							});
					}
					
					panel.removeClass('loading');
				});
			},
			getValue: function() {
				var val = this._super();
				return val.split(/ *, */);
			},
			setValue: function(val) {
				this._super($.isArray(val) ? val.join(',') : val);
			},
			setTitle: function(title) {
				this._super($.isArray(title) ? title.join(', ') : title);
			}
		});
	});
}(jQuery));