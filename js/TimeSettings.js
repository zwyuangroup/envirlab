"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

var timeSettingsFn = function(){
    var setting = getSetting();
	
	showTimeSettings({
		algorithm: setting.getAttribute("SolutionAlgorithm"),
		timeStep: setting.getAttribute("TimeStep"),
		timeStart: setting.getAttribute("TimeStart"),
		timeUnits: setting.getAttribute("TimeUnits"),
		timeLength: setting.getAttribute("TimeLength"),
		timePause: setting.getAttribute("TimePause")
	});
}

function showTimeSettings(config)
{
    var configWin = new Ext.Window({
        layout: 'fit',
		closeAction: 'destroy',
        modal: true,
		/*animateTarget: ribbonPanelItems().down('#config').getEl(),*/
		tools:[
			{
			    type: 'help',
			    tooltip: getText('帮助'),
			    callback: function(panel, tool, event) {
			        showURL("/simulating");
			    }
			}
		],
        title: getText("模拟时间设置"),
        width:  Math.min(Ext.getBody().getViewSize().width, 370),
        height:  Math.min(Ext.getBody().getViewSize().height, ((! config.cell)?550:280)),
        resizable: false,
        items: [
		new Ext.FormPanel({
            fieldDefaults: {
                labelWidth: 150
            },
			autoScroll: true,
            frame: true,
            bodyStyle: 'padding: 12px 0px 0px 15px',
            width: 450,
            defaults: {
                width: 330
            },
			id: "timeSettingsForm",
            defaultType: 'textfield',

            items: [
			new Ext.form.field.Checkbox({
				hidden: ! config.cell,
                fieldLabel: getText('自定义时间设置'),
                id: 'sEnabled',
				checked: config.enabled,
				listeners: {
					change: function(combo, newValue, oldValue){
						Ext.getCmp("sSolutionAlgo").setDisabled(! newValue);
						Ext.getCmp("stimestep").setDisabled(!newValue);
					}
				}
            }),
			new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('开始模拟'),
                id: 'stimestart',
                allowBlank: false,
                minValue: 0,
                decimalPrecision: 12,
				value: config.timeStart
            }),
            new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('模拟时长'),
                id: 'stimelength',
                allowBlank: false,
                minValue: 0,
                decimalPrecision: 12,
				value: config.timeLength
            }),
            {
				hidden: config.cell,
                xtype: 'radiogroup',
                id: "tunits",
                fieldLabel: getText('时间单位'),
                columns: 1,
                items: [
                {
                    boxLabel: getText('秒'),
                    name: 'tunits',
                    inputValue: "Seconds",
					checked: config.timeUnits == "Seconds"
                },
                {
                    boxLabel: getText('分钟'),
                    name: 'tunits',
                    inputValue: "Minutes",
					checked: config.timeUnits == "Minutes"
                },
                {
                    boxLabel: getText('小时'),
                    name: 'tunits',
                    inputValue: "Hours",
					checked: config.timeUnits == "Hours"
                },
                {
                    boxLabel: getText('天'),
                    name: 'tunits',
                    inputValue: "Days",
					checked: config.timeUnits == "Days"
                },
                {
                    boxLabel: getText('周'),
                    name: 'tunits',
                    inputValue: "Weeks",
					checked: config.timeUnits == "Weeks"
                },
                {
                    boxLabel: getText('月'),
                    name: 'tunits',
                    inputValue: "Months",
					checked: config.timeUnits == "Months"
                },
                {
                    boxLabel: getText('年'),
                    name: 'tunits',
                    inputValue: "Years",
					checked: config.timeUnits == "Years"
                }
                ]
            },
            new Ext.form.NumberField({
				hidden: config.cell,
                fieldLabel: getText('暂停间隔'),
                id: 'stimepause',
                allowBlank: true,
                minValue: 0,
				emptyText: 'No Pause',
                decimalPrecision: 12,
				value: config.timePause
            }),
            new Ext.form.ComboBox({
                fieldLabel: getText("分析算法"),
                typeAhead: true,
                triggerAction: 'all',
                queryMode: 'local',
                selectOnFocus: true,
                forceSelection: true,
                store:  [ ['RK1', getText('快速 (Euler)')], ['RK4',getText('准确 (RK4)')] ],
                id: 'sSolutionAlgo',
                editable: true,
				value: config.algorithm,
				disabled: (config.cell && (!config.enabled))
            }),
            new Ext.form.NumberField({
                fieldLabel: getText('模拟时间步长'),
                id: 'stimestep',
                allowBlank: false,
                minValue: 0.000000000001,
                step: .1,
                decimalPrecision: 12,
				value: config.timeStep,
				disabled: (config.cell && (!config.enabled))
            })
            ],

            buttons: [{
				xtype:"button",
                scale: "large",
                glyph: 0xf05c,
                text: getText('取消'),
                handler: function() {
                    configWin.close();
                }
            },
            {
				xtype:"button",
                glyph: 0xf00c,
                scale: "large",
                text: getText('应用'),
                handler: function() {
					linkedResults = undefined;
					Ext.WindowMgr.each(
					      function(other){
  							var t = other.down("#pinTool");
  							if(t){
  								t.hide();
  							}
					      }
					  );
					  
				
                    graph.getModel().beginUpdate();
					if(config.cell){
						
	                    edit = new mxCellAttributeChange(
	                   	 	config.cell,
							"Solver",
							JSON.stringify({
								enabled: Ext.getCmp('sEnabled').getValue(),
								timeStep: Ext.getCmp('stimestep').getValue().toString(),
								algorithm: Ext.getCmp('sSolutionAlgo').getValue()
							})
						);
	                    graph.getModel().execute(edit);
						
					}else{
					    var setting = getSetting();
					

	                    var edit = new mxCellAttributeChange(
	                    setting, "SolutionAlgorithm",
	                    Ext.getCmp('sSolutionAlgo').getValue());
	                    graph.getModel().execute(edit);

	                    var edit = new mxCellAttributeChange(
	                    setting, "TimeLength",
	                    Ext.getCmp('stimelength').getValue().toString());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeStart",
	                    Ext.getCmp('stimestart').getValue().toString());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeStep",
	                    Ext.getCmp('stimestep').getValue().toString());
	                    graph.getModel().execute(edit);
						
	                    edit = new mxCellAttributeChange(
	                    setting, "TimePause",
	                    Ext.getCmp('stimepause').getValue());
	                    graph.getModel().execute(edit);

	                    edit = new mxCellAttributeChange(
	                    setting, "TimeUnits",
	                    Ext.getCmp('timeSettingsForm').getValues()['tunits']);
	                    graph.getModel().execute(edit);
					}

                    graph.getModel().endUpdate();
					
                    configWin.close();
                }
            }
            ]
        })]

    });

   
    configWin.show();
	
	return configWin;
};