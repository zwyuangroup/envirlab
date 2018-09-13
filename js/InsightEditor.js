"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/



Ext.onReady(function() {
	main();
});

if (require.config) {
	require.config({
		baseUrl: builder_path + "/resources"
	});
}

function isLocalStorageNameSupported() {
    var testKey = 'testLocalStorage', storage = window.sessionStorage;
    try {
        storage.setItem(testKey, '1');
        storage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}

if(isLocalStorageNameSupported()){
	Ext.state.Manager.setProvider(new Ext.state.LocalStorageProvider());
}else{
	Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider', {
    	expires: new Date(new Date().getTime()+(1000*60*60*24*100000))
	}));
}



//make html edit links target blank
Ext.override(Ext.form.HtmlEditor, {
	createLink: function() {
		var url = prompt(this.createLinkText, this.defaultLinkValue);

		if (url && url != 'http:/' + '/') {
			var txt = this.win.getSelection();
			if (txt == "") {
				txt = url;
			}
			txt = '<a href="' + url + '" target="_blank">' + txt + '</a>';

			if (Ext.isIE) {
				range = this.getDoc().selection.createRange();
				if (range) {
					range.pasteHTML(txt);
					this.syncValue();
					this.deferFocus();
				}
			} else {
				this.execCmd('InsertHTML', txt);
				this.deferFocus();
			}
		}
	}
});

function renderTimeBut(value) {
	var id = Ext.id();

	Ext.Function.defer(function() {
		new Ext.Button({
			text: getText("修改时间设置"),
			
			padding: 0,
			margin: 0,
			handler: function(btn, e) {
				var config = JSON.parse(getSelected()[0].getAttribute("Solver"))
				config.cell = getSelected()[0];

				showTimeSettings(config);

			}
		}).render(id);
	}, 15);
	return '<div id="' + id + '" style="height:24px"></div>';
}

window.addEventListener('message', callAPI, false);

function callAPI(e) {
	try {
		e.source.postMessage(eval(e.data), "*");
	} catch (err) {

	}
}

function isLocal() {
	return (document.location.hostname == "localhost") || (document.location.hostname == "insightmaker.dev");
}

mxGraph.prototype.stopEditing = function(a) {
	if (this.cellEditor !== null) {
		this.cellEditor.stopEditing(a)
	}
}

mxGraph.prototype.duplicateCells = function(cells, append)
{
	cells = (cells != null) ? cells : this.getSelectionCells();
	append = (append != null) ? append : true;
	
	cells = this.model.getTopmostCells(cells);
	
	var model = this.getModel();
	var s = this.gridSize;
	var select = [];
	
	model.beginUpdate();
	try
	{
		for (var i = 0; i < cells.length; i++)
		{
			var parent = model.getParent(cells[i]);
			var child = this.moveCells([cells[i]], s, s, true, parent)[0]; 
			select.push(child);
			
			// Maintains child index by inserting after cloned in parent
			if (!append)
			{
				var index = parent.getIndex(cells[i]);
				model.add(parent, child, index + 1);
			}
		}
	}
	finally
	{
		model.endUpdate();
	}
	
	return select;
};


var equationRenderer = function(eq, perserveLines) {
	var res = eq;
	

	res = res.replace(/</g, "&lt;");
	res = res.replace(/>/g, "&gt;");
	res = res.replace(/\[(.*?)\]/g, "<font color='Green'>[$1]</font>");
	res = res.replace(/(&lt;&lt;.*?&gt;&gt;)/g, "<font color='Orange'>$1</font>");
	res = res.replace(/(«.*?»)/g, "<font color='Orange'>$1</font>");
	res = res.replace(/\b([\d\.e]+)\b/g, "<font color='DeepSkyBlue'>$1</font>");
	res = res.replace(/(\{.*?\})/g, "<font color='Orange'>$1</font>");
	
	if (/\\n/.test(res)) {
		if(perserveLines === true){
			res = res.replace(/\\n/g, "<br>");
			res = res.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
			res = res.replace(/ /g, "&nbsp;");
		}else{
			var vals = res.match(/(.*?)\\n/);
			res = vals[1] + "...";
		}
	}

	return clean(res);
};


if (!isLocal()) {
	window.onerror = function(err, file, line, col, error) {
		if (!/removeChild/.test(err)) {
			var msg = [err, file, line].join(' : ');
			_gaq.push(['_trackEvent', 'Errors', 'App', msg, null, true]);
			//alert("Javascript Error\n\n" + err + "\n\n(" + file + " " + line + ")\n\nIf this error persists, please contact us for support.");
			console.log(msg);
			console.log(error)

			return true;
		}
	}
}

try {
	var showNotification = function(message, type, autoHide) {
		//type: error, warning, notice, success
		$().toastmessage('showToast', {
			text: message,
			sticky: !autoHide,
			type: type || "error"
		});
	}
	mxUtils.alert = showNotification;

} catch (err) {
	alert("Insight Maker failed to load all its resources. Check your network connection and try to reload Insight Maker.");
}

var GraphEditor = {};
var mainPanel;
var mxPanel;
var ribbonPanel;
var configPanel;
var sizeChanging;
var sliders = [];
var settingCell;
var selectionChanged;
var clipboardListener;
var undoHistory;



function main() {

	/*Ext.FocusManager.enable();
	Ext.FocusManager.keyNav.disable(); //needed for firefox graph cell name editing (spaces, backspace)
	Ext.FocusManager.shouldShowFocusFrame = function() {
		return false;
	};*/
			

	Ext.QuickTips.init();


	mxConstants.DEFAULT_HOTSPOT = 0.3;
	mxConstants.LINE_HEIGHT = 1.15;

	//Change the settings for touch devices


	graph = new mxGraph();

	undoHistory = new mxUndoManager();


	graph.alternateEdgeStyle = 'vertical';
	graph.connectableEdges = true;
	graph.disconnectOnMove = false;
	graph.edgeLabelsMovable = true;
	graph.enterStopsCellEditing = true;
	graph.allowLoops = false;



	if (viewConfig.allowEdits) {
		mxVertexHandler.prototype.rotationEnabled = true;
	}
	// Enables managing of sizers
	mxVertexHandler.prototype.manageSizers = true;

	// Enables live preview
	mxVertexHandler.prototype.livePreview = true;

	mxEvent.addMouseWheelListener(function(evt, up) {
		if (mxEvent.isControlDown(evt)) {
			if (up) {
				graph.zoomIn();
			} else {
				graph.zoomOut();
			}

			mxEvent.consume(evt);
		}
	});


	// Larger tolerance and grid for real touch devices
	if (!(mxClient.IS_TOUCH || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)) {
		
	} else {
		
		mxGraph.prototype.collapsedImage=new mxImage(mxClient.imageBasePath+"/collapsed.gif", 18, 18);
		mxGraph.prototype.expandedImage=new mxImage(mxClient.imageBasePath+"/expanded.gif", 18, 18);
		
		
		mxShape.prototype.svgStrokeTolerance = 18;
		mxVertexHandler.prototype.tolerance = 12;
		mxEdgeHandler.prototype.tolerance = 12;
		mxGraph.prototype.tolerance = 12;
		mxConstants.DEFAULT_HOTSPOT = 0.5;
		mxConstants.HANDLE_SIZE = 16;
		mxConstants.LABEL_HANDLE_SIZE = 7;

		graph.addListener(mxEvent.TAP_AND_HOLD, function(sender, evt) {
			var me = evt.getProperty('event');
			var cell = evt.getProperty('cell');

			if (cell !== null && isValued(cell)) {
				showEditor(cell)
			} else {
				showContextMenu(null, me);
			}

			// Blocks further processing of the event
			evt.consume();
		});
		

		mxPanningHandler.prototype.isPanningTrigger = function(me) {
			var evt = me.getEvent();

			return (me.getState() == null && !mxEvent.isMouseEvent(evt)) ||
				(mxEvent.isPopupTrigger(evt) && (me.getState() == null || mxEvent.isControlDown(evt) || mxEvent.isShiftDown(evt)));
		};

		// Don't clear selection if multiple cells selected
		var graphHandlerMouseDown = mxGraphHandler.prototype.mouseDown;
		mxGraphHandler.prototype.mouseDown = function(sender, me) {
			graphHandlerMouseDown.apply(this, arguments);

			if (this.graph.isCellSelected(me.getCell()) && this.graph.getSelectionCount() > 1) {
				this.delayedSelection = false;
			}
		};



		// Overrides double click handling to use the tolerance
		var graphDblClick = mxGraph.prototype.dblClick;
		mxGraph.prototype.dblClick = function(evt, cell) {
			if (cell == null) {
				var pt = mxUtils.convertPoint(this.container,
					mxEvent.getClientX(evt), mxEvent.getClientY(evt));
				cell = this.getCellAt(pt.x, pt.y);
			}

			graphDblClick.call(this, evt, cell);
		};



		// Adds connect icon to selected vertex
		var connectorSrc = builder_path + '/images/touch-connector.png';


		new Image().src = connectorSrc;


		var vertexHandlerInit = mxVertexHandler.prototype.init;
		mxVertexHandler.prototype.init = function() {
			// TODO: Use 4 sizers, move outside of shape
			//this.singleSizer = this.state.width < 30 && this.state.height < 30;
			vertexHandlerInit.apply(this, arguments);

			// Only show connector image on one cell and do not show on containers
			if (this.graph.connectionHandler.isEnabled() &&
				this.graph.isCellConnectable(this.state.cell) &&
				this.graph.getSelectionCount() == 1 &&
				graph.connectionHandler.isConnectableCell(this.state.cell)
			) {
				this.connectorImg = mxUtils.createImage(connectorSrc);
				this.connectorImg.style.cursor = 'pointer';
				this.connectorImg.style.width = '29px';
				this.connectorImg.style.height = '29px';
				this.connectorImg.style.position = 'absolute';

				// Starts connecting on touch/mouse down
				mxEvent.addGestureListeners(this.connectorImg,
					mxUtils.bind(this, function(evt) {
						this.graph.popupMenuHandler.hideMenu();
						this.graph.stopEditing(false);

						var pt = mxUtils.convertPoint(this.graph.container,
							mxEvent.getClientX(evt), mxEvent.getClientY(evt));
						this.graph.connectionHandler.start(this.state, pt.x, pt.y);
						this.graph.isMouseDown = true;
						this.graph.isMouseTrigger = mxEvent.isMouseEvent(evt);
						mxEvent.consume(evt);
					})
				);

				this.graph.container.appendChild(this.connectorImg);
			}

			this.redrawHandles();
		};

		var vertexHandlerHideSizers = mxVertexHandler.prototype.hideSizers;
		mxVertexHandler.prototype.hideSizers = function() {
			vertexHandlerHideSizers.apply(this, arguments);

			if (this.connectorImg != null) {
				this.connectorImg.style.visibility = 'hidden';
			}
		};

		var vertexHandlerReset = mxVertexHandler.prototype.reset;
		mxVertexHandler.prototype.reset = function() {
			vertexHandlerReset.apply(this, arguments);

			if (this.connectorImg != null) {
				this.connectorImg.style.visibility = '';
			}
		};

		var vertexHandlerRedrawHandles = mxVertexHandler.prototype.redrawHandles;
		mxVertexHandler.prototype.redrawHandles = function() {
			vertexHandlerRedrawHandles.apply(this);

			if (this.state != null && this.connectorImg != null) {
				var pt = new mxPoint();
				var s = this.state;

				// Top right for single-sizer
				if (mxVertexHandler.prototype.singleSizer) {
					pt.x = s.x + s.width - this.connectorImg.offsetWidth / 2;
					pt.y = s.y - this.connectorImg.offsetHeight / 2;
				} else {
					pt.x = s.x + s.width + mxConstants.HANDLE_SIZE / 2 + 4 + this.connectorImg.offsetWidth / 2;
					pt.y = s.y + s.height / 2;
				}

				var alpha = mxUtils.toRadians(mxUtils.getValue(s.style, mxConstants.STYLE_ROTATION, 0));

				if (alpha != 0) {
					var cos = Math.cos(alpha);
					var sin = Math.sin(alpha);

					var ct = new mxPoint(s.getCenterX(), s.getCenterY());
					pt = mxUtils.getRotatedPoint(pt, cos, sin, ct);
				}

				this.connectorImg.style.left = (pt.x - this.connectorImg.offsetWidth / 2) + 'px';
				this.connectorImg.style.top = (pt.y - this.connectorImg.offsetHeight / 2) + 'px';
			}
		};

		var vertexHandlerDestroy = mxVertexHandler.prototype.destroy;
		mxVertexHandler.prototype.destroy = function(sender, me) {
			vertexHandlerDestroy.apply(this, arguments);

			if (this.connectorImg != null) {
				this.connectorImg.parentNode.removeChild(this.connectorImg);
				this.connectorImg = null;
			}
		};

	}


	// Rounded edge and vertex handles
	var touchHandle = new mxImage(builder_path + '/images/touch-handle.png', 16, 16);
	mxVertexHandler.prototype.handleImage = touchHandle;
	mxEdgeHandler.prototype.handleImage = touchHandle;
	mxOutline.prototype.sizerImage = touchHandle;
	// Pre-fetches touch handle
	new Image().src = touchHandle.src;


	mxEdgeHandler.prototype.addEnabled = true;
	mxEdgeHandler.prototype.removeEnabled = true;

	graph.isHtmlLabel = function(cell) {
		//return false;
		var isHTML = cell != null && cell.value != null && (cell.value.nodeName != "Display");

		return isHTML;
	};
	graph.isWrapping = graph.isHtmlLabel;

	graph.isCellLocked = function(cell) {
		return (!viewConfig.allowEdits) || getOpacity(cell) === 0;
	}
	graph.allowButtonSelect = false;
	graph.isCellSelectable = function(cell) {
		return (cell.value.nodeName != "Setting" && cell.value.nodeName != "Display" && (graph.allowButtonSelect || cell.value.nodeName != "Button" && getOpacity(cell) !== 0));
	}
	graph.isCellEditable = function(cell) {
		if (!viewConfig.allowEdits) {
			return false;
		}
		return (cell.value.nodeName != "Display" && cell.value.nodeName != "Setting" && getOpacity(cell) !== 0 && cell.value.nodeName != "Ghost" && (cell.value.nodeName != "Button" || graph.isCellSelected(cell)));
	}

	graph.getCursorForCell = function(cell) {
		if (cell.value.nodeName == "Button") {
			return "pointer";
		}
	}
	graph.convertValueToString = function(cell) {
		if (mxUtils.isNode(cell.value)) {
			if (cell.value.nodeName == "Link" && orig(cell).getAttribute("name") == "Link") {
				return "";
			} else {
				return clean(orig(cell).getAttribute("name"));
			}
		}
		return '';
	};

	var cellLabelChanged = graph.cellLabelChanged;
	graph.labelChanged = function(cell, newValue, evt) {
		if (validPrimitiveName(newValue, cell)) {

			var oldName = cell.getAttribute("name");

			graph.model.beginUpdate();
			var edit = new mxCellAttributeChange(cell, "name", newValue);
			graph.getModel().execute(edit);
			selectionChanged(false);
			propogateGhosts(cell);
			propogateName(cell, oldName);

			graph.model.endUpdate();
			return cell;
		}
	};

	var getEditingValue = graph.getEditingValue;
	graph.getEditingValue = function(cell) {
		if (mxUtils.isNode(cell.value)) {
			return cell.getAttribute('name');
		}
	};

	setupHoverIcons();


	mxPanel = Ext.create('Ext.Component', {
		border: false,
		id: "mxPanelForModelGraph"
	});
	
 

	mainPanel = Ext.create('Ext.Panel', {
		region: 'center',

		border: false,
		layout: "fit",
		items: [mxPanel]
	});

	mainPanel.on('resize', function() {
		graph.sizeDidChange();
	});

	configPanel = Ext.create('Ext.Panel', ConfigPanel());
	ribbonPanel = Ext.create('Ext.Panel', RibbonPanel(graph, mainPanel, configPanel));

	window.toNum = 0;
	var viewport = new Ext.Viewport({
		layout: 'border',
		padding: (viewConfig.showTopLinks ? '22 0 0 0' : 0),
		id: 'overall-viewport',
		items: [ribbonPanel, {
			xtype: 'toolbar',
			region: 'south',
			dock: 'bottom',
			hidden: false,
			id: 'unfoldToolbar',
			layout: {
				align: "bottom"
			},
			items: [{
				glyph: 0xf0e6,
				text: getText('查看故事'),
				iconCls: 'blue-icon',
				scope: this,
				id: 'unfoldUnfoldBut',
				handler: function() {
					
					revealUnfoldButtons(true);
					beginUnfolding();
				}
			},{
				glyph: 0xf044,
				text: getText('编辑故事'),
				scope: this,
				id: 'editUnfoldBut',
				handler: showUnfoldingWin
			}, {
				scale: "large",
				iconAlign: 'top',
				glyph: 0xf021,
				text: getText('初始化'),
				scope: this,
				id: 'reloadUnfoldBut',
				handler: function() {
					restartUnfolding();
				}
			}, {
				hidden: is_ebook,
				scale: "large",
				iconAlign: 'top',
				glyph: 0xf05c,
				iconCls: 'red-icon',
				text: getText('退出故事'),
				scope: this,
				id: 'exitUnfoldBut',
				handler: function() {
					revealUnfoldButtons(false);
					finishUnfolding();
				}
			}, {
				html: "",
				id: 'messageUnfoldBut',
				flex: 1,
				xtype: "box",
				style: {
					"font-size": "larger"
				},
				margin: '4 10 4 10',
				align: "middle",
				minHeight: 64
			}, {
				scale: "large",
				iconCls: 'green-icon',
				iconAlign: 'top',
				glyph: 0xf138,
				text: getText('前进'),
				scope: this,
				id: 'nextUnfoldBut',
				handler: function() {
					doUnfoldStep()
				}
			}]
		}]
	});

  $(mxPanel.getEl().dom)
    .on('touchstart tap  ', function(e) { /*touch move touchend*/
		e.stopPropagation();
		if(document.activeElement && document.activeElement.blur){
			document.activeElement.blur()
		}
    });
	
	
	var connectionChangeHandler = function(sender, evt) {
		var item = evt.getProperty("edge");
		if (item.value.nodeName == "Link") {
			linkBroken(item);
		}
	};
	graph.addListener(mxEvent.CELL_CONNECTED, connectionChangeHandler);

	graph.addListener(mxEvent.CELLS_FOLDED, function(graph, e) {
		if (!e.properties.collapse) {
			graph.orderCells(false, e.properties.cells);
		}
	});


	mainPanel.getEl().insertHtml("beforeBegin", "<div id='mainGraph'  style='z-index:1000;position:absolute; width:100%;height:100%;display:none;'></div>");


	mxEvent.disableContextMenu(mxPanel.getEl().dom);


	mxPanel.getEl().dom.style.overflow = 'auto';
	/*if (mxClient.IS_MAC && mxClient.IS_SF) {
		graph.addListener(mxEvent.SIZE, function(graph) {
			graph.container.style.overflow = 'auto';
		});
	}*/

	graph.model.styleForCellChanged = function(cell, style) {
		var x = mxGraphModel.prototype.styleForCellChanged(cell, style);
		propogateGhosts(cell);
		return x;
	}

	graph.model.addListener(mxEvent.CHANGED, function(graph) {
		setSaveEnabled(true);
	});

	graph.model.addListener(mxEvent.CHANGE, function(sender, evt) {
		var changes = evt.getProperty('changes');

		if ((changes.length < 10) && changes.animate) {
			mxEffects.animateChanges(graph, changes);
		}
	});

	graph.addListener(mxEvent.CELLS_REMOVED, function(sender, evt) {
		var cells = evt.getProperty('cells');
		for (var i = 0; i < cells.length; i++) {
			deletePrimitive(cells[i]);
			if (cells[i].value.nodeName == "Folder") {
				var children = childrenCells(cells[i]);
				if (children != null) {
					for (var j = 0; j < children.length; j++) {
						deletePrimitive(children[j]);
					}
				}
			}
		}
		selectionChanged(true);
	});

	graph.addListener(mxEvent.CLICK, function(sender, evt) {

		var cell = evt.getProperty('cell');
		var realEvt = evt.getProperty('event');
		if (!evt.isConsumed()) {
			if (cell == null) {
				graph.clearSelection();
			}
		}
	});


	// Initializes the graph as the DOM for the panel has now been created	
	graph.init(mxPanel.getEl().dom);
	graph.setConnectable(viewConfig.allowEdits);
	graph.setDropEnabled(true);
	graph.setSplitEnabled(false);
	graph.connectionHandler.connectImage = new mxImage(builder_path + '/images/connector.gif', 16, 16);
	graph.connectionHandler.isConnectableCell = function(cell) {
		//console.log(cell);
		if (!cell) {
			return false;
		}
		if (getOpacity(cell) === 0) {
			return false;
		}
		var type = connectionType();
		if (cell.value.nodeName == "Link" || type == "None") {
			return false;
		}
		if (type == "Link") {
			return true;
		} else {
			var o = orig(cell);
			return o.value.nodeName == "Stock" || o.value.nodeName == "State";
		}
	}
	graph.setPanning(true);
	graph.setTooltips(true);
	graph.connectionHandler.setCreateTarget(false);



	var rubberband = new mxRubberband(graph);

	var parent = graph.getDefaultParent();

	graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
		if (!evt.shiftKey) {
			if (viewConfig.enableContextMenu) {
				showContextMenu(null, evt);
			}
		}
	};


	graph.model.addListener(mxEvent.CHANGED, clearPrimitiveCache);



	settingCell = graph.insertVertex(parent, null, primitiveBank.setting, 20, 20, 80, 40);
	settingCell.visible = false;
	var firstdisp = graph.insertVertex(parent, null, primitiveBank.display.cloneNode(true), 50, 20, 64, 64, "roundImage;image=" + builder_path + "/images/DisplayFull.png;");
	firstdisp.visible = false;
	firstdisp.setAttribute("AutoAddPrimitives", true);
	firstdisp.setAttribute("name", getText("默认显示"));



	graph.getEdgeValidationError = function(edge, source, target) {
		if ((edge != null && (edge.value.nodeName == "Flow" || edge.value.nodeName == "Transition")) || (this.model.getValue(edge) == null && connectionType == "Flow")) {
			if (isDefined(source) && source !== null && source.isConnectable()) {
				if (!(source.value.nodeName == "Stock" || (source.value.nodeName == "Ghost" && orig(source).value.nodeName == "Stock") || source.value.nodeName == "State" || (source.value.nodeName == "Ghost" && orig(source).value.nodeName == "State"))) {
					return getText('您无法建立这种联系。');
				}
			}
			if (isDefined(target) && target !== null && target.isConnectable()) {
				if (!(target.value.nodeName == "Stock" || (target.value.nodeName == "Ghost" && orig(target).value.nodeName == "Stock") || target.value.nodeName == "State" || (target.value.nodeName == "Ghost" && orig(target).value.nodeName == "State"))) {
					return getText('您无法建立这种联系。');
				}
				if (isDefined(source) && source !== null && source.isConnectable()) {
					if (orig(source).value.nodeName != orig(target).value.nodeName) {
						return getText("您无法将库连接到转换。");
					}
				}
			}
		}


		if ((edge != null && edge.value.nodeName == "Link") || (this.model.getValue(edge) == null && connectionType() == "Link")) {
			if (isDefined(source) && source !== null) {
				if (source.value.nodeName == "Link") {
					return getText('链接无法连接到链接。');
				}
			}
			if (isDefined(target) && target !== null) {
				if (target.value.nodeName == "Link") {
					return getText('链接无法连接到链接。');
				}
			}
		}
		
		if (connectionType() !== 'Link' && source && target) {
			if (orig(source).value.nodeName == 'Stock' || orig(source).value.nodeName == 'State') {
				if (orig(source).value.nodeName != orig(target).value.nodeName) {
					return getText('您无法使用流或转换将库连接到状态。');
				}
			}
		}
		
		if (edge) {
			if (edge.value.nodeName == 'Transition' && ((source && orig(source).value.nodeName == 'Stock') || (target && orig(target).value.nodeName == 'Stock'))) {
				return getText('您无法将转换连接到库。');
			}
			
			if (edge.value.nodeName == 'Flow' && ( (source && orig(source).value.nodeName == 'State') || (target && orig(target).value.nodeName == 'State'))) {
				return getText('您无法将流连接到状态。');
			}
		}
		
		return mxGraph.prototype.getEdgeValidationError.apply(this, arguments);
	};


	/*	if (true && is_editor && drupal_node_ID != -1) {
 var sharer = new mxSession(graph.getModel(), "/builder/hub.php?init&id=" + drupal_node_ID, "/builder/hub.php?id=" + drupal_node_ID, "/builder/hub.php?id=" + drupal_node_ID);
        sharer.start();
        sharer.createUndoableEdit = function(changes)
        {
            var edit = mxSession.prototype.createUndoableEdit(changes);
            edit.changes.animate = true;
            return edit;
        }
	}*/

	if ((graph_source_data != null && graph_source_data.length > 0) || drupal_node_ID == -1) {
		var code;
		if (drupal_node_ID == -1) {
			code = blankGraphTemplate;
		} else {
			code = graph_source_data;
		}

		var doc = mxUtils.parseXml(code);
		var dec = new mxCodec(doc);
		dec.decode(doc.documentElement, graph.getModel());

		updateModel();

		loadStyleSheet();

	}



	loadBackgroundColor();

	if (viewConfig.saveEnabled) {
		var mgr = new mxAutoSaveManager(graph);
		mgr.autoSaveThreshold = 5;
		mgr.autoSaveDelay = 10;
		mgr.autoSaveThrottle = 2;
		mgr.save = function() {
			if (graph_title != "") {
				saveModel();
			}
		};
	}

	var listener = function(sender, evt) {
		undoHistory.undoableEditHappened(evt.getProperty('edit'));
	};

	graph.getModel().addListener(mxEvent.UNDO, listener);
	graph.getView().addListener(mxEvent.UNDO, listener);

	//Update folder displays between collapsed and full versions
	graph.addListener(mxEvent.CELLS_FOLDED, function(sender, evt) {
		var cells = evt.properties.cells;
		var collapse = evt.properties.collapse;
		for (var i = 0; i < cells.length; i++) {
			setPicture(cells[i]);
			setLabelPosition(cells[i]);
		}
	});

	var toolbarItems = ribbonPanelItems();
	var selectionListener = function() {
		var selected = !graph.isSelectionEmpty();
		if(selected){
			if(document.activeElement && document.activeElement.blur){
				document.activeElement.blur()
			}
		}
		var selectedNonGhost = selected && (graph.getSelectionCount() == 1 ? graph.getSelectionCell().value.nodeName != "Ghost" : true);
		
		

		toolbarItems.down('#folder').setDisabled(graph.getSelectionCount() <= 0);
		toolbarItems.down('#ghostBut').setDisabled(graph.getSelectionCount() != 1 || ((!isValued(graph.getSelectionCell()) && graph.getSelectionCell().value.nodeName != "Picture" && graph.getSelectionCell().value.nodeName != "Agents")) || graph.getSelectionCell().value.nodeName == "Flow" || graph.getSelectionCell().value.nodeName == "Transition" || graph.getSelectionCell().value.nodeName == "Ghost");

		toolbarItems.down('#cut').setDisabled(!selected);
		toolbarItems.down('#copy').setDisabled(!selected);
		toolbarItems.down('#delete').setDisabled(!selected);
		toolbarItems.down('#fillcolor').setDisabled(!((!selected) || selectedNonGhost));
		toolbarItems.down('#fontcolor').setDisabled(!selectedNonGhost);
		toolbarItems.down('#linecolor').setDisabled(!selectedNonGhost);
		toolbarItems.down('#bold').setDisabled(!selectedNonGhost);
		toolbarItems.down('#italic').setDisabled(!selectedNonGhost);
		toolbarItems.down('#underline').setDisabled(!selectedNonGhost);
		toolbarItems.down('#fontCombo').setDisabled(!selectedNonGhost);
		toolbarItems.down('#sizeCombo').setDisabled(!selectedNonGhost);
		toolbarItems.down('#align').setDisabled(!selectedNonGhost);
		toolbarItems.down('#movemenu').setDisabled(!selected);
		toolbarItems.down('#picturemenu').setDisabled(!selected);
		toolbarItems.down('#useAsDefaultStyle').setDisabled(!selectedNonGhost);
		toolbarItems.down('#reverse').setDisabled(!(selected && (cellsContainNodename(graph.getSelectionCells(), "Link") || cellsContainNodename(graph.getSelectionCells(), "Flow") || cellsContainNodename(graph.getSelectionCells(), "Transition"))));

		setStyles();
	};

	graph.getSelectionModel().addListener(mxEvent.CHANGED, selectionListener);



	clipboardListener = function() {
		toolbarItems.down('#paste').setDisabled(mxClipboard.isEmpty());
	};
	clipboardListener();


	// Updates the states of the undo/redo buttons in the toolbar
	var historyListener = function() {
		toolbarItems.down('#undo').setDisabled(!undoHistory.canUndo());
		toolbarItems.down('#redo').setDisabled(!undoHistory.canRedo());
	};

	undoHistory.addListener(mxEvent.ADD, historyListener);
	undoHistory.addListener(mxEvent.UNDO, historyListener);
	undoHistory.addListener(mxEvent.REDO, historyListener);

	// Updates the button states once
	selectionListener();
	historyListener();


	var previousCreateGroupCell = graph.createGroupCell;

	graph.createGroupCell = function() {
		var group = previousCreateGroupCell.apply(this, arguments);
		group.setStyle('folder');
		group.setValue(primitiveBank.folder.cloneNode(true));

		return group;
	};

	graph.connectionHandler.factoryMethod = function(source, target) {
		var style;
		var parent;
		var value;
		var conn;
		if (connectionType() == "Link") {
			style = 'link';
			parent = primitiveBank.link.cloneNode(true);
		} else {
			if ((source != null && source.value.nodeName == "Stock") || (target != null && target.value.nodeName == "Stock")) {
				style = 'flow';
				parent = primitiveBank.flow.cloneNode(true);
			} else {
				style = 'transition';
				parent = primitiveBank.transition.cloneNode(true);
			}
		}
		var cell = new mxCell(parent, new mxGeometry(0, 0, 100, 100), style);
		cell.geometry.setTerminalPoint(new mxPoint(0, 100), true);
		cell.geometry.setTerminalPoint(new mxPoint(100, 0), false);
		cell.edge = true;
		cell.connectable = true;

		return cell;
	};

	graph.getTooltipForCell = function(cell) {
		if (linkedResults && cell != null) {
			var displayInformation = linkedResults.displayInformation;
			//console.log(displayInformation);
			
			var displaySeries = [];
			var displayIds = [];
			var defaultColorIndex = 0;
			for (var i = 0; i < displayInformation.ids.length; i++) {
				if (cell.id == displayInformation.ids[i]) {
					var x = displayInformation.elementIds[i];
					displayIds.push(x);
					
					var c = null;
					if (!isGray(displayInformation.colors[i])) {
						c = displayInformation.colors[i];
					} else {
						c = defaultColors[defaultColorIndex];
						defaultColorIndex++;
						defaultColorIndex = defaultColorIndex % defaultColors.length;
					}
					
					displaySeries.push({
						type: 'line',
						axis: "left",
						xField: "Time",
						yField: x,
						title: displayInformation.headers[i],
						showMarkers: false,
						colors: [c],
						smooth: false,
						style: {'stroke-width': 3}
					});
					
				}
			}
			
			if(displayIds.length == 0){
				return undefined;
			}
			
			return {
						flex: 1,
				width: 200,
				height: 160,
						animation: false,
						shadow: false,
						store: displayInformation.store,
						axes: [{
								type: 'numeric',
								position: 'left',
								fields: displayIds,
								grid: true,
								titleMargin: 0,
								renderer: commaStr,
								label: {
									fontSize: '11px'
								}
							},
							{
								type: 'numeric',
								position: 'bottom',
								fields: "Time",
								minimum: displayInformation.store.min("Time"),
								maximum:  displayInformation.store.max("Time"),
								grid: true,
								titleMargin: 0,
								renderer: function(x) {
									return round(x, 9);
								},
								label: {
									fontSize: '11px'
								}
							}
						],
						series: displaySeries
					};
					
		} else {
			return "";
		}
	}

	// Redirects tooltips to ExtJs tooltips. First a tooltip object
	// is created that will act as the tooltip for all cells.
	var tooltip = new Ext.ToolTip({
		html: '',
		hideDelay: 0,
		dismissDelay: 0,
		showDelay: 0
	});

	// Installs the tooltip by overriding the hooks in mxGraph to
	// show and hide the tooltip.
	graph.tooltipHandler.show = function(tip, x, y) {
		if (tip != null && tip.length != '') {
			tooltip.items.each(function(childItem){
				this.remove(childItem);
			}, tooltip);
			tooltip.add(Ext.create("Ext.chart.CartesianChart", tip));
			tooltip.showAt([x, y + mxConstants.TOOLTIP_VERTICAL_OFFSET]);
		} else {
			tooltip.hide();
		}
	};

	graph.tooltipHandler.hide = function() {
		tooltip.hide();
	};

	graph.tooltipHandler.hideTooltip = function() {
		tooltip.hide();
	};

	// Enables guides
	mxGraphHandler.prototype.guidesEnabled = true;

	mxGraphHandler.prototype.mouseDown = function(sender, me) {
		if (!me.isConsumed() && this.isEnabled() && this.graph.isEnabled() && me.getState() != null) {
			var cell = this.getInitialCellForEvent(me);

			if (cell !== null && cell.value.nodeName == "Button" && (!graph.getSelectionModel().isSelected(cell))) {

				if (me.evt.shiftKey == false) {
					pressButton(cell);
					me.consume();
					graph.allowButtonSelect = false;
					return false;
				} else {
					graph.allowButtonSelect = true;
				}
			}

			this.delayedSelection = this.isDelayedSelection(cell);
			this.cell = null;

			if (this.isSelectEnabled() && !this.delayedSelection) {
				this.graph.selectCellForEvent(cell, me.getEvent());
			}

			if (this.isMoveEnabled()) {
				var model = this.graph.model;
				var geo = model.getGeometry(cell);

				if (this.graph.isCellMovable(cell) && ((!model.isEdge(cell) || this.graph.getSelectionCount() > 1 ||
						(geo.points != null && geo.points.length > 0) || model.getTerminal(cell, true) == null ||
						model.getTerminal(cell, false) == null) || this.graph.allowDanglingEdges ||
					(this.graph.isCloneEvent(me.getEvent()) && this.graph.isCellsCloneable()))) {
					this.start(cell, me.getX(), me.getY());
				}

				this.cellWasClicked = true;

				// Workaround for SELECT element not working in Webkit, this blocks moving
				// of the cell if the select element is clicked in Safari which is needed
				// because Safari doesn't seem to route the subsequent mouseUp event via
				// this handler which leads to an inconsistent state (no reset called).
				// Same for cellWasClicked which will block clearing the selection when
				// clicking the background after clicking on the SELECT element in Safari.
				if ((!mxClient.IS_SF && !mxClient.IS_GC) || me.getSource().nodeName != 'SELECT') {
					me.consume();
				} else if (mxClient.IS_SF && me.getSource().nodeName == 'SELECT') {
					this.cellWasClicked = false;
					this.first = null;
				}
			}
		}
	};





	// Alt disables guides
	mxGuide.prototype.isEnabledForEvent = function(evt) {
		return !mxEvent.isAltDown(evt);
	};

	var undoHandler = function(sender, evt) {
		var changes = evt.getProperty('edit').changes;
		graph.setSelectionCells(graph.getSelectionCellsForChanges(changes));
	};

	undoHistory.addListener(mxEvent.UNDO, undoHandler);
	undoHistory.addListener(mxEvent.REDO, undoHandler);

	if (viewConfig.focusDiagram) {
		//stealing focus in embedded frames scrolls the page to the frame
		graph.container.focus();
	}

	setTopLinks();
	if (!is_topBar) {
		toggleTopBar();
	}
	if (!is_sideBar) {
		configPanel.collapse(Ext.Component.DIRECTION_RIGHT, false);
	}



	mxKeyHandler.prototype.isGraphEvent = function(e) {

		if (e.altKey || e.shiftKey) {
			return false;
		}
		var w = Ext.WindowManager.getActive();
		if (isDefined(w) && w !== null && (w.modal || w.getId()=="unfold-window") ) {
			return false;
		}
		//console.log(Ext.FocusManager.focusedCmp);
		var c = Ext.get(Ext.Element.getActiveElement());
		if(c.hasCls && c.hasCls('x-form-field')){
			return false;
		}
		var x = (! c) || (! c.component) || c.component.componentCls == 'x-container' || c.component.componentCls == 'x-window' || c.component.componentCls == 'x-panel' || c.component.componentCls == 'x-panel-header' || c.component.componentCls == 'x-window-header' || c.component.componentCls == 'x-btn-group' || c.component.componentCls == 'x-form-field';
		//console.log(x);
		return x;
	}

	var keyHandler = new mxKeyHandler(graph);

	keyHandler.getFunction = function(evt) {
		if (evt != null) {
			return (mxEvent.isControlDown(evt) || (mxClient.IS_MAC && evt.metaKey)) ? this.controlKeys[evt.keyCode] : this.normalKeys[evt.keyCode];
		}

		return null;
	};

	keyHandler.bindKey(13, function() {
		graph.foldCells(false);
	});



	keyHandler.bindControlKey(65, function() {
		graph.selectAll();
	});
	
	// Ctrl+D
	keyHandler.bindControlKey(68, function(){
		graph.setSelectionCells(graph.duplicateCells());
	}); 

	//bold
	keyHandler.bindControlKey(66, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_BOLD, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	//italics
	keyHandler.bindControlKey(73, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_ITALIC, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	//underline
	keyHandler.bindControlKey(85, function() {
		if (viewConfig.allowEdits) {
			graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_UNDERLINE, excludeType(graph.getSelectionCells(), "Ghost"));
			setStyles();
		}
	});

	keyHandler.bindControlKey(89, function() {
		undoHistory.redo();
	});

	keyHandler.bindControlKey(90, function() {
		undoHistory.undo();
	});


	keyHandler.bindControlKey(67, function() {
		mxClipboard.copy(graph);
		clipboardListener();
	});

	keyHandler.bindControlKey(13, function() { // Return
		runModel();
	});

	keyHandler.bindControlKey(75, function() { // K
		scratchpadFn();
	});

	keyHandler.bindControlKey(191, function() { // ]
		if (!Ext.getCmp("unfoldToolbar").isHidden()) {
			if (!Ext.getCmp("nextUnfoldBut").isHidden) {
				if (!Ext.getCmp("nextUnfoldBut").isDisabled()) {
					doUnfoldStep();
				}
			}
		}
	});

	if (viewConfig.allowEdits) {

		keyHandler.bindKey(8, function() {
			graph.removeCells(graph.getSelectionCells(), false);
		});

		keyHandler.bindKey(46, function() {
			graph.removeCells(graph.getSelectionCells(), false);
		});

		keyHandler.bindControlKey(88, function() {
			mxClipboard.cut(graph);
			clipboardListener();
		});

		keyHandler.bindControlKey(83, function() {
			saveModel();
		});

		keyHandler.bindControlKey(86, function() {
			mxClipboard.paste(graph);
			clipboardListener()
		});

		keyHandler.bindControlKey(190, function() { // .
			var primitive = graph.getSelectionCell();
			if (isDefined(primitive) && primitive != null) {
				var editorWindow = new RichTextWindow({
					parent: "",
					cell: primitive,
					html: getNote(primitive)
				});
				editorWindow.show();
			}
		});
	}

	keyHandler.bindControlKey(69, function() { // E
		doSensitivity();
	});

	keyHandler.bindControlKey(76, function() { // L
		timeSettingsFn();
	});

	keyHandler.bindControlKey(70, function() { // F
		showFindAndReplace();
	});

	keyHandler.bindControlKey(71, function() { // G
		var but = Ext.getCmp('findNextBut');
		if (but && (!but.disabled)) {
			findNext();
		}
	});


	keyHandler.bindControlKey(80, printGraph);




	graph.getSelectionModel().addListener(mxEvent.CHANGE, function(sender, evt) {
		
			selectionChanged(false);
		
	});


	var primitiveRenderer = function(prims) {
		var items = prims.split(",");

		var myCells = primitives();
		if (myCells != null) {
			for (var i = 0; i < myCells.length; i++) {
				if (Ext.Array.indexOf(items, myCells[i].id) > -1) {
					items[Ext.Array.indexOf(items, myCells[i].id)] = myCells[i].getAttribute("name");
				}
			}
		}
		return items.join(", ");
	};

	var labelRenderer = function(eq) {
		var res = eq;

		res = res.replace(/(%.)/g, "<font color='DeepSkyBlue'>$1</font>");

		return clean(res);
	};




	selectionChanged = function(forceClear) {
		
		if (isDefined(grid)) {
			grid.plugins[0].completeEdit();
			configPanel.removeAll()
		}


		var cell = graph.getSelectionCell();
		if (forceClear) {
			cell = null;
		}

		var bottomItems = [];
		var topItems = [];
		var properties = [];
		var cellType;
		if (cell != null) {
			cellType = cell.value.nodeName;
		}

		if (cell != null && graph.getSelectionCells().length == 1 && (cellType != "Ghost")) {
			configPanel.setTitle(getText(cellType));


			properties = [{
				'name': 'Note',
				'text': getText('注释'),
				'value': cell.getAttribute("Note"),
				'group': '  ' + getText('一般'),
				'editor': new RichTextEditor({})
			}, {
				'name': 'name',
				'text': getText('(名称)'),
				'value': cell.getAttribute("name"),
				'group': '  ' + getText('一般')
			}];

			if ((isValued(cell) || cell.value.nodeName == "Agents") && cell.value.nodeName != "State" && cell.value.nodeName != "Action") {
				if (viewConfig.allowEdits && cell.value.nodeName != "Converter") {
					properties.push({
						'name': 'ShowSlider',
						'text': getText('显示值滑块'),
						'value': isTrue(cell.getAttribute("ShowSlider")),
						'group': getText('滑块')
					});

					properties.push({
						'name': 'SliderMax',
						'text': getText('滑块最大值'),
						'value': parseFloat(cell.getAttribute("SliderMax")),
						'group': getText('滑块'),
						'editor': {
							xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
						}
					});


					properties.push({
						'name': 'SliderMin',
						'text': getText('滑块最小值'),
						'value': parseFloat(cell.getAttribute("SliderMin")),
						'group': getText('滑块'),
						'editor': {
							xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
						}
					});

					properties.push({
						'name': 'SliderStep',
						'text': getText('滑块步长'),
						'value': cell.getAttribute("SliderStep"),
						'group': getText('滑块'),
						'editor': {
							xtype: 'numberfield',
							minValue: 0,
							allowDecimals: true,
							decimalPrecision: 9
						}
					});
				}

				if (cell.value.nodeName != "Transition" && cell.value.nodeName != "Agents") {
					properties.push({
						'name': 'Units',
						'text': getText('单位'),
						'value': cell.getAttribute("Units"),
						'group': getText('验证'),
						'editor': new UnitsEditor({})
					});
				}

				if (viewConfig.allowEdits && cell.value.nodeName != "Agents") {
					properties.push({
						'name': 'MaxConstraintUsed',
						'text': getText('最大约束'),
						'value': isTrue(cell.getAttribute("MaxConstraintUsed")),
						'group': getText('验证')
					});

					properties.push({
						'name': 'MaxConstraint',
						'text': getText('最大约束'),
						'value': parseFloat(cell.getAttribute("MaxConstraint")),
						'group': getText('验证'),
						'editor': {
							xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
						}
					});


					properties.push({
						'name': 'MinConstraintUsed',
						'text': getText('最小约束'),
						'value': isTrue(cell.getAttribute("MinConstraintUsed")),
						'group': getText('验证')
					});

					properties.push({
						'name': 'MinConstraint',
						'text': getText('最小约束'),
						'value': parseFloat(cell.getAttribute("MinConstraint")),
						'group': getText('验证'),
						'editor': {
							xtype: 'numberfield',
							allowDecimals: true,
							decimalPrecision: 9
						}
					});
				}
			}

		} else {
			configPanel.setTitle("");
		}

		function descriptionLink(url, subject) {
			return "<a href='" + url + "' class='description_link' target='_blank'>Learn more about " + subject + "&nbsp;&rsaquo;</a><div style='clear:both'></div>"
		}

		var descBase = "<br/><div class = 'fa fa-question-circle' style='float:left; margin-right: 7px; font-size: xx-large; display: block; color: grey'></div>";

		var topDesc = "",
			bottomDesc = "";
		if (cell == null || graph.getSelectionCells().length > 1) {
			var slids = sliderPrimitives();

			//no primitive has been selected. Stick in empty text and sliders.
			if (drupal_node_ID == -1 && slids.length == 0) {
				if (is_ebook) {
					topDesc = "<center><big>Select a primitive to see its properties.</big></center>";
				} else {
					topDesc = "<center><br><br><img src='" + builder_path + "/images/nju.png' width=130 /><br><br><big><strong>南京大学环境虚拟仿真实验平台</strong></big><br/><br/><br/><div style = padding:10px>环境虚拟仿真平台隶属于南京大学国家级“社会经济环境系统虚拟仿真实验教学中心”，是支撑物质循环及其环境效应教学科研的基础平台。<br><br>该平台立足于强大的互联网技术，旨在将环境要素模拟、物质循环过程模拟、环境风险预警与健康评估、环境经济政策模拟、生命周期管理等学科内容进行融合与集成，从环境安全、健康风险和资源可持续供给等多视角、多尺度剖析环境问题，为环境及相关专业学生培养提供实验条件，为环境保护事业的科学化与大众化提供基础支撑。</div></center>";
				}
			} else {

				var topDesc = clean(graph_description);
				if (topDesc == "" && drupal_node_ID != -1) {
					if (viewConfig.saveEnabled) {
						topDesc = "<span style='color: #555'>" + getText("您尚未输入此Insight的说明。 请输入一个以帮助其他人理解。") + "</span>";
					}
				}


				if (topDesc != "") {
					topDesc = "<div class='sidebar_description'>" + topDesc + "</div>";
				}
				if (drupal_node_ID != -1 && cell == null) {
					topDesc = topDesc + ' <div class="sidebar_share"> ' /*+ getText('Share')*/ + '<div class="addthis_sharing_toolbox addthis_default_style" style="display:inline-block"><a class="addthis_button_preferred_1"></a> <a class="addthis_button_preferred_2"></a>  <a class="addthis_button_preferred_3"></a>  <a class="addthis_button_preferred_4"></a> <a class="addthis_button_compact"></a></div> </div>' + (is_editor ? '<div class="sidebar_edit"><a href="#" onclick="blockUnfold(updateProperties)()"><i class="fa fa-pencil-square"></i> ' + getText('Edit Info') + '</a></div>' : '');
				}

				if (graph_tags.trim() != "") {
					var topTags = graph_tags.split(",").map(function(tag) {
					var t = tag.trim();
					return "<a target='_blank' href='/tag/" + clean(t.replace(/ /g, "-")) + "'>" + clean(t) + "</a>";
					}).join(", ");
					topDesc = topDesc + "<div class='sidebar_tags'>Tags: " + topTags + "</div>";
				}

				if ((!is_editor) && graph_author_name != "") {
					topDesc = topDesc + "<div class='sidebar_author'>Insight Author: <a target='_blank' href='/user/" + clean(graph_author_id) + "'>" + clean(graph_author_name) + "</a></div>";
				}

				if (slids.length > 0) {
					bottomItems.push(createSliders(false, function(cell, value){
						setValue(cell, value);
						if(linkedResults){
							runModel({
								onPause: function(res){
									res.resume();
								},
								onSuccess: function(res){
									//console.log("--");
									//console.log(res);
								},
								resultsWindow: linkedResults
							});
						}
					}, function(slider, setValue, textField, newValue) {
						Ext.Msg.confirm("Change Value", "<p>The current value of the primitive is:</p><br/><p><pre>" + getValue(slider.sliderCell).replace(/\\n/g, "\n") + "</pre></p><br/><p>Are you sure you want to change this value using the slider?</p>", function(btn) {
							if (btn == 'yes') {
								setValue(slider.sliderCell, parseFloat(newValue));
							} else {
								textField.setRawValue("");
								slider.setValue(undefined);
							}
							slider.confirming = false;

						});
					}));
				}
				bottomItems.push({
					xtype: "component",
					height: 0,
					margin: '100 0 0 0'
				});

			}

		} else if (cellType == "Stock") {


			bottomDesc = descBase + 'A stock stores a material or a resource. Lakes and Bank Accounts are both examples of stocks. One stores water while the other stores money. The Initial Value defines how much material is initially in the Stock. ' + descriptionLink("/stocks", "Stocks");
			properties.push({
				'name': 'InitialValue',
				'text': getText('值初始化') + ' =',
				'value': cell.getAttribute("InitialValue"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});

			properties.push({
				'name': 'AllowNegatives',
				'text': getText('允许负值'),
				'value': !isTrue(cell.getAttribute("NonNegative")),
				'group': ' ' + getText('配置')
			});

			properties.push({
				'name': 'StockMode',
				'text': getText('库类型'),
				'value': cell.getAttribute("StockMode"),
				'group': getText('行为'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [
						['Store', getText("存储")],
						['Conveyor', getText("输送")]
					],
					selectOnFocus: false,
					editable: false
				})
			});
			properties.push({
				'name': 'Delay',
				'text': getText('延迟'),
				'value': isDefined(cell.getAttribute("Delay")) ? cell.getAttribute("Delay").toString() : "",
				'group': getText('行为'),
				'renderer': equationRenderer
			});

		} else if (cellType == "Variable") {
			bottomDesc = descBase + "变量是模型中动态更新的对象，它合成可用数据或提供常量值以供方程式使用。 人口的出生率或湖泊中的最大水量都是变量的可能用途。" + descriptionLink("/variables", "Variables");
			properties.push({
				'name': 'Equation',
				'text': getText('值/等式') + ' =',
				'value': cell.getAttribute("Equation"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});
		} else if (cell.value.nodeName == "Link") {
			bottomDesc = descBase + "链接连接模型的不同部分。 如果模型中的一个图元在其等式中引用另一个图元，则两个图元必须直接连接或通过链接连接。 一旦与链接连接，方括号可用于引用其他图元的值。 因此，如果您有一个名为<i>银行余额</ i>的股票，您可以使用<i> [银行余额] </ i>在另一个图元的等式中引用它。" + descriptionLink("/links", "Links");
			properties.push({
				'name': 'BiDirectional',
				'text': getText('双向'),
				'value': isTrue(cell.getAttribute("BiDirectional")),
				'group': ' ' + getText('配置')
			});

		} else if (cell.value.nodeName == "Folder") {
			bottomDesc = descBase + "文件夹以逻辑方式将类似项目组合在一起。 您可以折叠和展开文件夹以隐藏或显示模型复杂性。";
			properties.push({
				'name': 'Type',
				'text': getText('行为'),
				'value': cell.getAttribute("Type"),
				'group': getText('主体'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [
						['None', getText('无')],
						['Agent', getText('主体')]
					],
					editable: false,
					selectOnFocus: false
				})
			});
			properties.push({
				'name': 'Solver',
				'text': getText('时间设置'),
				'value': cell.getAttribute("Equation"),
				'group': ' ' + getText('配置'),
				'renderer': renderTimeBut
			});
			
			properties.push({
				'name': 'Frozen',
				'text': getText('冻结'),
				'value': isTrue(cell.getAttribute("Frozen")),
				'group': ' ' + getText('配置')
			});

			properties.push({
				'name': 'AgentBase',
				'text': getText('主体父类'),
				'value': cell.getAttribute("AgentBase"),
				'group': getText('主体'),
				'editor': new EquationEditor({
					help: "此等式应返回将成为代理的父类的对象。 此对象可用于使用编程代码增强代理的功能。"
				}),
				'renderer': equationRenderer
			});


		} else if (cell.value.nodeName == "Button") {
			bottomDesc = descBase + "按钮用于交互。 要在不触发其操作的情况下选择按钮，请在单击按钮时按住Shift键。 按钮目前处于测试阶段，其实施可能会在更高版本的Insight Maker中发生变化。 可用的按钮API命令是<a href='http://insightmaker.com/sites/default/files/API/'target='_blank'>此处</a>。" + descriptionLink("/scripting", "Model Scripting");

			properties.push({
				'name': 'Function',
				'text': getText('动作'),
				'value': cell.getAttribute("Function"),
				'group': ' ' + getText('配置'),
				'editor': new JavaScriptEditor({})
			});

		} else if (cell.value.nodeName == "Flow") {
			bottomDesc = descBase + "流量表示材料从一个库存转移到另一个库存。 例如，考虑到湖泊的情况，湖泊的流量可能是：河流入流，河流流出，降水和蒸发。 流量给定流量，并且它们在一个单位时间内操作; 实际上：每秒或每一分钟的流量。" + descriptionLink("/flows", "Flows");
			properties.push({
				'name': 'FlowRate',
				'text': getText('流速率') + ' =',
				'value': cell.getAttribute("FlowRate"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'OnlyPositive',
				'text': getText('只有正速率'),
				'value': isTrue(cell.getAttribute("OnlyPositive")),
				'group': ' ' + getText('配置')
			});

		} else if (cell.value.nodeName == "Transition") {
			bottomDesc = descBase + "在各状态之间转换主体。 您可以根据某些条件，概率或超时触发转换。" + descriptionLink("/transitions", "Transitions");
			properties.push({
				'name': 'Trigger',
				'text': getText('触发'),
				'value': cell.getAttribute("Trigger"),
				'group': ' ' + getText('配置'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: ['Timeout', 'Probability', 'Condition'],
					editable: false,
					selectOnFocus: false
				})
			});
			properties.push({
				'name': 'Value',
				'text': getText('值') + ' =',
				'value': cell.getAttribute("Value"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});

			properties.push({
				'name': 'Repeat',
				'text': getText('重复'),
				'value': isTrue(cell.getAttribute("Repeat")),
				'group': ' ' + getText('配置')
			});
			properties.push({
				'name': 'Recalculate',
				'text': getText('重新计算'),
				'value': isTrue(cell.getAttribute("Recalculate")),
				'group': ' ' + getText('配置')
			});
		} else if (cell.value.nodeName == "Action") {
			bottomDesc = descBase + "动作图元可用于执行某些操作，例如转换主体或动态创建它们之间的连接。" + descriptionLink("/actions", "Actions");
			properties.push({
				'name': 'Trigger',
				'text': getText('触发'),
				'value': cell.getAttribute("Trigger"),
				'group': ' ' + getText('配置'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: ['Timeout', 'Probability', 'Condition'],
					editable: false,
					selectOnFocus: false
				})
			});
			properties.push({
				'name': 'Value',
				'text': getText('触发值') + ' =',
				'value': cell.getAttribute("Value"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({
					help: function(config){
			var cell = config.cell;
			if(cell.getAttribute("Trigger") == "Probability"){
				return "You have selected the <i>Probability</i> trigger for this action. The value of this equation is the probability of the action happening each unit of time. You can change the trigger type.";
			}else if(cell.getAttribute("Trigger") == "Condition"){
				return "You have selected the <i>Condition</i> trigger for this action. When the equation evaluates to <tt>True</tt>, the action will happen. You can change the trigger type.";
			}else if(cell.getAttribute("Trigger") == "Timeout"){
				return "You have selected the <i>Timeout</i> trigger for this action. The action will happen after the time specified by this equation passes. You can change the trigger type.";
			}
		}
				}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'Action',
				'text': getText('动作') + ' =',
				'value': cell.getAttribute("Action"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});
			properties.push({
				'name': 'Repeat',
				'text': getText('重复'),
				'value': isTrue(cell.getAttribute("Repeat")),
				'group': ' ' + getText('配置')
			});
			properties.push({
				'name': 'Recalculate',
				'text': getText('重新计算'),
				'value': isTrue(cell.getAttribute("Recalculate")),
				'group': ' ' + getText('配置')
			});
		} else if (cell.value.nodeName == "State") {
			bottomDesc = descBase + "The primitive representing the current state of an agent. A boolean yes/no property. You can connect states with transitions to move an agent between states." + descriptionLink("/states", "States");

			properties.push({
				'name': 'Active',
				'text': getText('开始激活') + ' = ',
				'value': cell.getAttribute("Active"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({}),
				'renderer': equationRenderer
			});

			properties.push({
				'name': 'Residency',
				'text': getText('Residency') + ' = ',
				'value': cell.getAttribute("驻留"),
				'group': ' ' + getText('配置'),
				'editor': new EquationEditor({
					help: "即使要停止状态，状态仍将保持活动状态的时间长度。"
				}),
				'renderer': equationRenderer
			});

		} else if (cell.value.nodeName == "Agents") {
			bottomDesc = descBase + "Agent populations hold a collection of agents: individually simulated entities which may interact with each other." + descriptionLink("/agentpopulations", "Agent Populations");


			var dat = [];
			var folders = primitives("Folder");
			for (var i = 0; i < folders.length; i++) {
				if (folders[i].getAttribute("Type") == "Agent" /*&& connected(folders[i],cell)*/ ) {
					dat.push([folders[i].id, clean(folders[i].getAttribute("name"))])
				}
			}

			var agentStore = new Ext.data.ArrayStore({
				fields: ['myId', 'displayText'],
				data: dat
			});


			properties.push({
				'name': 'Agent',
				'text': getText('主体基'),
				'value': cell.getAttribute("Agent"),
				'group': ' ' + getText('配置'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					store: agentStore,
					selectOnFocus: false,
					valueField: 'myId',
					editable: false,
					displayField: 'displayText'
				}),
				'renderer': primitiveRenderer
			});

			properties.push({
				'name': 'Size',
				'text': getText('群规模'),
				'value': cell.getAttribute("Size"),
				'group': ' ' + getText('配置'),
				'editor': {
					xtype: 'numberfield',
					minValue: 0,
					allowDecimals: false
				}
			});

			properties.push({
				'name': 'GeoWidth',
				'text': getText('宽度'),
				'value': cell.getAttribute("GeoWidth"),
				'group': ' ' + getText('几何'),
				'editor': new EquationEditor({
					help: "群的二维空间地理宽度。"
				}),
				renderer: equationRenderer
			});

			properties.push({
				'name': 'GeoHeight',
				'text': getText('高度'),
				'value': cell.getAttribute("GeoHeight"),
				'group': ' ' + getText('几何'),
				'editor': new EquationEditor({
					help: "群二维空间地理的高度。"
				}),
				renderer: equationRenderer
			});

			properties.push({
				'name': 'GeoDimUnits',
				'text': getText('尺寸单位'),
				'value': cell.getAttribute("GeoDimUnits"),
				'group': ' ' + getText('几何'),
				'editor': new UnitsEditor({})
			});

			properties.push({
				'name': 'GeoWrap',
				'text': getText('环绕'),
				'value': isTrue(cell.getAttribute("GeoWrap")),
				'group': ' ' + getText('几何')
			});

			properties.push({
				'name': 'Placement',
				'text': getText('安置方法'),
				'value': cell.getAttribute("Placement"),
				'group': ' ' + getText('几何'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					selectOnFocus: false,
					editable: false,
					store: [
						["Random", getText("随机")],
						["Grid", getText("格子")],
						["Ellipse", getText("椭圆")],
						["Network", getText("网络")],
						["Custom Function", getText("自定义函数")]
					]
				}),
				'renderer': primitiveRenderer
			});

			properties.push({
				'name': 'PlacementFunction',
				'text': getText('自定义函数'),
				'value': cell.getAttribute("PlacementFunction"),
				'group': ' ' + getText('几何'),
				'editor': new EquationEditor({
					help: "对于每个代理，该等式被评估一次。 它应返回一个表示初始位置的双元素向量，格式为<tt> {x，y} </ tt>。"
				}),
				renderer: equationRenderer
			});

			properties.push({
				'name': 'Network',
				'text': getText('网络结构'),
				'value': cell.getAttribute("Network"),
				'group': ' ' + getText('网络'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					selectOnFocus: false,
					editable: false,
					store: [
						["None", getText("无")],
						["Custom Function", getText("自定义函数")]
					]
				})
			});

			properties.push({
				'name': 'NetworkFunction',
				'text': getText('自定义函数'),
				'value': cell.getAttribute("NetworkFunction"),
				'group': ' ' + getText('网络'),
				'editor': new EquationEditor({
					help: "在模拟开始时，对每对主体评估该等式一次。 可以使用变量<tt> a </ tt>和<tt> b </ tt>在等式中引用这两个主体。 如果等式计算为<tt> True </ tt>，则连接主体。"
				}),
				renderer: equationRenderer
			});



		} else if (cellType == "Ghost") {
			bottomDesc = descBase + "这个项目是另一个原始的'Ghost'。 它反映了源图元的值和属性。 您无法编辑Ghost的属性。 您需要编辑其源的属性。";
			bottomDesc = bottomDesc + "<center style='padding-top: 6px'><a href='#' onclick='var x = findID(getSelected()[0].getAttribute(\"Source\"));highlight(x);'>Show Source <i class='fa fa-angle-right '></i></a></center>" + descriptionLink("/ghosting", "Ghosts");
			
		} else if (cellType == "Converter") {
			bottomDesc = descBase + "转换器存储输入和输出数据表。 当输入源采用其中一个输入值时，转换器将采用相应的输出值。 如果当前输入源值不存在特定输入值，则对最近的输入邻居进行平均。 " + descriptionLink("/converters", "Converters");
			var n = neighborhood(cell);
			var dat = [
				["Time", "Time"]
			];
			for (var i = 0; i < n.length; i++) {
				if (!n[i].linkHidden) {
					dat.push([n[i].item.id, clean(n[i].item.getAttribute("name"))]);
				}
			}
			var converterStore = new Ext.data.ArrayStore({
				fields: ['myId', 'displayText'],
				data: dat
			});



			properties.push({
				'name': 'Source',
				'text': getText('输入源'),
				'value': cell.getAttribute("Source"),
				'group': ' ' + getText('配置'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					queryMode: 'local',
					store: converterStore,
					selectOnFocus: false,
					valueField: 'myId',
					editable: false,
					displayField: 'displayText'
				}),
				'renderer': primitiveRenderer
			});
			properties.push({
				'name': 'Data',
				'text': getText('数据'),
				'value': cell.getAttribute("Data"),
				'group': getText('输入/输出表'),
				'editor': new ConverterEditor({})
			});
			properties.push({
				'name': 'Interpolation',
				'text': getText('插值'),
				'value': cell.getAttribute("Interpolation"),
				'group': ' ' + getText('配置'),
				'editor': new Ext.form.ComboBox({
					triggerAction: "all",
					store: [
						['None', getText("无")],
						['Linear', getText("线性")]
					],
					editable: false,
					selectOnFocus: false
				})
			});
		} else if (cellType == "Picture") {
			bottomDesc = descBase + "图片可以让你的模型图变得活跃起来。 使用主工具栏的“样式”菜单中的图片设置更改图片。" + descriptionLink("/diagramming", "Modeling Diagramming");
		}
		configPanel.removeAll();



		if (topDesc != "") {
			topItems.push(Ext.create('Ext.Component', {
				html: '<div class="' + ((drupal_node_ID == -1) ? "" : "sidebar_top") + '">' + topDesc + '</div>'
			}));
		}
		if (bottomDesc != "") {
			bottomItems.push(Ext.create('Ext.Component', {
				html: '<div class="sidebar_bottom">' + bottomDesc + '</div>'
			}))
		}


		createGrid(properties, topItems, bottomItems, cell);


		if (drupal_node_ID != -1) {
			try {
				addthis.toolbox('.addthis_sharing_toolbox')
			} catch (err) {

			}
		}
	}


	selectionChanged(false);

	if (drupal_node_ID == -1) {
		setSaveEnabled(true);
	} else {
		setSaveEnabled(false);
	}

	updateWindowTitle();


	handelCursors();

	handleUnfoldToolbar();

	if (is_embed && (is_zoom == 1)) {
		graph.getView().setScale(0.25);
		graph.fit();
		graph.fit();
	}
	

	// Override importCells to map key ID's

    var setID = function(cell){
		if(getID(cell)){
			cell.setAttribute("oldId", getID(cell));
		}
		if(getType(cell) == "Folder"){
			getChildren(cell, false).forEach(setID);
		}
	};
		
	graph.cloneCells = function(cells){
		
		cells.forEach(setID);
		
		return mxGraph.prototype.cloneCells.apply(graph, arguments);
	}

	graph.importCells = function(cells){
		function cellWithOldID(oldID) {
			var cs = newCells.slice();
			for(var i=0; i<newCells.length; i++){
				if(getType(newCells[i]) == "Folder"){
					cs = cs.concat(getChildren(newCells[i]));
				}
			}
			for (var i = 0; i < cs.length; i++) {
				if (cs[i].getAttribute("oldId") == oldID) {
					return cs[i];
				}
			}
			return findID(oldID);
		}
	
		
		cells.forEach(setID);
	
		var newCells = mxGraph.prototype.importCells.apply(graph, arguments);
	
		var updateID = function(cell) {
			if (cell.getAttribute("oldId") != undefined && cell.getAttribute("oldId") != "undefined") {
				if (cell.value.nodeName == "Converter") {
					var source = cell.getAttribute("Source");
					if (source[0] != "*" && source != "Time") {
						cell.setAttribute("Source", cellWithOldID(source).id);
					}
				} else if (cell.value.nodeName == "Agents") {
					cell.setAttribute("Agent", cellWithOldID(cell.getAttribute("Agent")).id);
				} else if (cell.value.nodeName == "Ghost") {
					cell.setAttribute("Source", cellWithOldID(cell.getAttribute("Source")).id);
				}
			}
			
			if(getType(cell) == "Folder"){
				getChildren(cell, false).forEach(updateID);
			}
		};
		
		newCells.forEach(updateID);

		newCells.forEach(setID);
		
		return newCells;
	}

	// Frozen hover effect

	function updateStyle(state, hover)
	{
		if(state.cell.value.nodeName == "Folder" && getFrozen(state.cell)){
			if (hover)
			{
				state.style[mxConstants.STYLE_STROKECOLOR] = '#05B8CC';
				//state.style[mxConstants.STYLE_FONTCOLOR] = '#05B8CC';
				state.style[mxConstants.STYLE_DASHED] = 0;
				//console.log(state.style);
			}
	
		}
	};

	graph.addMouseListener(
	{
	    currentState: null,
	    previousStyle: null,
    
	    mouseMove: function(sender, me)
	    {
	        if (this.currentState != null && me.getState() == this.currentState)
	        {
	            return;
	        }

	        var tmp = graph.view.getState(me.getCell());

	        // Ignores everything but vertices
	        if (graph.isMouseDown || (tmp != null && tmp.cell.value.nodeName != "Folder"))
	        {
	        	tmp = null;
	        }

	        if (tmp != this.currentState)
	        {
	            if (this.currentState != null)
	            {
	                this.dragLeave(me.getEvent(), this.currentState);
	            }

	            this.currentState = tmp;

	            if (this.currentState != null)
	            {
	                this.dragEnter(me.getEvent(), this.currentState);
	            }
	        }
	    },
	    dragEnter: function(evt, state)
	    {
	        if (state != null)
	        {
	        	this.previousStyle = state.style;
	        	state.style = mxUtils.clone(state.style);
	        	updateStyle(state, true);
				if(state.shape){

		        	state.shape.apply(state);
		        	state.shape.reconfigure();
				}
	        }
	    },
	    dragLeave: function(evt, state)
	    {
	        if (state != null)
	        {
	        	state.style = this.previousStyle;
	        	updateStyle(state, false);
				if(state.shape){
					if(getLineColor(state.cell) == undefined){
						state.style[mxConstants.STYLE_STROKECOLOR] = mxConstants.NONE;
					}
					/*if(getFontColor(state.cell) == undefined){
						state.style[mxConstants.STYLE_FONTCOLOR] = mxConstants.NONE;
					}*/
					
		        	state.shape.apply(state);
		        	state.shape.reconfigure();
				}
	        }
	    },
		mouseDown: function(){},
		mouseUp: function(){}
	});
	
	
	window.doneLoading = true;

};


var surpressCloseWarning = false;

function confirmClose() {
	if (!surpressCloseWarning) {
		if ((!saved_enabled) || ribbonPanelItems().down('#savebut').disabled || (!undoHistory.canUndo())) {

		} else {
			return getText("您已对此模型进行了未保存的更改。 如果您在保存之前离开，他们将会丢失。");
		}
	} else {
		surpressCloseWarning = false;
	}
}


window.onbeforeunload = function() {
	return confirmClose();
};



Ext.round = function(n, d) {
	var result = Number(n);
	if (typeof d == 'number') {
		d = Math.pow(10, d);
		result = Math.round(n * d) / d;
	}
	return result;
};

var makeGhost = function(item) {
	var provided = item.value;
	item = provided ? item : graph.getSelectionCell();
	var parent = graph.getDefaultParent();

	var location = getPosition(item);

	var vertex;
	var style = item.getStyle();
	style = mxUtils.setStyle(style, "opacity", 30);
	graph.getModel().beginUpdate();

	vertex = graph.insertVertex(parent, null, primitiveBank.ghost.cloneNode(true), location[0] + 10, location[1] + 10, item.getGeometry().width, item.getGeometry().height, style);
	vertex.value.setAttribute("Source", item.id);
	vertex.value.setAttribute("name", item.getAttribute("name"));
	if (!provided) {
		graph.setSelectionCell(vertex);
	}
	graph.getModel().endUpdate();

	return vertex;


};

var makeFolder = function() {
	var group = graph.groupCells(null, 20);
	group.setConnectable(true);
	graph.setSelectionCell(group);
	graph.orderCells(true);
};



function showContextMenu(node, e) {
	var selectedItems = getSelected();
	var folder = false;
	if (selectedItems.length > 0) {
		folder = selectedItems[0].value.nodeName == "Folder" && (!getCollapsed(selectedItems[0]));
	}
	var selected = selectedItems.length > 0 && (!folder);


	var paste = {
		hidden: is_ebook,
		text: getText('粘贴'),
		glyph: 0xf0ea,
		disabled: mxClipboard.isEmpty(),
		handler: function() {
			graph.getModel().beginUpdate();
			try
			{
				var cells = mxClipboard.paste(graph);
				var pt = graph.getPointForEvent(e);
				if (cells != null)
				{
					var bb = graph.getBoundingBoxFromGeometry(cells);
				
					if (bb != null)
					{
						var t = graph.view.translate;
						var s = graph.view.scale;
						var dx = t.x;
						var dy = t.y;
					
						var x = Math.round(graph.snap(pt.x / s - dx));
						var y = Math.round(graph.snap(pt.y / s - dy));
					
						graph.cellsMoved(cells, x - bb.x, y - bb.y);
					}
				}
			}
			finally
			{
				graph.getModel().endUpdate();
			}

			clipboardListener();

		},
		scope: this
	};
	
	var menuItems = [];
	if(viewConfig.allowEdits){
		
	
	if (!selected) {
		var menuItems = [
			/*editActions.paste,
		'-',*/
			{
				text: getText("创建库"),
				glyph: 0xf1b2,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新库"), "Stock", [pt.x, pt.y], [100, 40]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, {
				text: getText("创建变量"),
				glyph: 0xf0e4,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新变量"), "Variable", [pt.x, pt.y], [120, 50]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, {
				text: getText("创建转换器"),
				glyph: 0xf1fe,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新转换器"), "Converter", [pt.x, pt.y], [120, 50]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, '-', {
				text: getText("创建主体群"),
				glyph: 0xf0c0,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("主体群"), "Agents", [pt.x, pt.y], [170, 80]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, {
				text: getText("创建状态"),
				glyph: 0xf046,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新状态"), "State", [pt.x, pt.y], [100, 40]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);

				}
			}, {
				text: getText("创建动作"),
				glyph: 0xf0e7,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新动作"), "Action", [pt.x, pt.y], [120, 50]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, , '-', {
				text: getText("创建文本框"),
				glyph: 0xf035,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新文本框"), "Text", [pt.x, pt.y], [200, 50]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}, {
				text: getText("创建图片"),
				glyph: 0xf03e,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive("", "Picture", [pt.x, pt.y], [64, 64]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setPicture(cell);
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}

			}, {
				text: getText("创建按钮"),
				glyph: 0xf196,
				handler: function() {
					graph.model.beginUpdate();
					var pt = graph.getPointForEvent(e);
					var cell = createPrimitive(getText("新按钮"), "Button", [pt.x, pt.y], [120, 40]);
					graph.model.endUpdate();
					if (folder) {
						setParent(cell, selectedItems[0]);
					}
					setSelected(cell);

					setTimeout(function() {
						graph.cellEditor.startEditing(cell)
					}, 20);
				}
			}
		];
		if (!is_ebook) {


			menuItems = menuItems.concat([
				'-', {
					glyph: 0xf0ed,
					text: getText("插入模型"),
					handler: function() {
						showInsertModelWindow(graph.getPointForEvent(e));
					}
				},
				'-', {
					glyph: 0xf1c5,
					text: getText("导出SVG"),
					handler: function() {
						exportSvg();
					}
				},
				{
					itemId: "zoomMenuButton",
					text: getText('缩放'),
					glyph: 0xf002,
					menu: zoomMenu
				}

			]);


		}
		
		if(!mxClipboard.isEmpty()){
			menuItems.unshift("-");
			menuItems.unshift(paste);
		}

	} else {
		menuItems = [
			editActions.copy,
			editActions.cut,
			paste,
			'-',
			editActions["delete"],
			'-', {
				text: getText("影子图元"),
				glyph: 0xf0c5,
				disabled: graph.getSelectionCount() != 1 || ((!isValued(graph.getSelectionCell()) && graph.getSelectionCell().value.nodeName != "Picture")) || graph.getSelectionCell().value.nodeName == "Flow" || graph.getSelectionCell().value.nodeName == "Ghost",
				handler: makeGhost
			}, {
				text: getText("创建文件夹"),
				glyph: 0xf114,
				disabled: !selected,
				handler: makeFolder
			},
			'-'/*, {
				text: getText("Style"),
				glyph: 0xf0d0,
				menu: styleMenu
			}*/
		].concat(styleMenu.filter(function(x){return ! x.excludeFromContext}));
		if(selectedItems.length == 1 && (selectedItems[0].value.nodeName == "Flow" || selectedItems[0].value.nodeName == "Link")){
			menuItems = menuItems.concat([
				'-',
				{
					text: getText("反转箭头方向"),
					glyph: 0xf0ec,
					handler: reverseDirection
				}
				])
		}
	}
	}else{
		menuItems.push({
					itemId: "zoomMenuButton",
					text: getText('缩放'),
					glyph: 0xf002,
					menu: zoomMenu
				});
	}


	var menu = new Ext.menu.Menu({
		items: menuItems
	});

	if (selected) {
		menu.down('#bold').setChecked(currentStyleIs(mxConstants.FONT_BOLD));
		menu.down('#italic').setChecked(currentStyleIs(mxConstants.FONT_ITALIC));
		menu.down('#underline').setChecked(currentStyleIs(mxConstants.FONT_UNDERLINE));
		
        menu.down("#sizeCombo").setValue(graph.getCellStyle(selectedItems[0])[mxConstants.STYLE_FONTSIZE]);
        menu.down("#fontCombo").setValue(graph.getCellStyle(selectedItems[0])[mxConstants.STYLE_FONTFAMILY]);
	} else {
		//	menu.down('#paste').setDisabled(ribbonPanelItems().down('#paste').isDisabled());
	}

	// Adds a small offset to make sure the mouse released event
	// is routed via the shape which was initially clicked. This
	// is required to avoid a reset of the selection in Safari.
	menu.showAt([mxEvent.getClientX(e) + 1, mxEvent.getClientY(e) + 1]);
	menu.focus();
}


mxCellRenderer.prototype.initControl = function(state, control, handleEvents, clickHandler)
{
	var graph = state.view.graph;
	
	// In the special case where the label is in HTML and the display is SVG the image
	// should go into the graph container directly in order to be clickable. Otherwise
	// it is obscured by the HTML label that overlaps the cell.
	var isForceHtml = graph.isHtmlLabel(state.cell) && mxClient.NO_FO &&
		graph.dialect == mxConstants.DIALECT_SVG;

	if (isForceHtml)
	{
		control.dialect = mxConstants.DIALECT_PREFERHTML;
		control.init(graph.container);
		control.node.style.zIndex = 1;
	}
	else
	{
		control.init(state.view.getOverlayPane());
	}

	var node = control.innerNode || control.node;
	
	if (clickHandler)
	{
		if (graph.isEnabled())
		{
			node.style.cursor = 'pointer';
		}
		
		mxEvent.addListener(node, 'click', clickHandler);
		mxEvent.addListener(node, 'touchstart', clickHandler); /*SFR XXX adding touch support*/
	}
	
	if (handleEvents)
	{
		mxEvent.addGestureListeners(node,
			function (evt)
			{
				graph.fireMouseEvent(mxEvent.MOUSE_DOWN, new mxMouseEvent(evt, state));
				mxEvent.consume(evt);
			},
			function (evt)
			{
				graph.fireMouseEvent(mxEvent.MOUSE_MOVE, new mxMouseEvent(evt, state));
			});
	}
	
	return node;
};


mxSvgCanvas2D.prototype.text = function(x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation, dir)
{
	if (this.textEnabled && str != null)
	{
		rotation = (rotation != null) ? rotation : 0;
		
		var s = this.state;
		x += s.dx;
		y += s.dy;
		
		if (this.foEnabled && format == 'html')
		{
			var style = 'vertical-align:top;';
			
			if (clip)
			{
				style += 'overflow:hidden;max-height:' + Math.round(h) + 'px;max-width:' + Math.round(w) + 'px;';
			}
			else if (overflow == 'fill')
			{
				style += 'width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;';
			}
			else if (overflow == 'width')
			{
				style += 'width:' + Math.round(w) + 'px;';
				
				if (h > 0)
				{
					style += 'max-height:' + Math.round(h) + 'px;';
				}
			}

			if (wrap && w > 0)
			{
				style += 'width:' + Math.round(w) + 'px;white-space:normal;';
			}
			else
			{
				style += 'white-space:nowrap;';
			}
			
			// Uses outer group for opacity and transforms to
			// fix rendering order in Chrome
			var group = this.createElement('g');
			
			if (s.alpha < 1)
			{
				group.setAttribute('opacity', s.alpha);
			}

			var fo = this.createElement('foreignObject');
			fo.setAttribute('pointer-events', 'all');
			
			var div = this.createDiv(str, align, valign, style, overflow);
			
			// Ignores invalid XHTML labels
			if (div == null)
			{
				return;
			}
			else if (dir != null)
			{
				div.setAttribute('dir', dir);
			}

			group.appendChild(fo);
			this.root.appendChild(group);
			
			// Code that depends on the size which is computed after
			// the element was added to the DOM.
			var ow = 0;
			var oh = 0;
			
			// Padding avoids clipping on border and wrapping for differing font metrics on platforms
			var padX = 2;
			var padY = 2;

			// NOTE: IE is always export as it does not support foreign objects
			if (mxClient.IS_IE && (document.documentMode == 9 || !mxClient.IS_SVG))
			{
				// Handles non-standard namespace for getting size in IE
				var clone = document.createElement('div');
				
				clone.style.cssText = div.getAttribute('style');
				clone.style.display = (mxClient.IS_QUIRKS) ? 'inline' : 'inline-block';
				clone.style.position = 'absolute';
				clone.style.visibility = 'hidden';

				// Inner DIV is needed for text measuring
				var div2 = document.createElement('div');
				div2.style.display = (mxClient.IS_QUIRKS) ? 'inline' : 'inline-block';
				div2.innerHTML = (mxUtils.isNode(str)) ? str.outerHTML : str;
				clone.appendChild(div2);

				document.body.appendChild(clone);

				// Workaround for different box models
				if (document.documentMode != 8 && document.documentMode != 9 && s.fontBorderColor != null)
				{
					padX += 2;
					padY += 2;
				}

				if (wrap && w > 0)
				{
					var tmp = div2.offsetWidth;
					
					// Workaround for adding padding twice in IE8/IE9 standards mode if label is wrapped
					var padDx = 0;
					
					// For export, if no wrapping occurs, we add a large padding to make
					// sure there is no wrapping even if the text metrics are different.
					// This adds support for text metrics on different operating systems.
					if (!clip && this.root.ownerDocument != document)
					{
						var ws = clone.style.whiteSpace;
						clone.style.whiteSpace = 'nowrap';
						
						// Checks if wrapped width is equal to non-wrapped width (ie no wrapping)
						if (tmp == div2.offsetWidth)
						{
							padX += this.fontMetricsPadding;
						}
						else if (document.documentMode == 8 || document.documentMode == 9)
						{
							padDx = -2;
						}
						
						// Restores the previous white space
						// This is expensive!
						clone.style.whiteSpace = ws;
					}
					
					// Required to update the height of the text box after wrapping width is known
					tmp = tmp + padX;
					
					if (clip)
					{
						tmp = Math.min(tmp, w);
					}
					
					clone.style.width = tmp + 'px';
	
					// Padding avoids clipping on border
					ow = div2.offsetWidth + padX + padDx;
					oh = div2.offsetHeight + padY;
					
					// Overrides the width of the DIV via XML DOM by using the
					// clone DOM style, getting the CSS text for that and
					// then setting that on the DIV via setAttribute
					clone.style.display = 'inline-block';
					clone.style.position = '';
					clone.style.visibility = '';
					clone.style.width = ow + 'px';
					
					div.setAttribute('style', clone.style.cssText);
				}
				else
				{
					// Padding avoids clipping on border
					ow = div2.offsetWidth + padX;
					oh = div2.offsetHeight + padY;
				}

				clone.parentNode.removeChild(clone);
				fo.appendChild(div);
			}
			else
			{
				// Workaround for export and Firefox where sizes are not reported or updated correctly
				// when inside a foreignObject (Opera has same bug but it cannot be fixed for all cases
				// using this workaround so foreignObject is disabled).
				if (this.root.ownerDocument != document || mxClient.IS_FF)
				{
					// Getting size via local document for export
					div.style.visibility = 'hidden';
					document.body.appendChild(div);
				}
				else
				{
					fo.appendChild(div);
				}

				var sizeDiv = div;
				
				if (sizeDiv.firstChild != null && sizeDiv.firstChild.nodeName == 'DIV')
				{
					sizeDiv = sizeDiv.firstChild;
				}
				
				var tmp = sizeDiv.offsetWidth;
				
				// For export, if no wrapping occurs, we add a large padding to make
				// sure there is no wrapping even if the text metrics are different.
				if (!clip && wrap && w > 0 && this.root.ownerDocument != document)
				{
					var ws = div.style.whiteSpace;
					div.style.whiteSpace = 'nowrap';
					
					if (tmp == sizeDiv.offsetWidth)
					{
						padX += this.fontMetricsPadding;
					}
					
					div.style.whiteSpace = ws;
				}

				ow = tmp + padX;

				// Recomputes the height of the element for wrapped width
				if (wrap)
				{
					if (clip)
					{
						ow = Math.min(ow, w);
					}
					
					div.style.width = ow + 'px';
				}

				ow = sizeDiv.offsetWidth + padX;
				oh = sizeDiv.offsetHeight + 2;

				if (div.parentNode != fo)
				{
					fo.appendChild(div);
					div.style.visibility = '';
				}
			}

			if (clip)
			{
				oh = Math.min(oh, h);
				ow = Math.min(ow, w);
			}

			if (overflow == 'fill')
			{
				w = Math.max(w, ow);
				h = Math.max(h, oh);
			}
			else if (overflow == 'width')
			{
				w = Math.max(w, ow);
				h = oh;
			}
			else
			{
				w = ow;
				h = oh;
			}

			if (s.alpha < 1)
			{
				group.setAttribute('opacity', s.alpha);
			}
			
			var dx = 0;
			var dy = 0;

			if (align == mxConstants.ALIGN_CENTER)
			{
				dx -= w / 2;
			}
			else if (align == mxConstants.ALIGN_RIGHT)
			{
				dx -= w;
			}
			
			x += dx;
			
			// FIXME: LINE_HEIGHT not ideal for all text sizes, fix for export
			if (valign == mxConstants.ALIGN_MIDDLE)
			{
				dy -= h / 2 - 2;
			}
			else if (valign == mxConstants.ALIGN_BOTTOM)
			{
				dy -= h - 3;
			}
			
			// Workaround for rendering offsets
			// TODO: Check if export needs these fixes, too
			//if (this.root.ownerDocument == document)
			{
				if (!mxClient.IS_OP && mxClient.IS_GC && mxClient.IS_MAC)
				{
					dy += 1;
				}
				else if (mxClient.IS_FF && mxClient.IS_WIN)
				{
					dy -= 1;
				}
			}
			
			if(mxClient.IS_FF ){
				dy -= 1; /* SFR XX FIXME Spacing is off without this */
			}else{
				dy -= 2; /* SFR XX FIXME Spacing is off without this */
			}
			
			
			y += dy;

			var tr = (s.scale != 1) ? 'scale(' + s.scale + ')' : '';

			if (s.rotation != 0 && this.rotateHtml)
			{
				tr += 'rotate(' + (s.rotation) + ',' + (w / 2) + ',' + (h / 2) + ')';
				var pt = this.rotatePoint((x + w / 2) * s.scale, (y + h / 2) * s.scale,
					s.rotation, s.rotationCx, s.rotationCy);
				x = pt.x - w * s.scale / 2;
				y = pt.y - h * s.scale / 2;
			}
			else
			{
				x *= s.scale;
				y *= s.scale;
			}

			if (rotation != 0)
			{
				tr += 'rotate(' + (rotation) + ',' + (-dx) + ',' + (-dy) + ')';
			}

			group.setAttribute('transform', 'translate(' + Math.round(x) + ',' + Math.round(y) + ')' + tr);
			fo.setAttribute('width', Math.round(Math.max(1, w)));
			fo.setAttribute('height', Math.round(Math.max(1, h)));
			
			// Adds alternate content if foreignObject not supported in viewer
			if (this.root.ownerDocument != document)
			{
				var alt = this.createAlternateContent(fo, x, y, w, h, str, align, valign, wrap, format, overflow, clip, rotation);
				
				if (alt != null)
				{
					fo.setAttribute('requiredFeatures', 'http://www.w3.org/TR/SVG11/feature#Extensibility');
					var sw = this.createElement('switch');
					sw.appendChild(fo);
					sw.appendChild(alt);
					group.appendChild(sw);
				}
			}
		}
		else
		{
			this.plainText(x, y, w, h, str, align, valign, wrap, overflow, clip, rotation, dir);
		}
	}
};

