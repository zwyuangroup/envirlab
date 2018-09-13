"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

function textEquations(){
	
	var html = "<table style='width:100%'>";
	
	var odd = true;
	
	function boolYesNo(bool){
		return isTrue(bool)?getText("是"):getText("否")
	}
	
	function list(items){
		var inner = "";
		for(var i = 0; i < items.length; i++){
			inner = inner+"<li><b>"+items[i][0]+":</b> "+(((/<br>/).test(items[i][1]))?"<br/>":"")+items[i][1]+"</li>";
		}
		return "<ul style='list-style-type: none;'>"+inner+"</ul>"
	}
	
	function add(title, contents){
		html = html +"<tr class='textRow"+(odd?"Odd":"Even")+"'><td class='textName'>"+title+"</td><td>"+contents+"</td></tr>";
		odd = ! odd;
	}
	function divide(title){
		html = html + "<tr class='textDivider'><td colspan=2>"+title+"</td></tr>";
		odd = true;
	}
	function name(item){
		if(item && item!=null){
			return clean(item.getAttribute("name"));
		}
		return "<i>"+getText("无")+"</i>";
	}
	function addNote(items, item){
		if(item.getAttribute("Note")){
			items.push([getText("注释"), clean(item.getAttribute("Note"))])
		}
		return items;
	}
	function findAndSort(label){
		var items = primitives(label);
		items.sort(function(a,b){
			if(name(a).toUpperCase()>name(b).toUpperCase()){
				return 1;
			}else{
				return -1;
			}
		});
		return items;
	}
	var mySetting = getSetting();
	add("模拟设置", list([[getText("开始时间"), clean(mySetting.getAttribute("TimeStart"))], [getText("时间长度"), clean(mySetting.getAttribute("TimeLength"))], [getText("时间步长"), clean(mySetting.getAttribute("TimeStep"))], [getText("时间单位"), clean(mySetting.getAttribute("TimeUnits"))], [getText("算法"), clean(mySetting.getAttribute("SolutionAlgorithm"))]]))
	
	items = findAndSort("Variable");
	if(items.length>0){
		divide(getText("模型变量"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("值"), equationRenderer(getValue(items[i]), true)], [getText("单位"), clean(items[i].getAttribute("Units"))] ], items[i]) ))
		}
	}
	var items = findAndSort("Stock");
	if(items.length>0){
		divide(getText("模型库"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("初始值"), equationRenderer(getValue(items[i]), true)], [getText("非负"), boolYesNo(items[i].getAttribute("NonNegative"))], [getText("单位"), clean(items[i].getAttribute("Units"))] ], items[i]) ))
		}
	}
	items = findAndSort("Flow");
	if(items.length>0){
		divide(getText("模型流"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("速率"), equationRenderer(getValue(items[i]), true)], [getText("Alpha"), clean(name(items[i].source))], [getText("Omega"), clean(name(items[i].target))], [getText("正数"), boolYesNo(items[i].getAttribute("OnlyPositive"))], [getText("单位"), clean(items[i].getAttribute("Units"))] ], items[i]) ))
		}
	}
	items = findAndSort("Converter");
	if(items.length>0){
		divide(getText("模型转换器"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("数据"), clean(getValue(items[i]).replace(/\;/g,"; ")) ] , [getText("源"), clean(items[i].getAttribute("Source")=="Time"?"Time":name(findID(items[i].getAttribute("Source")))) ], [getText("插值"), getText(clean(items[i].getAttribute("Interpolation")))], [getText("单位"), clean(items[i].getAttribute("Units"))] ], items[i]) ))
		}
	}
	
	items = findAndSort("State");
	if(items.length>0){
		divide(getText("模型状态"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("初始活跃"), equationRenderer(getValue(items[i]), true)] ], items[i]) ))
		}
	}
	
	items = findAndSort("Transition");
	if(items.length>0){
		divide(getText("模型转换"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("触发"), clean(items[i].getAttribute("Trigger"))], [getText("值"), equationRenderer(getValue(items[i]), true)] ], items[i]) ))
		}
	}
	
	items = findAndSort("Action");
	if(items.length>0){
		divide(getText("模型动作"));
		for(var i=0; i<items.length; i++){
			add(name(items[i]), list( addNote([ [getText("触发"), clean(items[i].getAttribute("Trigger"))], [getText("触发值"), equationRenderer(items[i].getAttribute("Value"), true)], [getText("动作"), equationRenderer(getValue(items[i]), true)] ], items[i]) ))
		}
	}
	
	
	html += "</table>";
	
	var tab = Ext.create("Ext.tab.Panel", {
			xtype: "tabpanel",
			layout: "fit",
			activeTab: 0,
			plain: true,
			flex: 1,
			items: [
			{title: getText("公式"), xtype: "box", html: html, style: "background-color: white", autoScroll: true},
			{
				padding: 4,
				title: getText("规范"),
				xtype: "container",
				layout: {
					type: 'vbox',
					align: 'middle'
				},
				items: [{
					xtype: 'box',
					margin: 6,
					html: getText('完整的Insight规范，包括方程式和样式。 您可以将其作为文件下载，然后将其重新导入Insight Maker。'),
					width: "100%"
				}, {
					flex:1,
					margin: 6,
					readOnly:true,
					xtype: 'textareafield',
					hideLabel: true,
					value: getGraphXml(graph).replace(/mxGraphModel/g,"InsightMakerModel"),
					width:"100%"
				},
				{
					text: getText("下载"),
					xtype: "button",
					margin: 3,
					handler: function(){
						new mxXmlRequest(builder_path + "/download.php", $.param({name: "Model", format: "InsightMaker", "data": getGraphXml(graph).replace(/mxGraphModel/g,"InsightMakerModel")})).simulate(document, "_blank");
					}
				}
				]
			}]
		});
								
    var win = new Ext.Window({
        title: getText('完整的模型方程列表'),
        layout: 'fit',
        closeAction: 'destroy',
        border: false,
        modal: true,
		maximizable: true,
        resizable: true,
        shadow: true,
        buttonAlign: 'right',
        layoutConfig: {
            columns: 1
        },
        width:  Math.min(Ext.getBody().getViewSize().width, 600),
        height:  Math.min(Ext.getBody().getViewSize().height, 500),
        items: [{title: getText("公式"), xtype: "box", html: html, style: "background-color: white", autoScroll: true}],
        buttons: [
        "->",
        {
            scale: "large",
            glyph: 0xf00c,
            text: getText('完成'),
            handler: function()
            {	
				win.close();
            }
        }]

    });
	
	win.show();
	
}

