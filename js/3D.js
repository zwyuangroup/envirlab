function ThreeDManager() {
    var str=location.href; 
	var num=str.indexOf("=") 
	str=str.substr(num+1); 
    var link=javascript:window.location='http://jsxngx.seu.edu.cn/XnfzZy/10284/njumcs/index.html' + str
	var win = new Ext.Window({
		title: getText('3D模拟'),
		layout: 'fit',
		closeAction: 'destroy',
		border: false,
		modal: false,
		resizable: true,
		closable: true,
		maximizable: true,
		minimizable: true,
		shadow: true,
		layout: {
			type: 'vbox',
			align: 'stretch'
		},
		
		
		/*closeAction: 'hide',
		border: false,
		modal: true,
		resizable: false,
		shadow: true,
		buttonAlign: 'left',
		layoutConfig: {
			columns: 1
		},
		width: 1250,
		height: 700,*/
		items: [ {
				xtype: "box",
				layout: "fit",
				margin: 9,
				html: "<iframe width=1200 height=650 href=' link ' frameborder='0' allow='autoplay; encrypted-media' allowfullscreen></iframe>"
			}


		]
	});
	win.on('minimize', function(w) {
		if (w.expandedState) {
			w.expandedState = false;
			w.collapse();
		} else {
			w.expandedState = true;
			win.expand();
		}
	});

	win.show();
}

