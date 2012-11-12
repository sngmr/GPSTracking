Ti.Geolocation.purpose = 'オマエの居場所を丸裸にしてやる';
Ti.Geolocation.trackSignificantLocationChange = true;	// こいつがずーーーっと位置取得するキモ？
Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_BEST;	// 精度ガンバレ
Ti.Geolocation.frequency = 0;							// locationが変更になったら即イベント発行（でも保証されない）

var geo = function() {
	var self = {};
	
	// 開始
	self.start = function() {
		var db = Ti.Database.open(DB_NAME);
		// db.execute('DROP TABLE locations;');
		db.execute('CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY, date TEXT, lat NUMERIC, lng NUMERIC, error TEXT);');
		db.close();
		
		Ti.Geolocation.removeEventListener('location', locationHandler);	// 不要かもしれん。けどGlobal的に登録される気がするんだよな
		Ti.Geolocation.addEventListener('location', locationHandler);
	}
	
	return self;
	
	// location　イベントハンドラ
	function locationHandler(e) {
		if (e.error) {
			Ti.API.error('GetCurrentPositionError: ' + e.error);
			save(null, null, e.error);
		} else {
			save(e.coords.latitude, e.coords.longitude, null);
		}
	}
	
	// location　を保存
	function save(lat, lng, error) {
		var date = new Date();
		var datestr = date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2) + ' ';
		datestr += ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
		
		var db = Ti.Database.open(DB_NAME);
		if (error) {
			db.execute('INSERT INTO locations VALUES (NULL, ?, NULL, NULL, ?);', datestr, error);
		} else {
			db.execute('INSERT INTO locations VALUES (NULL, ?, ?, ?, NULL);', datestr, lat, lng);
		}
		db.close();
		
		// サーバーへ送信
		saveToServer();
	}
	
	// location　をサーバーへ保存
	function saveToServer() {
		// プロパティからサーバー送信済みIDを取得
		var lastSentId = Ti.App.Properties.getInt(KEY_PROP_ID, -1);
		
		// DBから送信していないデータをすべて取得
		var db = Ti.Database.open(DB_NAME);
		var rs = db.execute('SELECT * FROM locations where id > ? ORDER BY id ASC;', lastSentId);
		var locationList = [];
		while (rs.isValidRow()) {
			var location = {};
			location['id'] = rs.fieldByName('id');
			location['location[date]'] = rs.fieldByName('date');
			location['location[lat]'] = rs.fieldByName('lat');
			location['location[lng]'] = rs.fieldByName('lng');
			location['location[error]'] = rs.fieldByName('error');
			locationList.push(location);
			rs.next();
		}
		rs.close();
		db.close();
		
		var sendFn = function() {
			var location = locationList.shift();
			var http = Ti.Network.createHTTPClient({
				onload: function(e) {
					// プロパティにサーバー送信済みIDを保存して再帰呼び出し
					Ti.App.Properties.setInt(KEY_PROP_ID, location['id']);
					if (locationList.length > 0) {
						sendFn();
					}
				},
				onerror: function(error) {
					Ti.API.error(error.error);
				},
				timeout: 90000
			});
			http.open('POST', 'http://thawing-fortress-3334.herokuapp.com/locations.json');
			// http.open('POST', 'http://localhost:3000/locations.json');
			http.send(location);
		}
		sendFn();
	}
}

exports.create = geo;
