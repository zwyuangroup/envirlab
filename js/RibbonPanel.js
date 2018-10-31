"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

var scratchPadStatus = "";

function ribbonPanelItems() {
    var z = ribbonPanel.getDockedItems()[0];
    return z;
}

var reverseDirection = function() {
    graph.getModel().beginUpdate();

    var myCells = graph.getSelectionCells();
    if (myCells != null) {
        for (var i = 0; i < myCells.length; i++) {
            if (myCells[i].isEdge()) {
                var geo = myCells[i].getGeometry();

                var tmp = myCells[i].source;
                var edit = new mxTerminalChange(graph.getModel(), myCells[i], myCells[i].target, true);
                graph.getModel().execute(edit);
                edit = new mxTerminalChange(graph.getModel(), myCells[i], tmp, false);
                graph.getModel().execute(edit);

                tmp = geo.sourcePoint;
                geo.sourcePoint = geo.targetPoint;
                geo.targetPoint = tmp;
                if (geo.points != null) {
                    geo.points.reverse();
                }
                edit = new mxGeometryChange(graph.getModel(), myCells[i], geo);
                graph.getModel().execute(edit);


                if (myCells[i].value.nodeName == "Link") {
                    linkBroken(myCells[i]);
                }
            }
        }
    }

    graph.getModel().endUpdate();


};

var showMacros = function(annotations) {
    var equationEditor = new Ext.ux.AceEditor({
        id: 'macroTxt',
        name: 'macroTxt',
        readOnly: !viewConfig.allowEdits,
        flex: 1,
        value: getSetting().getAttribute("Macros"),
        annotations: annotations
    });

    var macrosWin = new Ext.Window({
        layout: {
            type: 'vbox',
            align: 'stretch'
        },
        tools: [{
            type: 'help',
            tooltip: getText('帮助'),
            callback: function(panel, tool, event) {
                showURL("/macros");
            }
        }],
        modal: true,
        stateful: is_editor && (!is_embed),
        stateId: "macros_window",
        width: Math.min(Ext.getBody().getViewSize().width, 540),
        height: Math.min(Ext.getBody().getViewSize().height, 450),
        title: getText("模型宏"),
        resizable: true,
        maximizable: true,
        closeAction: 'destroy',
        plain: true,
        items: [
            equationEditor,

            {
                xtype: "box",
                padding: 8,
                style: {
                    "border-top": "solid 1px lightgrey"
                },
                html: "<b>" + getText('示例宏') + "</b> (<a href='//insightmaker.com/macros' target='_blank'>更多</a>)<br>g <- {9.80665 meters/seconds^2} # 自定义变量<br/>TemperatureFtoC(f) <- (f+32)*5/9 # 自定义函数<br/>"
            }
        ],

        buttons: [{
                scale: "large",
                glyph: 0xf05c,
                text: getText('取消'),
                handler: function() {
                    macrosWin.close();
                }
            }, {
                glyph: 0xf00c,
                scale: "large",
                text: getText('应用'),
                handler: function() {

                    graph.getModel().beginUpdate();

                    var edit = new mxCellAttributeChange(
                        getSetting(), "Macros", Ext.getCmp('macroTxt').getValue());
                    graph.getModel().execute(edit);

                    graph.getModel().endUpdate();

                    macrosWin.close();

                }
            }

        ]
    });

    macrosWin.show();

    equationEditor.focus(true, true);
    equationEditor.editor.focus();
    setTimeout(function() {
        equationEditor.editor.focus();
    }, 200);
};

var scratchpadFn = function() {
    if (scratchPadStatus == "shown") {
        Ext.get("mainGraph").setDisplayed("none");
        scratchPadStatus = "hidden";
    } else if (scratchPadStatus == "hidden") {
        Ext.get("mainGraph").setDisplayed("block");
        scratchPadStatus = "shown";
    } else {
        Ext.get("mainGraph").setDisplayed("block");
        Scratchpad($('#mainGraph'));
        scratchPadStatus = "shown";
    }
    ribbonPanel.down("#scratchpad").setChecked(scratchPadStatus == "shown");
};

var editActions = [];

editActions.copy = {
    hidden: is_ebook,
    itemId: 'copy',
    text: getText('复制'),
    glyph: 0xf0c5,
    tooltip: getText('复制') + ' ' + cmd("C"),
    handler: function() {
        mxClipboard.copy(graph);
        clipboardListener();
    },
    scope: this
};

editActions.cut = {
    hidden: is_ebook,
    itemId: 'cut',
    text: getText('剪切'),
    glyph: 0xf0c4,
    tooltip: getText('剪切') + ' ' + cmd("X"),
    handler: function() {
        mxClipboard.cut(graph);

        clipboardListener();

    },
    scope: this
};

editActions.paste = {
    hidden: is_ebook,
    text: getText('粘贴'),
    glyph: 0xf0ea,
    tooltip: getText('粘贴') + ' ' + cmd("V"),
    itemId: 'paste',
    handler: function() {
        mxClipboard.paste(graph);

        clipboardListener();

    },
    scope: this
};

editActions["delete"] = {
    itemId: 'delete',
    text: getText('删除'),
    glyph: 0xf00d,
    tooltip: getText('删除图元'),
    handler: function() {
        graph.removeCells(graph.getSelectionCells(), false);
    },
    scope: this
};

var sizeCombo;
var fontCombo;
var RibbonPanel = function(graph, mainPanel, configPanel) {
    Ext.Ajax.timeout = 60000;

    var imageMenu = {
        xtype: "menu",
        iconsCls: "picture-icon",
        items: ["Growth", "Balance", 'Positive Feedback Clockwise', 'Positive Feedback Counterclockwise', 'Negative Feedback Clockwise', 'Negative Feedback Counterclockwise', 'Unknown Feedback Clockwise', 'Unknown Feedback Counterclockwise', 'Plus', 'Minus', 'Forwards', "Reload", "Play", "Pause", "Stop", "Info", 'Question', 'Warning', 'Checkmark', 'Prohibited', 'Idea', "Home", 'Book', 'Clock', 'Computer', 'Dice', 'Cards', 'Gear', 'Hammer', 'Smiley', 'Heart', 'Key', 'Lock', 'Loudspeaker', 'Footprints', 'Mail', 'Network', 'Notes', 'Paint', 'Pushpin', 'Paperclip', 'People', 'Person', 'Wallet', 'Money', 'Flag', 'Star', 'Rocket', 'Alarm', 'Beaker', 'Ball', 'Hat', 'List', 'Bolt', 'Cookie', 'Plugin', 'Monitor', 'Telescope', 'Chalkboard', 'Open', 'Trash'].map(function(x) {
            return {
                text: '<center><div class="x-combo-list-item" style=\"white-space:normal\";><img src="' + builder_path + '/images/SD/' + x + '.png" width=48 height=48/></div></center>',
                handler: function() {
                    setImage(getSelected(), x);
                }
            }
        })

    }


    var colors = ["000000", "993300", "333300", "003300", "003366", "000080", "333399", "333333", "800000", "FF6600", "808000", "008000", "008080", "0000FF", "666699", "808080", "FF0000", "FF9900", "99CC00", "339966", "33CCCC", "3366FF", "800080", "969696", "FF00FF", "FFCC00", "FFFF00", "00FF00", "00FFFF", "6482B9", "993366", "C0C0C0", "FF99CC", "FDCDAC", "FFFF99", "B3E2CD", "CCFFFF", "A6D3F8", "CC99FF", "FFFFFF"];
    var fillColorMenu = [{
            xtype: 'colorpicker',
            colors: colors,
            allowReselect: true,
            handler: function(cm, color) {
                if (typeof(color) == "string") {

                    graph.getModel().beginUpdate();
                    graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#' + color, excludeType(graph.getSelectionCells(), "Ghost"));
                    var p = graph.getSelectionCells(),
                        cells = [];
                    for (var i = 0; i < p.length; i++) {
                        if (p[i].value.nodeName == "Link" || p[i].value.nodeName == "Flow") {
                            cells.push(p[i]);
                        }
                    }
                    graph.setCellStyles(mxConstants.STYLE_LABEL_BACKGROUNDCOLOR, '#' + color, cells, excludeType(graph.getSelectionCells(), "Ghost"));

                    if (graph.isSelectionEmpty()) {
                        graph.getModel().execute(new mxCellAttributeChange(getSetting(), "BackgroundColor", '#' + color));
                        loadBackgroundColor();
                    }

                    graph.getModel().endUpdate();

                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur()
                    }
                }
            }
        },
        "-",
        {
            text: getText("自定义颜色") + "...",
            handler: customColor(function(color) {
                graph.getModel().beginUpdate();
                graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, color, excludeType(graph.getSelectionCells(), "Ghost"));
                var p = graph.getSelectionCells(),
                    cells = [];
                for (var i = 0; i < p.length; i++) {
                    if (p[i].value.nodeName == "Link" || p[i].value.nodeName == "Flow") {
                        cells.push(p[i]);
                    }
                }
                graph.setCellStyles(mxConstants.STYLE_LABEL_BACKGROUNDCOLOR, color, cells, excludeType(graph.getSelectionCells(), "Ghost"));

                if (graph.isSelectionEmpty()) {
                    graph.getModel().execute(new mxCellAttributeChange(getSetting(), "BackgroundColor", color));
                    loadBackgroundColor();
                }

                graph.getModel().endUpdate();
            })
        },
        {
            text: getText('没有填充颜色'),
            handler: function() {

                graph.getModel().beginUpdate();
                graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, mxConstants.NONE, excludeType(graph.getSelectionCells(), "Ghost"));
                var p = graph.getSelectionCells(),
                    cells = [];
                for (var i = 0; i < p.length; i++) {
                    if (p[i].value.nodeName == "Link" || p[i].value.nodeName == "Flow") {
                        cells.push(p[i]);
                    }
                }
                graph.setCellStyles(mxConstants.STYLE_LABEL_BACKGROUNDCOLOR, mxConstants.NONE, cells, excludeType(graph.getSelectionCells(), "Ghost"));

                if (graph.isSelectionEmpty()) {

                    graph.getModel().execute(new mxCellAttributeChange(getSetting(), "BackgroundColor", "white"));
                    loadBackgroundColor();

                }

                graph.getModel().endUpdate();
            }
        },
        "-",
        {
            text: getText("形状"),
            menu: [{
                    text: getText('长方形'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_RECTANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RECTANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },
                {
                    text: getText('椭圆'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_ELLIPSE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_ELLIPSE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },
                {
                    text: getText('圆柱'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_CYLINDER, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RECTANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },

                {
                    text: getText('云状'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_CLOUD, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RECTANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },

                /*{
                	text: getText('Actor'),
                	handler: function() {
                		graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_ACTOR, excludeType(graph.getSelectionCells(), "Ghost"));
                		graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RECTANGLE, excludeType(graph.getSelectionCells(), "Ghost"));
                	}
                },
                {
                	text: getText('Arrow'),
                	handler: function() {
                		graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_ARROW, excludeType(graph.getSelectionCells(), "Ghost"));
                		graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RECTANGLE, excludeType(graph.getSelectionCells(), "Ghost"));
                	}
                },*/
                {
                    text: getText('六边形'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_HEXAGON, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_HEXAGON, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },
                {
                    text: getText('菱形'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_RHOMBUS, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_RHOMBUS, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                },
                {
                    text: getText('三角形'),
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_SHAPE, mxConstants.SHAPE_TRIANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                        graph.setCellStyles(mxConstants.STYLE_PERIMETER, mxConstants.PERIMETER_TRIANGLE, excludeType(graph.getSelectionCells(), ["Ghost", "Flow", "Link", "Transition"]));
                    }
                }
            ]
        },
        "-",
        {
            text: getText('圆角'),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_ROUNDED, 1, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        },
        {
            text: getText('锐角'),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_ROUNDED, 0, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        }
    ];


    function customColor(fn) {
        return function() {
            getCustomColor(function(col) {
                fn(col);
            });
        }
    }

    var fontColorMenu = [{
            xtype: 'colorpicker',
            colors: colors,
            allowReselect: true,
            handler: function(cm, color) {
                if (typeof(color) == "string") {
                    graph.setCellStyles(mxConstants.STYLE_FONTCOLOR, '#' + color, excludeType(graph.getSelectionCells(), "Ghost"));
                }
                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur()
                }
            }
        },
        '-',
        {
            text: getText("自定义颜色") + "...",
            handler: customColor(function(color) { graph.setCellStyles(mxConstants.STYLE_FONTCOLOR, color, excludeType(graph.getSelectionCells(), "Ghost")) })
        }
    ];

    var widthMenu = [];

    function widthItem(size) {
        widthMenu.push({
            text: getText('宽度: %s', size),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_STROKEWIDTH, size, excludeType(graph.getSelectionCells(), "Ghost"));
                graph.setCellStyles(mxConstants.ARROW_SIZE, size * 10, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        });
    }
    for (var i = 1; i <= 10; i++) {
        widthItem(i);
    }
    for (var i = 15; i <= 50; i += 5) {
        widthItem(i);
    }

    function capMenu(start) {

        function createSetter(val) {
            return function() {
                if (start) {
                    graph.setCellStyles(mxConstants.STYLE_STARTARROW, val, excludeType(graph.getSelectionCells(), "Ghost"));
                } else {
                    graph.setCellStyles(mxConstants.STYLE_ENDARROW, val, excludeType(graph.getSelectionCells(), "Ghost"));
                }
            }
        }
        var items = [
            ["无", mxConstants.NONE],
            '-', ["常规箭头", mxConstants.ARROW_CLASSIC],
            ["块箭头", mxConstants.ARROW_BLOCK],
            ["打开箭头", mxConstants.ARROW_OPEN],
            ["菱形", mxConstants.ARROW_DIAMOND],
            ["瘦菱形", mxConstants.ARROW_DIAMOND_THIN],
            ["椭圆", mxConstants.ARROW_OVAL]
        ];

        for (var i = 0; i < items.length; i++) {
            if (items[i] !== "-") {
                items[i] = {
                    text: items[i][0],
                    handler: createSetter(items[i][1])
                }
            }
        }
        return items;
    }


    var lineColorMenu = [{
            xtype: 'colorpicker',
            colors: colors,
            allowReselect: true,
            handler: function(cm, color) {
                if (typeof(color) == "string") {
                    graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#' + color, excludeType(graph.getSelectionCells(), "Ghost"));
                }
                if (document.activeElement && document.activeElement.blur) {
                    document.activeElement.blur()
                }
            }
        },
        "-",
        {
            text: getText("自定义颜色") + "...",
            handler: customColor(function(color) {
                graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, color, excludeType(graph.getSelectionCells(), "Ghost"));
            })
        },
        {
            text: getText('没有线条颜色'),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, mxConstants.NONE, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        },
        "-",
        {
            text: getText('实线'),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_DASHED, 0, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        },
        {
            text: getText('虚线'),
            handler: function() {
                graph.setCellStyles(mxConstants.STYLE_DASHED, 1, excludeType(graph.getSelectionCells(), "Ghost"));
            }
        },
        "-",
        {
            text: getText('线宽度'),
            menu: {
                items: widthMenu
            }
        },
        "-",
        {
            text: getText('线开始'),
            menu: {
                items: capMenu(true)
            }
        },
        {
            text: getText('线结束'),
            menu: {
                items: capMenu(false)
            }
        }
    ];



    var fonts = Ext.create('Ext.data.Store', {
        fields: [{
            type: 'string',
            name: 'label'
        }, {
            type: 'string',
            name: 'font'
        }],
        data: [{
            label: 'Comic',
            font: 'Comic Sans MS'
        }, {
            label: 'Helvetica',
            font: 'Helvetica'
        }, {
            label: 'Verdana',
            font: 'Verdana'
        }, {
            label: 'Times New Roman',
            font: 'Times New Roman'
        }, {
            label: 'Garamond',
            font: 'Garamond'
        }, {
            label: 'Courier New',
            font: 'Courier New'
        }]
    });

    fontCombo = {
        xtype: "combobox",
        store: fonts,
        itemId: 'fontCombo',
        iconCls: "font-family-icon",
        displayField: 'label',
        valueField: 'font',
        queryMode: 'local',
        width: 120,
        colspan: 3,
        triggerAction: 'all',
        emptyText: getText('字体类型...'),
        selectOnFocus: true,
        listeners: {
            select: function(p, entry) {
                if (entry != null) {
                    graph.setCellStyles(mxConstants.STYLE_FONTFAMILY, p.getValue(), excludeType(graph.getSelectionCells(), "Ghost"));
                }
            },
            specialkey: function(field, evt) {
                if (evt.keyCode == 10 || evt.keyCode == 13) {
                    var family = field.getValue();

                    if (family != null && family.length > 0) {
                        graph.setCellStyles(mxConstants.STYLE_FONTFAMILY, family, excludeType(graph.getSelectionCells(), "Ghost"));
                        this.setValue(family);
                    }
                }
            }
        }
    };


    // Defines the font size menu
    var sizes = Ext.create('Ext.data.Store', {
        fields: [{
            type: 'string',
            name: 'label'
        }, {
            type: 'float',
            name: 'size'
        }],
        data: [{
            label: '6pt',
            size: 6
        }, {
            label: '8pt',
            size: 8
        }, {
            label: '9pt',
            size: 9
        }, {
            label: '10pt',
            size: 10
        }, {
            label: '12pt',
            size: 12
        }, {
            label: '14pt',
            size: 14
        }, {
            label: '18pt',
            size: 18
        }, {
            label: '24pt',
            size: 24
        }, {
            label: '30pt',
            size: 30
        }, {
            label: '36pt',
            size: 36
        }, {
            label: '48pt',
            size: 48
        }, {
            label: '60pt',
            size: 60
        }]
    });

    sizeCombo = {
        xtype: "combobox",
        colspan: 2,
        store: sizes,
        itemId: 'sizeCombo',
        iconCls: "font-size-icon",
        displayField: 'label',
        valueField: 'size',
        queryMode: 'local',
        width: 50,
        triggerAction: 'all',
        emptyText: '字体大小...',
        selectOnFocus: true,
        listeners: {
            select: function(p, entry) {
                if (entry != null) {
                    graph.setCellStyles(mxConstants.STYLE_FONTSIZE, p.getValue(), excludeType(graph.getSelectionCells(), "Ghost"));
                }
            },
            specialkey: function(field, evt) {
                if (evt.keyCode == 10 || evt.keyCode == 13) {
                    var size = parseInt(field.getValue());

                    if (!isNaN(size) && size > 0) {
                        this.setValue(size);
                        graph.setCellStyles(mxConstants.STYLE_FONTSIZE, size, excludeType(graph.getSelectionCells(), "Ghost"));
                    }
                }
            }
        }
    };


    window.zoomMenu = {
        items: [{
            text: '400%',
            scope: this,
            handler: function(item) {
                setZoom(4);
            }
        }, {
            text: '200%',
            scope: this,
            handler: function(item) {
                setZoom(2);
            }
        }, {
            text: '150%',
            scope: this,
            handler: function(item) {
                setZoom(1.5);
            }
        }, {
            text: '100%',
            scope: this,
            handler: function(item) {
                setZoom(1);
            }
        }, {
            text: '75%',
            scope: this,
            handler: function(item) {
                setZoom(0.75);
            }
        }, {
            text: '50%',
            scope: this,
            handler: function(item) {
                setZoom(0.5);
            }
        }, {
            text: '25%',
            scope: this,
            handler: function(item) {
                setZoom(0.25);
            }
        }, '-', {
            text: getText('放大'),
            glyph: 0xf00e,
            scope: this,
            handler: function(item) {
                setZoom("in");
            }
        }, {
            text: getText('缩小'),
            glyph: 0xf010,
            scope: this,
            handler: function(item) {
                setZoom("out");
            }
        }, '-', {
            text: getText('还原'),

            scope: this,
            handler: function(item) {
                setZoom("actual");
            }
        }, {
            text: getText('适应窗口'),
            scope: this,
            handler: function(item) {
                setZoom("fit");
            }
        }]
    };


    window.styleMenu = [

        fontCombo,

        sizeCombo,

        {
            itemId: 'fontcolor',
            text: '字体颜色',
            tooltip: getText('字体颜色'),
            iconCls: 'fontcolor-icon',
            menu: fontColorMenu
        }, {
            itemId: 'linecolor',
            text: '线',
            tooltip: getText('线颜色'),
            iconCls: 'linecolor-icon',
            menu: lineColorMenu
        }, {
            itemId: 'fillcolor',
            text: '填充',
            tooltip: getText('填充颜色'),
            iconCls: 'fillcolor-icon',
            menu: fillColorMenu
        }, '-', {
            itemId: 'bold',
            xtype: 'menucheckitem',
            text: '粗体',
            glyph: 0xf032,
            tooltip: getText('粗体') + ' ' + cmd("B"),
            handler: function() {
                graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_BOLD, excludeType(graph.getSelectionCells(), "Ghost"));
                setStyles();
            },
            scope: this
        }, {
            itemId: 'italic',
            xtype: 'menucheckitem',
            text: '斜体',
            tooltip: getText('斜体') + ' ' + cmd("I"),
            glyph: 0xf033,
            handler: function() {
                graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_ITALIC, excludeType(graph.getSelectionCells(), "Ghost"));
                setStyles();
            },
            scope: this
        }, {
            itemId: 'underline',
            xtype: 'menucheckitem',
            text: '下划线',
            tooltip: getText('下划线') + ' ' + cmd("U"),
            glyph: 0xf0cd,
            handler: function() {
                graph.toggleCellStyleFlags(mxConstants.STYLE_FONTSTYLE, mxConstants.FONT_UNDERLINE, excludeType(graph.getSelectionCells(), "Ghost"));
                setStyles();
            },
            scope: this
        }, {
            itemId: 'align',
            text: '对齐',
            glyph: 0xf036,
            tooltip: getText('标签位置'),
            handler: function() {},
            menu: {
                items: [{
                    text: getText('左对齐'),
                    scope: this,
                    iconCls: 'left-icon',
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_ALIGN, mxConstants.ALIGN_LEFT, excludeType(graph.getSelectionCells(), "Ghost"));
                    }
                }, {
                    text: getText('居中'),
                    scope: this,
                    iconCls: 'center-icon',
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_ALIGN, mxConstants.ALIGN_CENTER, excludeType(graph.getSelectionCells(), "Ghost"));
                    }
                }, {
                    text: getText('右对齐'),
                    scope: this,
                    iconCls: 'right-icon',
                    handler: function() {
                        graph.setCellStyles(mxConstants.STYLE_ALIGN, mxConstants.ALIGN_RIGHT, excludeType(graph.getSelectionCells(), "Ghost"));
                    }
                }, '-', {
                    text: getText('位置中间'),
                    scope: this,
                    iconCls: 'middle-icon',
                    handler: function() {
                        var cells = excludeType(getSelected(), "Ghost");
                        graph.getModel().beginUpdate();
                        for (var i = 0; i < cells.length; i++) {
                            if (isDefined(cells[i].getAttribute("LabelPosition"))) {
                                var edit = new mxCellAttributeChange(cells[i], "LabelPosition", "Middle");
                                graph.getModel().execute(edit);
                                setLabelPosition(cells[i]);
                            }
                        }
                        graph.getModel().endUpdate();

                    }
                }, {
                    text: getText('位置顶部'),

                    scope: this,
                    iconCls: 'top-icon',
                    handler: function() {
                        var cells = excludeType(getSelected(), "Ghost");
                        graph.getModel().beginUpdate();
                        for (var i = 0; i < cells.length; i++) {
                            if (isDefined(cells[i].getAttribute("LabelPosition"))) {
                                var edit = new mxCellAttributeChange(cells[i], "LabelPosition", "Top");
                                graph.getModel().execute(edit);
                                setLabelPosition(cells[i]);
                            }
                        }
                        graph.getModel().endUpdate();

                    }
                }, {
                    text: getText('位置右边'),
                    scope: this,
                    iconCls: 'left-icon',
                    handler: function() {
                        var cells = excludeType(getSelected(), "Ghost");
                        graph.getModel().beginUpdate();
                        for (var i = 0; i < cells.length; i++) {
                            if (isDefined(cells[i].getAttribute("LabelPosition"))) {
                                var edit = new mxCellAttributeChange(cells[i], "LabelPosition", "Right");
                                graph.getModel().execute(edit);
                                setLabelPosition(cells[i]);
                            }
                        }
                        graph.getModel().endUpdate();

                    }
                }, {
                    text: getText('位置底部'),
                    scope: this,
                    iconCls: 'bottom-icon',
                    handler: function() {
                        var cells = excludeType(getSelected(), "Ghost");
                        graph.getModel().beginUpdate();
                        for (var i = 0; i < cells.length; i++) {
                            if (isDefined(cells[i].getAttribute("LabelPosition"))) {
                                var edit = new mxCellAttributeChange(cells[i], "LabelPosition", "Bottom");
                                graph.getModel().execute(edit);
                                setLabelPosition(cells[i]);
                            }
                        }
                        graph.getModel().endUpdate();

                    }
                }, {
                    text: getText('位置左边'),

                    scope: this,
                    iconCls: 'right-icon',
                    handler: function() {
                        var cells = excludeType(getSelected(), "Ghost");
                        graph.getModel().beginUpdate();
                        for (var i = 0; i < cells.length; i++) {
                            if (isDefined(cells[i].getAttribute("LabelPosition"))) {
                                var edit = new mxCellAttributeChange(cells[i], "LabelPosition", "Left");
                                graph.getModel().execute(edit);
                                setLabelPosition(cells[i]);
                            }
                        }
                        graph.getModel().endUpdate();

                    }
                }]
            }
        }, '-', {
            itemId: 'movemenu',
            text: '顺序',
            tooltip: getText('改变顺序'),
            glyph: 0xf0c9,
            handler: function() {},
            menu: {
                itemOd: 'move-menu',
                cls: 'move-menu',
                items: [{
                    itemOd: 'moveback',
                    text: getText('向后移动'),
                    iconCls: 'back-icon',
                    handler: function() {
                        graph.orderCells(true);
                    },
                    scope: this
                }, {
                    itemId: 'movefront',
                    text: getText('向前移动'),
                    iconCls: 'front-icon',
                    handler: function() {
                        graph.orderCells(false);
                    },
                    scope: this
                }]
            }
        }, '-', {
            itemId: 'picturemenu',
            text: '图元图片',
            tooltip: getText('调整图片'),
            glyph: 0xf03e,
            handler: function() {},
            menu: {
                itemId: 'picture-menu',
                items: [{
                        text: "没有图片",
                        glyph: 0xf057,
                        handler: function() {
                            setImage(getSelected(), "None");
                        }
                    },
                    '-', {
                        text: "自定义图片",
                        glyph: 0xf0c1,
                        handler: function() {
                            Ext.Msg.prompt("图片URL", "<p>您可以使用指向在线存储的现有自定义图像的链接。 请注意，图像仅作为链接存储在Insight Maker中，因此您需要确保原始图像保持在线状态，以便保留在模型中。</ p> <p>输入图像的完整URL：</ p>", function(btn, val) {
                                if (btn == "ok") {
                                    setImage(getSelected(), val);
                                }
                            }, null, false, (urlImage(getSelected()[0]) ? getSelected()[0].getAttribute("Image") : ""))
                        }
                    }, {
                        text: getText("内嵌图片"),
                        menu: imageMenu,
                        glyph: 0xf03e
                    },
                    '-', {
                        itemId: 'fliphitem',
                        text: getText('水平翻转'),
                        iconCls: 'fliph-icon',
                        handler: function() {
                            var cells = excludeType(getSelected(), "Ghost");

                            graph.getModel().beginUpdate();

                            for (var i = 0; i < cells.length; i++) {
                                if (isDefined(cells[i].getAttribute("FlipHorizontal"))) {
                                    var edit = new mxCellAttributeChange(cells[i], "FlipHorizontal", !isTrue(cells[i].getAttribute("FlipHorizontal")));
                                    graph.getModel().execute(edit);
                                    setPicture(cells[i]);
                                }
                            }

                            graph.getModel().endUpdate();

                        },
                        scope: this
                    }, {
                        itemId: 'flipvitem',
                        text: getText('垂直翻转'),
                        iconCls: 'flipv-icon',
                        handler: function() {
                            var cells = excludeType(getSelected(), "Ghost");
                            graph.getModel().beginUpdate();
                            for (var i = 0; i < cells.length; i++) {
                                if (isDefined(cells[i].getAttribute("FlipVertical"))) {
                                    var edit = new mxCellAttributeChange(cells[i], "FlipVertical", !isTrue(cells[i].getAttribute("FlipVertical")));
                                    graph.getModel().execute(edit);
                                    setPicture(cells[i]);
                                }
                            }
                            graph.getModel().endUpdate();

                        },
                        scope: this
                    }
                ]
            }
        },
        '-',
        {
            itemId: 'useAsDefaultStyle',
            text: getText('使用默认'),
            glyph: 0xf043,
            handler: function() {
                var cells = getSelected();

                var stylesheet = getStyleSheet();

                cells.forEach(function(x) {
                    var style = x.getStyle();
                    var styles = style.split(";");
                    var obj = {};

                    var o2 = graph.getStylesheet().getCellStyle(x.value.nodeName.toLowerCase());

                    for (var item in o2) {
                        obj[item] = o2[item];
                    }

                    for (var i = 1; i < styles.length; i++) {
                        var kv = styles[i].split("=");
                        obj[kv[0]] = kv[1];
                    }

                    stylesheet[x.value.nodeName] = obj;
                });


                graph.getModel().beginUpdate();
                setStyleSheet(stylesheet);
                graph.getModel().endUpdate();

                loadStyleSheet();
            },
            scope: this
        },
        {
            excludeFromContext: true,
            itemId: 'styleManagerMenu',
            text: getText('样式表管理'),
            glyph: 0xf1c0,
            handler: showStyleManager
        }
    ];



    return ({
        id: 'ribbonPanel',
        xtype: 'panel',
        layout: 'border',
        region: 'center',
        split: true,
        border: false,
        items: [mainPanel, configPanel],
        collapsible: false,
        tbar: new Ext.toolbar.Toolbar({
            enableOverflow: true,
            items: FileMenu.concat([{
                    hidden: is_ebook,
                    cls: 'button',
                    glyph: 0xf015,
                    iconCls: 'icon-icon',

                    href: '//',
                    tooltip: 'Home'
                },
                '->',
                
                {
                    hidden: (!viewConfig.primitiveGroup),
                    text: getText('开始'),
                    itemId: 'valued',
                    iconCls: 'green-icon',
                    glyph: 0xf055,
                    menu: [{
                    text: getText('文件'),
                    itemId: "filegroup",
                    glyph: 0xf15b,
                    menu: [{
                            glyph: 0xf016,
                            text: getText('新建'),
                            tooltip: getText('新建模型'),
                            handler: FileManagerWeb.newModel,
                            scope: this
                        },
                        {
                            glyph: 0xf115,
                            /*0xf115 alternative icon we could have used */
                            text: getText('加载'),
                            tooltip: getText('加载模型'),
                            handler: FileManagerWeb.loadModel,
                            scope: this
                        },
                        {
                            glyph: 0xf0c7,
                            text: getText('保存'),
                            tooltip: getText('保存模型'),
                            handler: FileManagerWeb.saveModel,
                            scope: this
                        }
                    ]
                },'-'
                ,{
                            xtype: "component",
                            indent: false,
                            html: "<b>" + getText('系统动力学模型') + "</b>",
                            disabled: true,
                            style: {
                                "margin": "10px 5px 10px 5px"
                            }
                        }, '-', {
                            itemId: 'stock',
                            text: getText('添加库'),
                            glyph: 0xf1b2,
                            tooltip: getText('库用来储存物质'),
                            handler: function() {
                                var x = createPrimitive("新库", "Stock", [240, 80], [100, 40]);
                                highlight(x);

                                graph.orderCells(false);

                                //setTimeout(function(){graph.cellEditor.startEditing(x)},20);
                            }
                        }, {
                            itemId: 'variable',
                            text: getText('添加变量'),
                            glyph: 0xf0e4,
                            tooltip: getText('变量可以是常数或动态更新的等式'),
                            handler: function() {
                                highlight(createPrimitive("新变量", "Variable", [240, 80], [120, 50]))

                                graph.orderCells(false);
                            }
                        }, {
                            itemId: 'converter',
                            text: getText('添加转换器'),
                            glyph: 0xf1fe,
                            tooltip: getText('转换器可以包含图形函数或输入/输出表'),
                            handler: function() {
                                highlight(createPrimitive("新转换器", "Converter", [240, 80], [120, 50]))

                                graph.orderCells(false);
                            }
                        }, '-', {
                            xtype: "component",
                            indent: false,
                            html: "<b>" + getText('多主体建模') + "</b>",
                            disabled: true,
                            style: {
                                "margin": "10px 5px 10px 5px"
                            }
                        }, '-', {
                            itemId: 'population',
                            glyph: 0xf0c0,
                            text: getText('添加主体群'),
                            tooltip: getText('主体群是主体的集合'),
                            handler: function() {
                                highlight(createPrimitive("主体群", "Agents", [240, 80], [170, 80]))

                                graph.orderCells(false);
                            }
                        }, {
                            itemId: 'state',
                            glyph: 0xf046,
                            text: getText('添加状态'),
                            tooltip: getText('状态是二进制，真/假变量'),
                            handler: function() {
                                highlight(createPrimitive("新状态", "State", [240, 80], [100, 40]))
                            }
                        }, {
                            itemId: 'action',
                            glyph: 0xf0e7,
                            text: getText('添加动作'),
                            tooltip: getText('动作可以触发模型状态的更改'),
                            handler: function() {
                                highlight(createPrimitive("新动作", "Action", [240, 80], [120, 50]))

                                graph.orderCells(false);
                            }
                        },
                        '-', {

                            xtype: "component",
                            indent: false,
                            html: "<b>" + getText('用户接口') + "</b>",
                            disabled: true,
                            style: {
                                "margin": "10px 5px 10px 5px"
                            }
                        },
                        '-', {
                            itemId: 'text',
                            text: getText('添加文本框'),
                            glyph: 0xf035,
                            tooltip: getText('注释你的模型'),
                            handler: function() {
                                highlight(createPrimitive("新文本框", "Text", [240, 80], [200, 50]))

                                graph.orderCells(false);
                            }
                        }, {
                            itemId: 'picture',
                            text: getText('添加图片'),
                            glyph: 0xf03e,
                            tooltip: getText('展示你的模型'),
                            handler: function() {
                                var x = createPrimitive("", "Picture", [240, 80], [64, 64]);
                                setPicture(x);
                                highlight(x);

                                graph.orderCells(false);
                            }
                        }, {
                            itemId: 'buttonBut',
                            text: getText('添加互动按钮'),
                            glyph: 0xf196,
                            tooltip: getText('为模型图添加交互性'),
                            handler: function() {
                                highlight(createPrimitive("新按钮", "Button", [240, 80], [120, 40]))

                                graph.orderCells(false);
                            }

                        }, '-', {
                            itemId: 'ghostBut',
                            text: getText('影子图元'),
                            glyph: 0xf0c5,
                            tooltip: getText('创建所选图元的链接别名，可以帮助您组织模型'),
                            scope: this,
                            handler: makeGhost
                        }, {
                            itemId: 'folder',
                            text: getText('创建文件夹'),
                            glyph: 0xf114,
                            tooltip: getText('创建一个包含所选图元的新文件夹'),
                            scope: this,
                            handler: makeFolder
                        }

                    ]
                }, {
                    xtype: 'tbseparator',
                    hidden: (!is_editor) || is_embed
                },
                {
                    hidden: (!viewConfig.connectionsGroup),
                    xtype: "segmentedbutton",
                    items: [{
                            //glyph: 0xf0d1,
                            //iconCls: 'green-icon',
                            text: '流/转换',
                            id: "connect",
                            pressed: true,
                            tooltip: "使用流或转换来连接图元。 选择一个图元并拖动图元上显示的箭头以建立连接。 流转移物质，转换切换状态。"
                        },
                        {
                            //glyph: 0xf095,
                            //iconCls: 'green-icon',
                            text: '链接',
                            tooltip: "使用链接连接图元。 选择一个图元并拖动图元上显示的箭头以建立连接。 链接传输信息。"
                        }
                    ]
                },
                /*{
					hidden: (!viewConfig.connectionsGroup),
					text: getText('Using Flows/Transitions'),
					id: 'connect',
					iconCls: 'green-icon',
					glyph: 0xf0d1,
					//iconCls: 'flow-small-icon',//f043
					tooltip: "The method used in new connections to connect primitive. Select a primitive and drag the arrow that appears to make a connection. Flows transfer material. Links transfer information.",
					handler: function() {
						var flow = (connectionType() == "Flow");
						if (flow) {
							Ext.getCmp("connect").setText("Using Information Links");
							Ext.getCmp("connect").setGlyph(0xf095);
						} else {
							Ext.getCmp("connect").setText("Using Flows/Transitions");
							Ext.getCmp("connect").setGlyph(0xf0d1);
						}
					},
					scope: this

				}*/
                , {
                    itemId: 'reverse',
                    hidden: (!viewConfig.connectionsGroup),
                    glyph: 0xf0ec,
                    tooltip: getText('反转箭头方向'),
                    handler: reverseDirection,
                    scope: this
                }, {
                    xtype: 'tbseparator',
                    hidden: (!is_editor) || is_embed
                },
                {
                    itemId: 'config',
                    text: getText('设置'),
                    glyph: 0xf017,
                    tooltip: getText('配置开始和截止时间') + ' ' + cmd("L"),
                    handler: timeSettingsFn,
                    scope: this
                },
                '-', {
                    hidden: (!viewConfig.saveEnabled),
                    text: getText('保存'),
                    glyph: 0xf0c7,
                    tooltip: getText('保存模型') + ' ' + cmd("S"),
                    itemId: 'savebut',
                    handler: function() {
                        saveModel();
                    },
                    scope: this

                }, {

                    itemId: 'run',
                    text: getText('模拟'),
                    iconCls: 'blue-icon',
                    glyph: 0xf01d,
                    tooltip: getText('模拟') + ' ' + cmd("Enter"),
                    handler: function(me, evt) {
                        runModel();
                    },
                    scope: this
                }, {
                    itemId: '3Drun',
                    text: getText('仿真'),
                    iconCls: 'blue-icon',
                    glyph: 0xf1b2,
                    tooltip: getText('虚拟仿真') + ' ' + cmd("Enter"),
                    handler: ThreeDManager
                    
                },{
                    xtype: 'tbseparator',
                    hidden: (!is_editor) || is_embed
                },

                // '->',

                /*{
                	hidden: (!is_editor) || is_embed || is_ebook,
                	text: getText(''),
                	glyph: 0xf059,
                	tooltip: getText("Insight Maker Help"),
                	handler: function() {
                		showURL("//insightmaker.com/help")
                	},
                	scope: this
                }, {
                	xtype: 'tbseparator',
                	hidden: !viewConfig.actionsGroup
                },*/

                {
                    hidden: (!viewConfig.actionsGroup),
                    text: getText('编辑'),
                    itemId: 'actions',
                    menu: [{
                            hidden: !viewConfig.actionsGroup,
                            itemId: 'undo',
                            text: "撤销",
                            glyph: 0xf0e2,
                            tooltip: getText('撤销') + ' ' + cmd("Z"),
                            handler: function() {
                                undoHistory.undo();
                            },
                            scope: this
                        }, {
                            hidden: !viewConfig.actionsGroup,
                            itemId: 'redo',
                            text: "重做",
                            glyph: 0xf01e,
                            tooltip: getText('重做') + ' ' + cmd("Y"),
                            handler: function() {
                                undoHistory.redo();
                            },
                            scope: this
                        },
                        '-',
                        editActions.copy,
                        editActions.cut,
                        editActions.paste,
                        '-',
                        editActions["delete"],
                        '-', {
                            text: getText('查找/替换...'),
                            tooltip: getText('在模型中查找文本') + ' ' + cmd("F"),
                            handler: showFindAndReplace
                        }, {
                            text: getText('查找文本'),
                            tooltip: getText('在模型中查找下一个文本') + ' ' + cmd("G"),
                            handler: function() {
                                var but = Ext.getCmp('findNextBut');
                                if (but && (!but.disabled)) {
                                    findNext();
                                }
                            }
                        }, '-', {
                            text: getText("打印..."),
                            glyph: 0xf02f,
                            handler: printGraph
                        },
                        '-', {
                            itemId: "zoomMenuButton",
                            text: getText('缩放'),
                            glyph: 0xf002,
                            menu: zoomMenu
                        },
                        {
                            text: getText('布局图'),
                            glyph: 0xf0e8,
                            menu: [{
                                    text: getText('垂直分层布局'),
                                    scope: this,
                                    handler: function(item) {
                                        var layout = new mxHierarchicalLayout(graph);
                                        executeLayout(layout, true);
                                    }
                                },
                                {
                                    text: getText('水平分层布局'),
                                    scope: this,
                                    handler: function(item) {
                                        var layout = new mxHierarchicalLayout(graph,
                                            mxConstants.DIRECTION_WEST);
                                        executeLayout(layout, true);
                                    }
                                }, '-', {
                                    text: getText('有机布局'),
                                    scope: this,
                                    handler: function(item) {
                                        layoutModel("organic");
                                    }
                                }, {
                                    text: getText('圆形布局'),
                                    scope: this,
                                    handler: function(item) {
                                        layoutModel("circular");
                                    }
                                }
                            ]
                        }
                    ]
                }, {
                    hidden: (!viewConfig.styleGroup),
                    text: getText('风格'),
                    itemId: 'style',
                    menu: styleMenu
                    /*,
                    					glyph: 0xf0d0*/
                }, {
                    xtype: 'tbseparator',
                    hidden: !viewConfig.actionsGroup
                },
                {
                    hidden: (!viewConfig.styleGroup),
                    text: getText('分享'),
                    itemId: 'share',
                    menu: [{
                            hidden: (!is_editor) || is_ebook,
                            text: getText('讲述') + "...",
                            glyph: 0xf0e6,
                            tooltip: getText('逐步显示模型以讲述故事'),
                            handler: blockUnfold(showUnfoldingWin),
                            scope: this
                        },
                        {
                            hidden: (!is_editor) || is_ebook,
                            text: getText('发布文章') + "...",
                            glyph: 0xf0f6,
                            tooltip: getText('创建一个描述模型的清晰静态网页'),
                            handler: blockUnfold(articleWindow),
                            scope: this
                        },
                        '-', {
                            itemId: 'embed_but',
                            text: getText('嵌入网页') + "...",
                            hidden: (!is_editor) || is_ebook,
                            glyph: 0xf0ac,
                            tooltip: getText('将此模型嵌入另一个网页'),
                            handler: function() {
                                if (drupal_node_ID == -1) {
                                    Ext.MessageBox.show({
                                        title: getText('保存模型'),
                                        msg: getText('嵌入之前您必须保存模型'),
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.ERROR
                                    });
                                } else {

                                    Ext.MessageBox.show({
                                        title: getText('嵌入'),
                                        msg: getText('要将此Insight嵌入其他网页（例如博客或私人网站），请将以下代码复制并粘贴到您网页的源HTML代码中： %s', '<br/><br/><center><tt>&lt;IFRAME SRC="//InsightMaker.com/insight/' + drupal_node_ID + '/embed?topBar=1&sideBar=1&zoom=1" TITLE="Embedded Insight" width=600 height=420&gt;&lt;/IFRAME&gt;</tt></center><br/>'),
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.INFO
                                    });
                                }
                            },
                            scope: this
                        },
                        '-', {
                            hidden: (!is_editor),
                            text: "导入",
                            glyph: 0xf093,
                            menu: [
                                /*{
                                									text: getText("Insight Maker 链接..."),
                                									handler: function() {
                                										showInsertModelWindow({
                                											x: 200,
                                											y: 100
                                										});
                                									}
                                								},*/
                                {
                                    hidden: (!viewConfig.showImportExport),
                                    text: getText("文件..."),
                                    handler: importInsightMaker
                                },

                                '-', {
                                    text: getText("XMILE 文件... <span style='color: #bbb'>(测试)<span>"),
                                    handler: importXMILE
                                }

                            ]
                        }, {
                            hidden: (!is_editor),
                            text: "导出",
                            glyph: 0xf019,
                            menu: [{
                                    hidden: (!viewConfig.showImportExport),
                                    text: getText("下载"),
                                    handler: function() {
                                        downloadFile("Model.InsightMaker", getGraphXml(graph).replace(/mxGraphModel/g, "InsightMakerModel"));
                                    }
                                }, '-',
                                {
                                    /*hidden: (!is_editor),*/
                                    itemId: 'textBut',
                                    text: getText('完整的公式列表'),
                                    /*glyph: 0xf03a,*/
                                    tooltip: getText('A listing of all equations in the Insight'),
                                    handler: textEquations,
                                    scope: this
                                },
                                {
                                    glyph: 0xf1c5,
                                    text: getText("导出SVG"),
                                    handler: function() {
                                        exportSvg();
                                    }
                                }

                            ]
                        }
                    ],
                    glyph: 0xf1e0
                },
                {

                    hidden: (!viewConfig.toolsGroup),
                    text: getText('工具'),
                    itemId: "configgroup",
                    glyph: 0xf0ad,
                    menu: [{
                            itemId: 'scratchpad',
                            text: getText('便笺'),
                            glyph: 0xf040,
                            tooltip: getText('在图表上绘制注释') + ' ' + cmd("K"),
                            enableToggle: true,
                            handler: scratchpadFn,
                            xtype: 'menucheckitem',
                            scope: this
                        },
                        {
                            xtype: 'menuseparator',
                            hidden: (!is_editor) || is_ebook
                        }, {
                            text: getText('识别循环') + "...",
                            glyph: 0xf1ce,
                            tooltip: getText('识别图中的循环'),
                            handler: doLoops,
                            scope: this
                        }, {
                            text: getText('比较结果') + "...",
                            glyph: 0xf02c,
                            tooltip: getText('比较模拟结果'),
                            handler: function() {
                                var sum = 0;

                                Ext.WindowMgr.each(
                                    function(win) {
                                        var t = win.down("#pinTool");
                                        if (t) {
                                            sum++;
                                        }
                                    }
                                );
                                if (sum < 2) {
                                    showNotification(getText("您必须至少有两个打开的模拟结果窗口才能进行比较。"), "notice", true);
                                } else {
                                    doCompare();
                                }
                            },
                            scope: this
                        }, {
                            xtype: 'menuseparator',
                            hidden: (!is_editor) || is_ebook
                        }, {
                            itemId: 'sensitivityBut',
                            text: getText('灵敏度测试') + "...",
                            glyph: 0xf201,
                            tooltip: getText('模型灵敏度测试'),
                            handler: doSensitivity,
                            scope: this
                        }, {
                            itemId: 'optimizeBut',
                            text: getText('优化和目标寻求') + "...",
                            glyph: 0xf140,
                            tooltip: getText('优化模型参数'),
                            handler: doOptimizer,
                            scope: this

                        }, {
                            xtype: 'menuseparator',
                            hidden: (!is_editor) || is_ebook
                        }, {
                            hidden: (!is_editor) || is_embed || is_ebook,
                            itemId: 'macroBut',
                            text: getText('宏和变量') + "...",
                            glyph: 0xf1c9,
                            tooltip: getText('编辑宏函数和常量，以便在等式中的任何位置使用'),
                            handler: showMacros,
                            scope: this
                        }



                    ]
                }, {
                    hidden: is_editor,
                    cls: 'button',
                    text: getText('缩放'),
                    glyph: 0xf002,
                    tooltip: getText('缩放图表'),
                    itemId: 'zoomlargebutgrouped',
                    handler: function(menu) {},
                    menu: zoomMenu
                }


            ])
        })

    });
};