"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

function importData(targetStore){
		
	var p = new Ext.FormPanel({
		fieldDefaults: {
		    labelWidth: 130,
			width:355
		},
		autoScroll: true,
		margin: '3 5 5 20',
		frame: false,
		defaultType: 'textfield',

			items: [
			{
	        	xtype: 'box',
				margin: 10,
	        	html: '<center>'+getText('将CSV文件或制表符分隔的文件中的内容复制并粘贴到下面的数据字段中。')+'</center>'
	    	},
			{
				xtype: 'textareafield',
			    fieldLabel: 'Data',
			    name: 'impData',
			    id: 'impData',
			    allowBlank: false,
				selectOnFocus: true,
				value: getText("示例输入，示例输出")+"\n24, 62\n641, 12\n234, 56\n123, 19",height:195
			}, 
            {
				xtype: "checkboxfield",
                fieldLabel: getText('含第一行'),
                inputValue: '1',
                name: 'impIncludeHeader',
                id: 'impIncludeHeader'
            },
			new Ext.form.NumberField({
                fieldLabel: getText('输入列索引'),
                name: 'impInputIndex',
                id: 'impInputIndex',
                allowBlank: false,
                minValue: 1,
                allowDecimals:false,
				value: 1
            }),
			new Ext.form.NumberField({
                fieldLabel: getText('输出列索引'),
                name: 'impOutputIndex',
                id: 'impOutputIndex',
                allowBlank: false,
                minValue: 1,
                allowDecimals:false,
				value: 2
            })
		]
	});
								
    var win = new Ext.Window({
        title: getText('输入转换器数据'),
        layout: 'fit',
        closeAction: 'destroy',
        border: false,
        modal: true,
        resizable: false,
        shadow: true,
        buttonAlign: 'right',
        layoutConfig: {
            columns: 1
        },
        width:  Math.min(Ext.getBody().getViewSize().width, 400),
        height:  Math.min(Ext.getBody().getViewSize().height, 510),
        items: [p],
        buttons: [
        {
            scale: "large",
            glyph: 0xf05c,
            text: getText('取消'),
            handler: function()
            {
                win.close();
            }
        },
        {
            scale: "large",
            glyph: 0xf00c,
            text: getText('导入'),
            handler: function()
            {	
				try{
					var data = parseCSV(Ext.getCmp("impData").getValue());
				}catch(err){
					mxUtils.alert(getText("数据文件出错。它应该是一个有效的CSV或制表符分隔的文本文件。"));
					return;
				}
				if(data.length<=0){
					mxUtils.alert(getText("无法导入，因为没有输入数据。"));
					return;
				}
				
				var inIndex = Ext.getCmp("impInputIndex").getValue()-1;
				var outIndex = Ext.getCmp("impOutputIndex").getValue()-1;
				
				if(!(inIndex<data[0].length && outIndex<data[0].length)){
					mxUtils.alert(getText("数据文件的列索引无效。最大列数为%s。", data[0].length))
					return;
				}
				
				targetStore.removeAll();
				var items = [];
				for(var i=(Ext.getCmp("impIncludeHeader").getValue()==0?1:0); i<data.length; i++){
					
					try{
						var x = flexibleParseFloat(data[i][inIndex]);
						var y = flexibleParseFloat(data[i][outIndex]);
						if(isNaN(x) || isNaN(y)){
							mxUtils.alert(getText("(%s, %s)不是一对数字。导入期间跳过行。", data[i][inIndex], data[i][outIndex]));
						}else{
							items.push({xVal: x, yVal: y});
						}
					}catch(err){
						mxUtils.alert(getText("在导入时跳过格式错误的行(%s, %s)。", data[i][inIndex], data[i][outIndex]));
					}
				}
				targetStore.add(items);
				
				win.close();
            }
        }]

    });
	
	win.show();
	
}


function flexibleParseFloat(floatStr){
	return parseFloat(floatStr.replace(/\,/g,""));
}


function parseCSV(csvString) {
    var fieldEndMarker  = /([,\015\012\t;] *)/g; /* Comma is assumed as field separator */
    var qFieldEndMarker = /("")*"([,\015\012\t;] *)/g; /* Double quotes are assumed as the quote character */
    var startIndex = 0;
    var records = [], currentRecord = [];
    do {
        // If the to-be-matched substring starts with a double-quote, use the qFieldMarker regex, otherwise use fieldMarker.
        var endMarkerRE = (csvString.charAt (startIndex) == '"')  ? qFieldEndMarker : fieldEndMarker;
        endMarkerRE.lastIndex = startIndex;
        var matchArray = endMarkerRE.exec (csvString);
        if (!matchArray || !matchArray.length) {
            break;
        }
        var endIndex = endMarkerRE.lastIndex - matchArray[matchArray.length-1].length;
        var match = csvString.substring (startIndex, endIndex);
        if (match.charAt(0) == '"') { // The matching field starts with a quoting character, so remove the quotes
            match = match.substring (1, match.length-1).replace (/""/g, '"');
        }
        currentRecord.push (match);
        var marker = matchArray[0];
        if (marker.indexOf (',') < 0 && marker.indexOf ("\t") < 0) { // Field ends with newline, not comma
            records.push (currentRecord);
            currentRecord = [];
        }
        startIndex = endMarkerRE.lastIndex;
    } while (true);
    if (startIndex < csvString.length) { // Maybe something left over?
        var remaining = csvString.substring (startIndex).trim();
        if (remaining) currentRecord.push (remaining);
    }
    if (currentRecord.length > 0) { // Account for the last record
        records.push (currentRecord);
    }
    return records;
};
