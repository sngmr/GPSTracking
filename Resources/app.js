// 共通定数
var DB_NAME = 'db';
var KEY_PROP_ID = 'locationid';

// Location モジュールを開始する
var geo = require('geo').create();
geo.start();

var tabGroup = Titanium.UI.createTabGroup();
var tab = Titanium.UI.createTab({  
    window: createListWindow()
});
tabGroup.addTab(tab);  
tabGroup.open();

// 一覧Window
function createListWindow() {
	var listWin = Titanium.UI.createWindow({  
	    title: '居場所一覧（最新20件）',
	    backgroundColor: '#fff',
	    tabBarHidden: true
	});
	var refreshButton = Ti.UI.createButton({
		systemButton: Ti.UI.iPhone.SystemButton.REFRESH
	});
	listWin.rightNavButton = refreshButton;
	
	var tableView = Ti.UI.createTableView();
	tableView.addEventListener('click', function(e) {
		var detailWin = createDetailWin(e.rowData.location);
		tab.open(detailWin);
	});
	listWin.add(tableView);
	
	var refreshFn = function() {
		var db = Ti.Database.open(DB_NAME);
		var rs = db.execute('SELECT * FROM locations ORDER BY id DESC LIMIT 20;');
		
		// TableViewRow に location レコードを渡したいので一旦 Object へ
		var locationList = [];
		while (rs.isValidRow()) {
			locationList.push({
				id: rs.fieldByName('id'),
				date: rs.fieldByName('date'),
				lat: rs.fieldByName('lat'),
				lng: rs.fieldByName('lng'),
				error: rs.fieldByName('error')
			});
			rs.next();
		}
		rs.close();
		db.close();
		
		// TableViewRow 作成
		var tableViewRowList = [];
		for (var i = 0; i < locationList.length; i++) {
			var tableViewRow = Ti.UI.createTableViewRow({
				title: locationList[i].date + (locationList[i].error ? ' ！' : ''),
				hasDetail: true,
				location: locationList[i]
			});
			tableViewRowList.push(tableViewRow);
		}
		tableView.setData(tableViewRowList);
	}
	
	refreshButton.addEventListener('click', refreshFn);
	refreshFn();
	
	return listWin;
}

// 詳細Window
function createDetailWin(location) {
	var detailWin = Ti.UI.createWindow({
		title: '居場所詳細',
		backgroundColor: '#fff',
		tabBarHidden: true
	});
	
	if (location.error) {
		// エラーが発生していたらエラーメッセージを表示する
		var errorLabel = Ti.UI.createLabel({
			text: location.error,
			textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT
		});
		detailWin.add(errorLabel);
	} else {
		// 地図に位置を表示
		var annotation = Ti.Map.createAnnotation({
			latitude: location.lat,
			longitude: location.lng,
			pincolor: Ti.Map.ANNOTATION_RED,
			title: location.date,
			subtitle: location.lat + ' / ' + location.lng
		});
		
		var map = Ti.Map.createView({
			region: {
				latitude: location.lat,
				longitude: location.lng,
				latitudeDelta: 0.05,
				longitudeDelta: 0.05
			},
			annotations: [annotation]
		});
		detailWin.add(map);
	}
	
	return detailWin;
}
