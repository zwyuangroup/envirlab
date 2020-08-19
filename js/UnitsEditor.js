"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

var UnitsEditor = Ext.extend(Ext.form.TextField, {
	enableKeyEvents: false,
	selectOnFocus: true,
	stripCharsRe: /[^A-Za-z 0-9\.\/\(\)\*\^]/g,
	triggers: {
		edit: {
			hideOnReadOnly: false,
			handler: function() {
				this.editorWindow = new UnitsWindow({
					parent: this,
					units: this.getValue()
				});
				this.editorWindow.show();
			}
		}
	},
	listeners: {
		'keydown': function(field) {
			field.setEditable(false);
		},
		'beforerender': function() {
			if (this.regex != undefined) {
				this.validator = function(value) {
					return this.regex.test(value);
				};
			}

		}
	}
});


function UnitsWindow(config) {
	var me = this;

	function setUnitsText(u) {
		unitsLabel.setValue(clean(u));
	}

	var unitsLabel = new Ext.form.field.Text({
		xtype: "textfield",
		height: 40,
		fieldStyle: "font-size: x-large; text-align:center;",
		stripCharsRe: /[^A-Za-z 0-9\.\/\(\)\*\^]/g
	})

	var store = Ext.create('Ext.data.TreeStore', {
		root: {
			text: getText('单位'),
			draggable: false,
			expanded: true,
			children: [

			]
		}
	});

	var tree = new Ext.tree.Panel({
		animate: false,
		frame: true,
		store: store,
		autoScroll: true,
		useArrows: true,
		flex: 1,
		margin: '5,5,5,5',
		rootVisible: false,
		folderSort: false,
		listeners: {
			selectionchange: function(v, selections, opts) {

				if (selections[0].data.leaf) {
					setUnitsText(selections[0].data.text);
				}
			}
		}
	});


	var setupUnits = function(tree) {

		var root = tree.getRootNode();


		var unitsTxt = "距离，面积和体积\r 公制\r  毫米\r  厘米\r  米\r  公里\r  -\r  平方毫米\r  平方厘米\r  平方米\r  公顷\r  平方公里\r  -\r  立方毫米\r  立方厘米\r  升\r  立方米\r 英制\r  英寸\r  英尺\r  码\r  英里\r  -\r  平方英寸\r  平方英尺\r  平方码\r  英亩\r  平方英里\r  -\r  液体盎司\r  夸脱\r  加仑\r  英亩英尺\r速度，加速度和流量\r 公制\r  米每秒\r  米每秒的平方\r  公里每小时\r  平方公里每小时的平方\r  -\r  公升每秒\r  立方米每秒\r  -\r  公斤每秒\r 英制\r  英尺每秒\r  英尺每秒的平方\r  英里每小时\r  英里每小时的平方\r  -\r  加仑每秒\r  加仑每分钟\r  -\r  磅每秒\r质量，力和压力\r 公制\r  毫克\r  克\r  千克\r  吨\r  -\r  牛顿\r  -\r  帕斯卡\r  千帕斯卡\r  巴\r  标准大气压\r 英制\r  盎司\r  磅\r  吨\r  -\r  磅力\r  -\r  磅每平方英寸\r温度和能量\r 公制\r  摄氏度\r  开尔文度\r  -\r  焦耳\r  千焦耳\r  -\r  瓦特\r  千瓦\r  兆瓦\r  千兆瓦\r  -\r  安培\r  -\r  毫伏\r  伏特\r  千伏特\r  -\r  库仑\r  -\r  法拉\r 英制\r  华氏度\r  -\r  卡路里\r  千卡\r  英国热量单位\r时间\r 毫秒\r 秒\r 分钟\r 小时\r 天\r 周\r 月份\r 季度\r 年\r货币\r 美元\r 美元流\r  美元每秒\r  美元每小时\r  美元每天\r  美元每周\r  美元每月\r  美元每季度\r  美元每年\r -\r 欧元\r 欧元流\r  欧元每秒\r  欧元每小时\r  欧元每天\r  欧元每周\r  欧元每月\r  欧元每季度\r  欧元每年\r商业和商务\r 人员\r 客户\r 员工\r 工人\r -\r 工厂\r 建筑物\r -\r 单位\r 小部件\r 零件\r生态与自然\r 个体\r 动物\r 植物\r 树木\r 生物质\r化学\r 原子\r 分子\r -\r 摩尔";



		var roots = [root];
		var lastNode = root.appendChild({
			text: "无单位",
			draggable: false,
			leaf: true,
			expanded: true
		});



		var modelUnits = unitsUsedInModel();
		if (modelUnits.length > 0) {
			lastNode = root.appendChild({
				text: getText("模型中使用的单位"),
				draggable: false,
				leaf: false,
				expanded: true
			});
			for (var i = 0; i < modelUnits.length; i++) {
				lastNode.appendChild({
					text: modelUnits[i],
					draggable: false,
					leaf: true,
					expanded: true
				});
			}
		}


		var cU = customUnits();
		if (cU.length > 0) {
			lastNode = root.appendChild({
				text: getText("自定义单位"),
				draggable: false,
				leaf: false,
				expanded: true
			});
			for (var i = 0; i < cU.length; i++) {
				lastNode.appendChild({
					text: clean(cU[i][0]),
					draggable: false,
					leaf: true,
					expanded: false
				});
			}
		}

		var indentation = 0;
		var unitLines = unitsTxt.split(/[\n\r]/);
		for (var i = 0; i < unitLines.length; i++) {
			var res = unitLines[i].match(/^ *(.*?)$/);
			if (res[1] != "-") {
				var currIndentation = unitLines[i].length - res[1].length;
				if (currIndentation > indentation) {

					lastNode.leaf = false;
					lastNode.iconCls = 'icon-folder';
					lastNode = roots[roots.length - 1].appendChild(lastNode);
					roots.push(lastNode);
				} else if (currIndentation < indentation) {
					lastNode = roots[roots.length - 1].appendChild(lastNode);
					for (var j = 0; j < indentation - currIndentation; j++) {
						roots.pop();
					}
				} else {

					lastNode = roots[roots.length - 1].appendChild(lastNode);
				}

				indentation = currIndentation;

				lastNode = {
					text: res[1],
					draggable: false,
					leaf: true,
					expanded: false
				};
			}
		}

	}

	setupUnits(tree);

	var win = new Ext.Window({
		title: getText('图元单位'),
		layout: {
			type: "vbox",
			align: "stretch"
		},
		tools: [{
			type: 'help',
			tooltip: getText('帮助'),
			callback: function(panel, tool, event) {
				showURL("/units");
			}
		}],
		closeAction: 'destroy',
		border: false,
		modal: true,
		resizable: true,
		maximizable: true,
		stateful: is_editor && (!is_embed),
		stateId: "units_window",
		shadow: true,
		buttonAlign: 'left',
		layoutConfig: {
			columns: 1
		},
		width: Math.min(Ext.getBody().getViewSize().width, 560),
		height: Math.min(Ext.getBody().getViewSize().height, 400),
		items: [unitsLabel, tree],
		buttons: [{
			id: 'units_but',
			scale: "large",
			text: getText('单位转换'),
			glyph: 0xf1de,
			handler: function() {
				var setting = getSetting();


				var genData = function() {
					var data = [];
					var items = customUnits();
					for (var i = 0; i < items.length; i++) {
						var ent = items[i];
						data.push({
							name: ent[0],
							scale: ent[1],
							synonym: ent[2]
						});

					}
					return data;
				}

				var store = Ext.create('Ext.data.Store', {
					fields: [{
						name: 'name',
						type: 'string'
					}, {
						name: 'synonym',
						type: 'string'
					}, {
						name: 'scale',
						type: 'float'
					}],
					data: genData(),
					sorters: ['name']
				});

				var editor = new Ext.grid.plugin.RowEditing({
					saveText: 'Apply'
				});


				var columnsList = [{
					header: getText('名称'),
					dataIndex: 'name',
					flex: 2,
					sortable: true,
					editor: {
						xtype: 'textfield',
						allowBlank: false,
						regex: /^[a-zA-Z][a-z A-Z]*$/,
						regexText: getText("单位名称只能包含字母和空格。")
					}
				}, {
					xtype: 'numbercolumn',
					header: getText('规模'),
					dataIndex: 'scale',
					width: 150,
					sortable: false,
					editor: {
						xtype: 'numberfield',
						allowBlank: false,
						decimalPrecision: 10
					}
				}, {
					header: getText('同义词'),
					dataIndex: 'synonym',
					flex: 3,
					sortable: false,
					editor: {
						xtype: 'textfield',
						allowBlank: true,
						emptyText: "米/秒^2",
						regex: /^([a-zA-Z][a-z A-Z]*(\^-?[\d\.]+)?[\*\/]?)*$/,
						regexText: getText("单位同义词的格式应为： 米*秒^2/千克.")
					}
				}];

				var grid = new Ext.grid.GridPanel({
					store: store,
					plugins: [editor],
					features: [],
					tbar: [{
						glyph: 0xf056,
						iconCls: 'red-icon',
						itemId: "removeBut",
						text: getText('删除转换'),
						disabled: true,
						handler: function() {
							editor.completeEdit();
							var s = grid.getSelectionModel().getSelection();
							for (var i = 0, r; r = s[i]; i++) {
								store.remove(r);
							}
						}
					}, "->", {
						glyph: 0xf055,
						text: getText('添加转换'),
						iconCls: 'green-icon',
						handler: function() {
							var e = {
								name: getText('新的单位名称'),
								synonym: '',
								scale: 1
							};
							editor.completeEdit();
							store.insert(0, e);
							//store.getAt(0).setDirty();
							grid.getView().refresh();
							grid.getSelectionModel().selectRange(0, 0);
							editor.startEdit(0, 0);
						}
					}],

					columns: columnsList
				});

				var saveUnits = function() {
					grid.plugins[0].completeEdit();
					var c = store.getCount();
					for (var i = 0; i < c; i++) {
						var record = store.getAt(i);
						record.commit();
					}

					var newUnits = "";

					if (store.getCount() > 0) {
						newUnits = store.getAt(0).get("name") + "<>" + store.getAt(0).get("scale") + "<>" + store.getAt(0).get("synonym");
					}
					for (var i = 1; i < store.getCount(); i++) {
						newUnits = newUnits + "\n" + store.getAt(i).get("name") + "<>" + store.getAt(i).get("scale") + "<>" + store.getAt(i).get("synonym");
					}

					graph.getModel().beginUpdate();

					var edit = new mxCellAttributeChange(
						setting, "Units", newUnits);
					graph.getModel().execute(edit);
					graph.getModel().endUpdate();
					setupUnits(tree);

					unitsWin.close();
				}


				grid.getSelectionModel().on('selectionchange', function(sm) {
					grid.getDockedItems()[0].getComponent("removeBut").setDisabled(sm.getCount() < 1);
				});

				var unitsWin = new Ext.Window({
					layout: 'fit',
					modal: true,
					title: getText("配置自定义单位转换"),
					width: Math.min(Ext.getBody().getViewSize().width, 530),
					height: Math.min(Ext.getBody().getViewSize().height, 430),
					resizable: true,
					closeAction: 'close',
					closable: false,
					items: [grid],
					buttons: [{
						scale: "large",
						glyph: 0xf05c,
						text: getText('取消'),
						handler: function() {
							unitsWin.close()
						}
					}, {
						scale: "large",
						glyph: 0xf00c,
						text: getText('应用'),
						handler: saveUnits
					}]

				});

				unitsWin.show();
			},
			scope: this
		}, "->", {
			scale: "large",
			glyph: 0xf05c,
			text: getText('取消'),
			handler: function() {
				win.close();
				if (config.parent != "") {
					config.parent.resumeEvents();
				}
			}
		}, {
			hidden: !viewConfig.allowEdits,
			scale: "large",
			glyph: 0xf00c,
			text: getText('应用'),
			handler: function() {;
				if (config.parent != "") {
					win.close();
					editingRecord.set("value", unitsLabel.getValue());
					saveConfigRecord(editingRecord);
				} else {
					graph.getModel().beginUpdate();
					config.cell.setAttribute("Units", unitsLabel.getValue());
					graph.getModel().endUpdate();
					win.close();
				}
				if (Ext.getCmp("equationUnitsBut")) {
					Ext.getCmp("equationUnitsBut").setText(formatUnitsBut(unitsLabel.getValue()));
				}
			}
		}]

	});

	me.show = function() {
		win.show();
		setUnitsText(config.units);
	}
}
