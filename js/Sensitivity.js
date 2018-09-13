"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

var sensitivityProgress;
var sensitivityController = {}

	function doSensitivity() {
		var displayConfigStore = new Ext.data.JsonStore({
			fields: [{
				name: 'pid',
				type: 'string'
			}, {
				name: 'pname',
				type: 'string'
			}],
			data: []
		});


		var storeData = [];
		var prims = excludeType(primitives(), "Ghost");
		for (var i = 0; i < prims.length; i++) {
			if (isValued(prims[i]) && (!inAgent(prims[i]))) {
				storeData.push({
					pid: prims[i].id,
					pname: prims[i].getAttribute("name")
				});
			}
		}
		displayConfigStore.loadData(storeData);


		var mySetting = getSetting();

		var p = new Ext.FormPanel({
			fieldDefaults: {
				labelWidth: 195,
				width: "100%"
			},
			autoScroll: true,
			frame: false,
			bodyStyle: 'padding: 10px',
			defaultType: 'textfield',
			items: [

				Ext.create('Ext.form.field.Tag', {
					fieldLabel: getText('受监控的图元'),
					name: 'monPrimitives',
					id: 'monPrimitives',
					displayField: 'pname',
					filterPickList: true,
					valueField: 'pid',
					queryMode: 'local',
					store: displayConfigStore,
					emptyText: getText('选择要监控的图元'),
					value: mySetting.getAttribute("SensitivityPrimitives") ? mySetting.getAttribute("SensitivityPrimitives").split(",") : undefined
				}),
				new Ext.form.NumberField({
					fieldLabel: getText('运行次数'),
					name: 'nRuns',
					id: 'nRuns',
					allowBlank: false,
					minValue: 10,
					allowDecimals: false,
					value: mySetting.getAttribute("SensitivityRuns")
				}), {
					fieldLabel: getText('置信区域') + ' (%)',
					name: 'confRegion',
					id: 'confRegion',
					allowBlank: false,
					value: mySetting.getAttribute("SensitivityBounds")
				}, {
					xtype: "checkboxfield",
					fieldLabel: getText('每次运行环节（较慢）'),
					inputValue: 'true',
					name: 'plotEach',
					id: 'plotEach',
					checked: isTrue(mySetting.getAttribute("SensitivityShowRuns"))
				}, {
					xtype: 'displayfield',
					fieldLabel: '',
					value: "<div style='padding-top:1.2em;'> <div class = 'fa fa-question-circle' style='float:left; margin-right: 7px; font-size: xx-large; display: block; color: grey'></div> 灵敏度分析使用随机输入多次运行您的模拟，以查看结果如何变化（在某种意义上，结果对输入的“敏感”）。<br/> <br/>为了使用灵敏度分析，您需要在你的模型中有随机性的来源。例如，您可以使用<i> Rand()</i>函数或其他Insight Maker随机生成函数来选择随机变量或随机起始值。请注意，如果您想要一个随机变量值，您可以使用<i> Fix(Rand())</ i>在模拟开始时将变量设置为随机值并保持相同其余模拟的值。"
				}
			]
		});

		var win = new Ext.Window({
			title: getText('敏感性分析'),
			layout: 'fit',
			closeAction: 'destroy',
			border: false,
			tools:[
				{
				    type: 'help',
				    tooltip: getText('帮助'),
				    callback: function(panel, tool, event) {
				        showURL("/sensitivitytesting");
				    }
				}
			],
			modal: true,
			resizable: false,
			maximizable: false,
			shadow: true,
			buttonAlign: 'right',
			layoutConfig: {
				columns: 1
			},
			width: Math.min(Ext.getBody().getViewSize().width, 480),
			height: Math.min(Ext.getBody().getViewSize().height, 525),
			items: [p],
			buttons: [{
				scale: "large",
				glyph: 0xf05c,
				text: getText('取消'),
				handler: function() {
					win.close();
				}
			}, {
				scale: "large",
				glyph: 0xf00c,
				text: getText('运行分析'),
				handler: function() {
					var nRuns = Ext.getCmp("nRuns").getValue();
					var items = Ext.getCmp("monPrimitives").getValue();
					var bounds = Ext.Array.map(Ext.getCmp("confRegion").getValue().split(","), parseFloat);
					var showRuns = isTrue(Ext.getCmp("plotEach").getValue());

					if (items.length < 1) {
						mxUtils.alert(getText("您必须选择一个或多个要监视的图元。"))
						return
					}
					if (bounds.length < 1) {
						mxUtils.alert(getText("您必须将一个或多个边界指定为百分比。"))
						return
					}
					for (var b = 0; b < bounds.length; b++) {
						if (bounds[b] <= 0 || bounds[b] > 100) {
							mxUtils.alert(getText("界限是百分比值，必须介于0到100之间。"))
							return
						}
					}
					var mySetting = getSetting();

					graph.getModel().beginUpdate();

					var edit = new mxCellAttributeChange(
						mySetting, "SensitivityPrimitives",
						items.join(","));
					graph.getModel().execute(edit);

					edit = new mxCellAttributeChange(
						mySetting, "SensitivityRuns",
						nRuns);
					graph.getModel().execute(edit);

					edit = new mxCellAttributeChange(
						mySetting, "SensitivityBounds",
						bounds.join(", "));
					graph.getModel().execute(edit);

					edit = new mxCellAttributeChange(
						mySetting, "SensitivityShowRuns",
						showRuns);
					graph.getModel().execute(edit);

					graph.getModel().endUpdate();

					sensitivityProgress = Ext.MessageBox.show({
						msg: getText("运行灵敏度分析......"),
						icon: 'run-icon',
						width: 300,
						closable: false,
						modal: true,
						progress: true,
						progressText: ' '
					});

					sensitivityController = {
						nRuns: nRuns,
						items: items,
						bounds: bounds,
						showRuns: showRuns,
						results: []
					};

					setTimeout("runSensitivity()", 15);

					win.close();
				}
			}]

		});

		win.show();

	}

	function runSensitivity() {
		var res = runModel({
			silent: true
		});
		if (res.error != "none") {
			mxUtils.alert(res.error);
			if (res.errorPrimitive) {
				highlight(res.errorPrimitive);
			}
			if (sensitivityProgress) {
				sensitivityProgress.close();
			}
			return;
		}
		sensitivityController.results.push(res);
		sensitivityProgress.updateProgress(sensitivityController.results.length / sensitivityController.nRuns, " ");
		if (sensitivityController.results.length < sensitivityController.nRuns) {
			if (sensitivityController.noYield) {
				runSensitivity()
			} else {
				setTimeout("runSensitivity()", 15);
			}
			return;
		}

		var nRuns = sensitivityController.nRuns;
		var results = sensitivityController.results;
		var bounds = sensitivityController.bounds;
		var items = sensitivityController.items;


		var data = [];
		for (var p = 0; p < items.length; p++) {
			var cell = findID(items[p]);
			var ress = [];
			for (var r = 0; r < nRuns; r++) {
				ress.push(results[r].value(cell))
			}

			var aggregates = {
				median: []
			};
			
			for (var b = 0; b < bounds.length; b++) {
				aggregates[bounds[b] + "_lower"] = [];
				aggregates[bounds[b] + "_upper"] = [];
			}


			for (var i = 0; i < ress[0].length; i++) {
				var temp = [];
				for (var r = 0; r < ress.length; r++) {
					temp.push(ress[r][i]);
				}

				temp = temp.sort(function(a, b) {
					return a - b
				});

				aggregates.median.push(getQuantile(temp, 0.5))
				for (var b = 0; b < bounds.length; b++) {
					aggregates[bounds[b] + "_lower"].push(getQuantile(temp, 0.50 - (bounds[b] / 100) / 2));
					aggregates[bounds[b] + "_upper"].push(getQuantile(temp, 0.50 + (bounds[b] / 100) / 2));
				}

			}


			var allVals = [];
			for (var b = 0; b < bounds.length; b++) {
				allVals = allVals.concat(aggregates[bounds[b] + "_lower"]);
				allVals = allVals.concat(aggregates[bounds[b] + "_upper"]);
			}


			var dat = {
				name: cell.getAttribute("name") + " 分位数表",
				type: "table"
			};
			
			var headers = [];
			var series = [];
			headers.push(getText("时间"));
			series.push(results[0].Time);
			var chartSeries = [];

			var sensitivityColors = ["#ECC928", "#425FCA", "#8E630F", "#007012", "#CC2C33", "#773A86"];
			var topbs = [],
				botbs = [],
				topbs_neg = [],
				botbs_neg = [];
				
			for (var b = bounds.length - 1; b >= 0; b--) {
				headers.push(bounds[b] + "% " + getText("更低"));
				series.push(aggregates[bounds[b] + "_lower"]);
				headers.push(bounds[b] + "% " + getText("更高"));
				series.push(aggregates[bounds[b] + "_upper"]);

				if (b > 0) {
					botbs.push({
						name: "Lower " + bounds[b] + "%",
						data: aggregates[bounds[b - 1] + "_lower"].map(function(x){
							return Math.max(x, 0);
						}),
						type: "line",
						color: sensitivityColors[b % sensitivityColors.length],
						fill: true,
						hideMarkers: true,
						hideLegend: true
					});
					
				}
				
				botbs_neg.push({
					name: "Lower " + bounds[b] + "%",
					data: aggregates[bounds[b] + "_lower"].map(function(x){
						return Math.min(x, 0);
					}),
					type: "line",
					color: sensitivityColors[b % sensitivityColors.length],
					fill: true,
					hideMarkers: true,
					hideLegend: true
				});
				
				topbs.push({
					name: bounds[b] + "% " + getText("区域"),
					data: aggregates[bounds[b] + "_upper"].map(function(x){
							return Math.max(x, 0);
						}),
					type: "line",
					color: sensitivityColors[b % sensitivityColors.length],
					fill: true,
					hideMarkers: true
				});
				
				if(b >0){
					topbs_neg.push({
						name: bounds[b] + "% " + getText("区域"),
						data: aggregates[bounds[b - 1] + "_upper"].map(function(x){
								return Math.min(x, 0);
							}),
						type: "line",
						color: sensitivityColors[b % sensitivityColors.length],
						fill: true,
						hideMarkers: true,
						hideLegend: true
					});
				}
			}




			for (var b = 0; b < topbs.length; b++) {
				chartSeries.push(topbs[b]);
			}

			for (var b = botbs.length - 1; b >= 0; b--) {
				chartSeries.push(botbs[b]);
			}
			
			for (var b = 0; b < botbs_neg.length; b++) {
				chartSeries.push(botbs_neg[b]);
			}
			
			for (var b = topbs_neg.length-1; b >= 0; b--) {
				chartSeries.push(topbs_neg[b]);
			}

			var z_l = aggregates[bounds[bounds.length - 1] + "_lower"];
			var z_u = aggregates[bounds[bounds.length - 1] + "_upper"];
			var o = [];
			for(var i = 0; i < z_l.length; i++){
				if(z_u[i]>0 && z_l[i]<0){
					o.push(0);
				}else{
					if(Math.abs(z_l[i]) < Math.abs(z_u[i])){
						o.push(z_l[i]);
					}else{
						o.push(z_u[i]);
					}
				}
			}
			chartSeries.push({
				name: "White Cover",
				data: o,
				type: "line",
				color: "white",
				fill: true,
				hideMarkers: true,
				hideLegend: true
			});


			headers.push(getText("中位数"));
			series.push(aggregates.median);
			chartSeries.push({
				name: getText("中位数"),
				data: aggregates.median,
				type: "line",
				color: "black"
			});

			//console.log(chartSeries);



			dat.header = headers;
			dat.data = series;


			data.push({
				legend: "right",
				legendStatic: true,
				data: chartSeries,
				name: cell.getAttribute("name") + " " + getText("分位数图"),
				type: "chart",
				horizontalGrid: false,
				verticalGrid: false,
				xType: "Numeric",
				xData: results[0].Time,
				xLabel: "Time",
				yLabel: cell.getAttribute("name"),
				yMin: Math.min.apply(null, allVals),
				yMax: Math.max.apply(null, allVals)
			});
			data.push(dat);


			if (sensitivityController.showRuns) {
				dat = {
					name: cell.getAttribute("name") + " " + getText("运行表格"),
					type: "table"
				};
				var headers = [];
				var series = [];
				var chartSeries = [];
				for (var i = 0; i < nRuns; i++) {
					headers.push("Run " + (i + 1));
					series.push(ress[i]);
					chartSeries.push({
						title: "",
						data: ress[i],
						type: "line",
						hideMarkers: true
					});
				}
				dat.header = headers;
				dat.data = series;

				data.push({
					legend: "none",
					data: chartSeries,
					name: cell.getAttribute("name") + " " + getText("运行图表"),
					type: "chart",
					horizontalGrid: true,
					verticalGrid: true,
					xType: "Numeric",
					xData: results[0].Time,
					xLabel: "Time",
					yLabel: cell.getAttribute("name")
				});

				data.push(dat);
			}
		}

		sensitivityProgress.close();

		showData(getText("灵敏度分析结果"), data);


	}

	function getQuantile(arr, quantile) {
		var index = (arr.length) * quantile;
		if (Math.ceil(index) == arr.length) {
			return arr[arr.length - 1];
		}
		if (index == Math.ceil(index)) {
			return arr[index];
		} else {
			return (arr[Math.floor(index)] + arr[Math.ceil(index)]) / 2
		}
	}
