"use strict";
/*

Copyright 2010-2015 Scott Fortmann-Roe. All rights reserved.

This file may distributed and/or modified under the
terms of the Insight Maker Public License (https://InsightMaker.com/impl).

*/

var graph;
var primitiveBank = {};
var defaultSolver = '{"enabled": false, "algorithm": "RK1", "timeStep": 1}';

var doc = document.implementation.createDocument("", "", null);

primitiveBank.text = doc.createElement('Text');
primitiveBank.text.setAttribute('name', getText('文本区域'));
primitiveBank.text.setAttribute('LabelPosition', "Middle");

primitiveBank.folder = doc.createElement('Folder');
primitiveBank.folder.setAttribute('name', getText('新文件夹'));
primitiveBank.folder.setAttribute('Note', '');
primitiveBank.folder.setAttribute('Type', 'None');
primitiveBank.folder.setAttribute('Solver', defaultSolver);
primitiveBank.folder.setAttribute('Image', 'None');
primitiveBank.folder.setAttribute('FlipHorizontal', false);
primitiveBank.folder.setAttribute('FlipVertical', false);
primitiveBank.folder.setAttribute('LabelPosition', "Middle");
primitiveBank.folder.setAttribute('AgentBase', "");

primitiveBank.ghost = doc.createElement('Ghost');
primitiveBank.ghost.setAttribute('Source', '');

primitiveBank.picture = doc.createElement('Picture');
primitiveBank.picture.setAttribute('name', '');
primitiveBank.picture.setAttribute('Note', '');
primitiveBank.picture.setAttribute('Image', 'Growth');
primitiveBank.picture.setAttribute('FlipHorizontal', false);
primitiveBank.picture.setAttribute('FlipVertical', false);
primitiveBank.picture.setAttribute('LabelPosition', "Bottom");

primitiveBank.display = doc.createElement('Display');
primitiveBank.display.setAttribute('name', getText('默认显示'));
primitiveBank.display.setAttribute('Note', '');
primitiveBank.display.setAttribute('Type', 'Time Series');
primitiveBank.display.setAttribute('xAxis', getText("时间") + ' (%u)');
primitiveBank.display.setAttribute('yAxis', '');
primitiveBank.display.setAttribute('yAxis2', '');
primitiveBank.display.setAttribute('showMarkers', false);
primitiveBank.display.setAttribute('showLines', true);
primitiveBank.display.setAttribute('showArea', false);
primitiveBank.display.setAttribute('ThreeDimensional', false);
primitiveBank.display.setAttribute('Primitives', '');
primitiveBank.display.setAttribute('Primitives2', '');
primitiveBank.display.setAttribute('AutoAddPrimitives', false);
primitiveBank.display.setAttribute('ScatterplotOrder', 'X Primitive, Y Primitive');
primitiveBank.display.setAttribute('Image', 'Display');
primitiveBank.display.setAttribute('FlipHorizontal', false);
primitiveBank.display.setAttribute('FlipVertical', false);
primitiveBank.display.setAttribute('LabelPosition', "Bottom");
primitiveBank.display.setAttribute('legendPosition', "Automatic");

function setValuedProperties(cell) {
    cell.setAttribute('Units', "Unitless")
    cell.setAttribute('MaxConstraintUsed', false)
    cell.setAttribute('MinConstraintUsed', false)
    cell.setAttribute('MaxConstraint', '100');
    cell.setAttribute('MinConstraint', '0');
    cell.setAttribute('ShowSlider', false);
    cell.setAttribute('SliderMax', 100);
    cell.setAttribute('SliderMin', 0);
    cell.setAttribute('SliderStep', '');
}

primitiveBank.stock = doc.createElement('Stock');
primitiveBank.stock.setAttribute('name', getText('新库'));
primitiveBank.stock.setAttribute('Note', '');
primitiveBank.stock.setAttribute('InitialValue', '0');
primitiveBank.stock.setAttribute('StockMode', 'Store');
primitiveBank.stock.setAttribute('Delay', '10');
primitiveBank.stock.setAttribute('Volume', '100');
primitiveBank.stock.setAttribute('NonNegative', false);
setValuedProperties(primitiveBank.stock);
primitiveBank.stock.setAttribute('Image', 'None');
primitiveBank.stock.setAttribute('FlipHorizontal', false);
primitiveBank.stock.setAttribute('FlipVertical', false);
primitiveBank.stock.setAttribute('LabelPosition', "Middle");

primitiveBank.state = doc.createElement('State');
primitiveBank.state.setAttribute('name', getText('新状态'));
primitiveBank.state.setAttribute('Note', '');
primitiveBank.state.setAttribute('Active', 'false');
primitiveBank.state.setAttribute('Residency', '0');
primitiveBank.state.setAttribute('Image', 'None');
primitiveBank.state.setAttribute('FlipHorizontal', false);
primitiveBank.state.setAttribute('FlipVertical', false);
primitiveBank.state.setAttribute('LabelPosition', "Middle");

primitiveBank.transition = doc.createElement('Transition');
primitiveBank.transition.setAttribute('name', getText('交换'));
primitiveBank.transition.setAttribute('Note', '');
primitiveBank.transition.setAttribute('Trigger', 'Timeout');
primitiveBank.transition.setAttribute('Value', '1');
primitiveBank.transition.setAttribute('Repeat', false);
primitiveBank.transition.setAttribute('Recalculate', false);
setValuedProperties(primitiveBank.transition);

primitiveBank.action = doc.createElement('Action');
primitiveBank.action.setAttribute('name', getText('新动作'));
primitiveBank.action.setAttribute('Note', '');
primitiveBank.action.setAttribute('Trigger', 'Probability');
primitiveBank.action.setAttribute('Value', '0.5');
primitiveBank.action.setAttribute('Repeat', true);
primitiveBank.action.setAttribute('Recalculate', false);
primitiveBank.action.setAttribute('Action', 'Self.Move({Rand(), Rand()})');

primitiveBank.agents = doc.createElement('Agents');
primitiveBank.agents.setAttribute('name', getText('新主体群'));
primitiveBank.agents.setAttribute('Note', '');
primitiveBank.agents.setAttribute('Size', 100);
primitiveBank.agents.setAttribute('GeoWrap', false);
primitiveBank.agents.setAttribute('GeoDimUnits', 'Unitless');
primitiveBank.agents.setAttribute('GeoWidth', 200);
primitiveBank.agents.setAttribute('GeoHeight', 100);
primitiveBank.agents.setAttribute('Placement', "Random");
primitiveBank.agents.setAttribute('PlacementFunction', "{Rand()*Width(Self), Rand()*Height(Self)}");
primitiveBank.agents.setAttribute('Network', "None");
primitiveBank.agents.setAttribute('NetworkFunction', "RandBoolean(0.02)");
primitiveBank.agents.setAttribute('Agent', '');
primitiveBank.agents.setAttribute('Image', 'None');
primitiveBank.agents.setAttribute('FlipHorizontal', false);
primitiveBank.agents.setAttribute('FlipVertical', false);
primitiveBank.agents.setAttribute('LabelPosition', "Middle");
primitiveBank.agents.setAttribute('ShowSlider', false);
primitiveBank.agents.setAttribute('SliderMax', 100);
primitiveBank.agents.setAttribute('SliderMin', 0);
primitiveBank.agents.setAttribute('SliderStep', 1);

primitiveBank.variable = doc.createElement('Variable');
primitiveBank.variable.setAttribute('name', getText('新变量'));
primitiveBank.variable.setAttribute('Note', '');
primitiveBank.variable.setAttribute('Equation', '0');
setValuedProperties(primitiveBank.variable);
primitiveBank.variable.setAttribute('Image', 'None');
primitiveBank.variable.setAttribute('FlipHorizontal', false);
primitiveBank.variable.setAttribute('FlipVertical', false);
primitiveBank.variable.setAttribute('LabelPosition', "Middle");

primitiveBank.button = doc.createElement('Button');
primitiveBank.button.setAttribute('name', getText('新按钮'));
primitiveBank.button.setAttribute('Note', '');
primitiveBank.button.setAttribute('Function', 'showMessage("触发按钮操作！\\ in \\如果要编辑此操作，请在按住键盘上的Shift键的同时单击按钮。")');
primitiveBank.button.setAttribute('Image', 'None');
primitiveBank.button.setAttribute('FlipHorizontal', false);
primitiveBank.button.setAttribute('FlipVertical', false);
primitiveBank.button.setAttribute('LabelPosition', "Middle");

primitiveBank.converter = doc.createElement('Converter');
primitiveBank.converter.setAttribute('name', getText('新转换器'));
primitiveBank.converter.setAttribute('Note', '');
primitiveBank.converter.setAttribute('Source', 'Time');
primitiveBank.converter.setAttribute('Data', '0,0; 1,1; 2,4; 3,9');
primitiveBank.converter.setAttribute('Interpolation', 'Linear');
setValuedProperties(primitiveBank.converter);
primitiveBank.converter.setAttribute('Image', 'None');
primitiveBank.converter.setAttribute('FlipHorizontal', false);
primitiveBank.converter.setAttribute('FlipVertical', false);
primitiveBank.converter.setAttribute('LabelPosition', "Middle");

primitiveBank.flow = doc.createElement('Flow');
primitiveBank.flow.setAttribute('name', getText('流'));
primitiveBank.flow.setAttribute('Note', '');
primitiveBank.flow.setAttribute('FlowRate', '0');
primitiveBank.flow.setAttribute('OnlyPositive', true);
primitiveBank.flow.setAttribute('TimeIndependent', false);
setValuedProperties(primitiveBank.flow);

primitiveBank.link = doc.createElement('Link');
primitiveBank.link.setAttribute('name', getText('Link'));
primitiveBank.link.setAttribute('Note', '');
primitiveBank.link.setAttribute('BiDirectional', false);

primitiveBank.setting = doc.createElement('Setting');
primitiveBank.setting.setAttribute('Note', '');
primitiveBank.setting.setAttribute('Version', '36');
primitiveBank.setting.setAttribute('Throttle', '1');
primitiveBank.setting.setAttribute('TimeLength', '100');
primitiveBank.setting.setAttribute('TimeStart', '0');
primitiveBank.setting.setAttribute('TimeStep', '1');
primitiveBank.setting.setAttribute('TimeUnits', 'Years');
primitiveBank.setting.setAttribute('Units', "");
primitiveBank.setting.setAttribute("SolutionAlgorithm", "RK1");
primitiveBank.setting.setAttribute("BackgroundColor", "white");
primitiveBank.setting.setAttribute("Macros", "");
primitiveBank.setting.setAttribute("SensitivityPrimitives", "");
primitiveBank.setting.setAttribute("SensitivityRuns", 50);
primitiveBank.setting.setAttribute("SensitivityBounds", "50, 80, 95, 100");
primitiveBank.setting.setAttribute("SensitivityShowRuns", "false");
primitiveBank.setting.setAttribute("StrictUnits", "true");
primitiveBank.setting.setAttribute("StrictLinks", "true");
primitiveBank.setting.setAttribute("StrictAgentResolution", "true");
primitiveBank.setting.setAttribute("StyleSheet", "{}");


var blankGraphTemplate = "";

function setConverterInit(converter) {
    var start = parseFloat(getTimeStart(), 10);
    var end = parseFloat(getTimeStart(), 10) + parseFloat(getTimeLength(), 10);

    converter.setAttribute("Data", start + "," + Math.pow(start, 2) + "; " + (start + end) / 2 + "," + Math.pow((start + end) / 2, 2) + "; " + end + "," + Math.pow(end, 2))
}