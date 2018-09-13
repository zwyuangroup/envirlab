function ThreeDManager() {
	var win = new Ext.Window({
		title: getText('3D模拟'),
		layout: {
			type: 'vbox',
			align: 'stretch'
		},
		closeAction: 'hide',
		border: false,
		modal: true,
		resizable: false,
		shadow: true,
		buttonAlign: 'left',
		layoutConfig: {
			columns: 1
		},
		width: 1300,
		height: 750,
		items: [{
				xtype: "container",
				layout: {
					type: 'hbox',
					align: 'middle'
				},
				padding: 5,
				items: [{
					xtype: 'box',
					flex: 1
				}, {
					xtype: 'box',
					flex: 1
				}]
			}, {
				xtype: "box",
				margin: 9,
				html: "<iframe width=1280 height=720 src='unity/index.html' frameborder='0' allow='autoplay; encrypted-media' allowfullscreen></iframe>"
			}, {
				xtype: "container",
				layout: {
					type: 'hbox',
					align: 'middle'
				},
				padding: 5,
				items: [{
					xtype: 'box',
					flex: 1
				}, {
					xtype: 'box',
					flex: 1
				}]
			}


		]
	});


	win.show();
}

