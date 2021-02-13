function randomColorFactor() {
	return Math.round(Math.random() * 255);
}

function randomColor(opacity) {
	return (
		"rgba(" +
		randomColorFactor() +
		"," +
		randomColorFactor() +
		"," +
		randomColorFactor() +
		"," +
		(opacity || ".3") +
		")"
	);
}

function getDataFromFitForCanvasJS(fitdatalocal, fieldx, fieldy) {
	var dataPoints = [];
	console.log(fieldy);
	if (fieldx === "timestamp" && fieldy.slice(0,3) === "lap" ){		
		// intervals
		for (var k=0; k < fitdatalocal.laps.length; k++) {
			dataPoints.push({
				x: fitdatalocal.laps[k].start_time,
				y: (fieldy === "lap_avg_heart_rate") ? 
					fitdatalocal.laps[k].avg_heart_rate: fitdatalocal.laps[k].total_elapsed_time,
				//y: k,
				indexLabel: (k%4==0)? k.toString(): ""
			});
		}
	} else {
		for (let row in fitdatalocal.records) {
			var record = fitdatalocal.records[row];
			dataPoints.push({
				x: record[fieldx],
				y: record[fieldy]
			});
		}
	}
	return dataPoints;
}

document.getElementById('xaxis').onchange = function (e) {
	
	document.getElementById('clean').dispatchEvent(new Event('click'));

	var xaxisFlag = document.getElementById('xaxis').value === "timestamp";
	axisXops.title = (xaxisFlag ? "time from the start, hours" : "distance, km");
	var ylist = document.getElementById("ylist");
	if (xaxisFlag) {
		ylist.options.add(new Option("lap_avg_heart_rate", "lap_avg_heart_rate"));
		ylist.options.add(new Option("lap_time", "lap_time"));
	} else {
		var lap_option_exist = true;
		while (lap_option_exist) {
			lap_option_exist = false;
			for (var i=0; i < ylist.length; i++) {
    			if (ylist.options[i].value.slice(0,3) === 'lap') {
					ylist.remove(i);
					lap_option_exist = true;
				}
			}
		}
	}
}

document.getElementById('ylist').onchange = function (e) {
	var yobj = document.getElementById('ylist');
	var xobj = document.getElementById('xaxis');
	//alert(yobj.options[yobj.selectedIndex].text + "  " + yobj.value);
	//console.log(document.getElementById('yaxis2').value);
	var axisYIndex, axisYType = "undefined";
	var color = randomColor(1);
	var aa = [axisYops, axisY2ops]; 
	aaloop:
	for (var kk in aa) {
		var a = aa[kk];
		for (var k in a) {
			if(a[k].title === yobj.value ){ 
				axisYIndex = k;
				//document.getElementById('yaxis2').value = (kk == 0 ? "primary" : "secondary");
				axisYType = (kk == 0 ? "primary" : "secondary");
				break  aaloop;
			}
		}
	}
	//console.log(document.getElementById('yaxis2').value );
	if( axisYType === "undefined") {	
		console.log(yobj.value);
		switch(yobj.value) {
			case "heart_rate" || "lap_avg_heart_rate" :
				color = "red";
				break;
			case "pace":
				color = "blue" || "lap_time";
				break;
			case "HRE":
				color = "green";
				break;
			default:
		}
		if( axisYops.length < axisY2ops.length) {	
			axisYType = "primary";
			axisYops.push( { title: yobj.value, lineColor: color, autoCalculate: true, 
				labelFontSize: 15, titleFontSize: 15, gridThickness: 0.15});
			axisYIndex = axisYops.length - 1;
		} else{ 
			axisYType =  "secondary";
			axisY2ops.push( { title: yobj.value, lineColor: color, autoCalculate: true, 
				labelFontSize: 15, titleFontSize: 15, gridThickness: 0 });
			axisYIndex = axisY2ops.length - 1;
		}
	}

	var datapoints = getDataFromFitForCanvasJS(fitdata, xobj.value, yobj.value);
	var chartdataType = "line", markerType="none", markerSize=0;
	if (yobj.value.slice(0,3) === "lap" && xobj.value === "timestamp") {
		chartdataType = "scatter";
		markerType = "triangle";
		markerSize = 8;
	}
	//console.log(chartdataType);
	chartdata = chartdata || [];
	chartdata.push( {
		color: color,
		lineThickness: 0.5,
		type: chartdataType, //"line", // "scatter"
		markerType: markerType,
		markerSize: markerSize,
		showInLegend: true,
		//name: yobj.value + " " + new Intl.DateTimeFormat('ru-RU').format(fitdata.activity.local_timestamp),
		// see also line 332
		name: yobj.value + " " + new Intl.DateTimeFormat('ru-RU').format(local_timestamp),
		axisYType: axisYType, //document.getElementById('yaxis2').value,
		axisYIndex: axisYIndex, 
		indexLabelPlacement: "inside",
		indexLabelFontSize: 15,
		dataPoints: datapoints 
		//backgroundColor: "rgba(153,255,51,0.4)",
		//mouseover: updateMapPosition
		//mousemove: updateMapPosition
		//click: updateMapPosition
	} );

    chart.render();
}

var fReader = new FileReader();
var fileInput = document.getElementById('myfile');

var chartdata=[];
var	axisXops = {crosshair: {enabled: true, snapToDataPoint: true, updated: updateMapPosition}, 
		gridThickness: 0.15, titleFontSize: 15,labelFontSize: 15, labelAngle: 0};
var axisYops=[], axisY2ops=[]; 

var chart = new CanvasJS.Chart("plotarea", {
	zoomEnabled: true,
	zoomType: "x", // "x","y", "xy"
	rangeChanging: updateMapSegment,
	//animationEnabled: true,
	theme: "light2", // "light1", "light2", "dark1", "dark2"		
	axisX: axisXops,
	axisY: axisYops, 
	axisY2: axisY2ops, 
	legend: {
		fontSize: 15,
		cursor: "pointer",
		itemclick: toggleDataSeries
	},	
	data: chartdata
});

function updateMapSegment(e) {
    if(e.trigger === "zoom"){
		var xMin = e.axisX[0].viewportMinimum;
		var xMax = e.axisX[0].viewportMaximum;
		var xname = document.getElementById('xaxis').value;
		var ycalc = Array(chartdata.length).fill(0), npts = 0;
		//console.log(ycalc);
		//console.log(chartdata);
		if (withGPS) mapSegment.setLatLngs( [[]] );		
		// the faster way : (1) find first index at x=xmin, and (2) do loop till xmax ?
		for (let k in fitdata.records) {
		//for (var k=0; k < chart.data[0].dataPoints.length; k++){
			var record = fitdata.records[k];
			if (record[xname] >=  xMin && record[xname] <=  xMax) {
				
				if (withGPS && ! (isNaN( record["position_lat"]) || isNaN(record["position_long"])) )
						mapSegment.addLatLng( [ record["position_lat"], record["position_long"] ] );
				
				npts++;
				
				for (var n=0; n < chartdata.length; n++){
					if (chartdata[n].type === "scatter" ) {} else {
						ycalc[n] += (isNaN(chartdata[n].dataPoints[k].y) ? 0: chartdata[n].dataPoints[k].y);
					}
				}

			}
		}

		var averinfo = ""; //"Parameter  Average";
		for (var n=0; n < chartdata.length; n++){
			//console.log(chartdata[n].type);
			if (chartdata[n].type === "scatter" ) {} else {
				ycalc[n] = ycalc[n]/npts;
				averinfo = averinfo + "<b>" + chartdata[n].name + "</b>: "+ ycalc[n].toFixed(2) + "<br/>";
			}
		}
		//console.log(averinfo);
		//console.log(npts);
		//console.log(ycalc);
		//alert(averinfo);
		mapSegmentInfo = L.popup({autoClose: true}).setLatLng(mapSegment.getCenter())
			.setContent(averinfo).openOn(mymap);
	} else if (e.trigger === "reset") { 
		if (withGPS) mapSegment.setLatLngs( [[]] );
	}
}

function updateMapPosition(e) {
	if (withGPS) {
		var xgiven = e.value;
		var xname = document.getElementById('xaxis').value;
		var record = {};
		for (let k in fitdata.records) {
			record = fitdata.records[k];
			if (record[xname] ===  xgiven) break
		}
	//console.log([ record["position_lat"], record["position_long"] ] );
		mapPosition.setLatLng( [ record["position_lat"], record["position_long"] ] );
	}
}

//function updateMapPosition(e){
//  this is for: mousemove: updateMapPosition
//	// console.log(e.dataPointIndex);
//	var d = fitdata.records[e.dataPointIndex];
//	mapPosition.setLatLng([d.position_lat, d.position_long]);
//}

function toggleDataSeries(e) {
	if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
		e.dataSeries.visible = false;
	} else {
		e.dataSeries.visible = true;
	}
	e.chart.render();
}

//var file = {};

fileInput.onchange = function (e) {
	var file = this.files[0];
	fReader.readAsArrayBuffer(file);
}


import {
	default as FitParser
} from './fit-parser.cjs';

var fitParser = new FitParser({
	force: true,
	speedUnit: 'km/h',
	lengthUnit: 'm',
	temperatureUnit: 'celsius',
	elapsedRecordField: true,
	mode: 'list',
});


var fitdata = {},  trackdata = [], local_timestamp='';

var mymap = L.map('map');
if ( navigator.onLine ) {
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	}).addTo(mymap);
	// or with mapbox
	//const mapbox_access_token = 'pk.eyJ1Ijoia2FyYXVsIiwiYSI6ImNra3JqczZ1bzBwMGMycHBmdXRiMXZ0dTIifQ.fZTV-Hvc1R_25VWOKmhRlQ';
	//L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + mapbox_access_token, 
	//{
	//	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	//	maxZoom: 18,
	//	id: 'mapbox/streets-v11',
	//}).addTo(mymap);
}

var Ltracks = [];
var Lpopups = [];
var mapPosition = {},  mapSegment = {},  mapSegmentInfo = {},  withGPS ;

fReader.onload = function (e) {
	//console.log(e.target.result); /// <-- this contains an ArrayBuffer
	var ylist=[];
	fitParser.parse(e.target.result, function (error, data) {
		if (error) {
			//console.log(error);
		} else {
			//console.log(data);
			//console.log(data.laps);
			if ("activity" in data) {
				local_timestamp =  ("local_timestamp" in data.activity ? 
					data.activity.local_timestamp: data.records[0].timestamp);
			} else{
				local_timestamp = data.records[0].timestamp;
			}
            var D = new Date(data.records[0].timestamp);
			var timeoffset =  D.getHours() + D.getMinutes()/60;
			for (var k in data.records) {
				var record = data.records[k];
				D = new Date(record.timestamp);
				data.records[k].timestamp =  D.getHours() + D.getMinutes()/60 - timeoffset;
				data.records[k].distance =  record.distance/1000;
				data.records[k].pace = (record.speed > 0 ? 60 / record.speed : NaN);
				data.records[k].HRE = (record.speed > 0 ? record.heart_rate * 60 / record.speed : NaN);
			}
			for (var k in data.laps) {
				D = new Date(data.laps[k].start_time);
				data.laps[k].start_time = D.getHours() + D.getMinutes()/60 - timeoffset;
			}

			fitdata = data;
			document.getElementById('xaxis').options.length = 0;
			document.getElementById('ylist').options.length = 0;
			for (let row of data.records) {
				for (let [key, value] of Object.entries(row)) {
					if (!ylist.includes(key)) {
						ylist.push(key);
						if (key === "distance" || key === "timestamp") {
							document.getElementById('xaxis').options.add(new Option(key, key))
						} else {
							document.getElementById('ylist').options.add(new Option(key, key))
						}
					}
				}
			}
		}
	});

	//document.getElementById('ylist').options.add(new Option("laps", "laps"))
	//console.log(fitdata);

	// set default xaxis as "distance"
	document.getElementById('xaxis').value = "distance";
	document.getElementById('xaxis').dispatchEvent(new Event('change'));

	// show few y on the plot
	//document.getElementById('ylist').value = "heart_rate";
	//document.getElementById('ylist').dispatchEvent(new Event('change'));
	var yaxisshow = ["heart_rate", "pace", "HRE", "speed", "position_lat", "position_long"], 
		kstart=[0,3,4], kend=[3,4,6], done=false;	
	for ( var kk=0; kk<kstart.length; kk++) {		
		for (k=kstart[kk]; k < kend[kk]; k++) {
			//console.log(yaxisshow[k]);
	    	if (ylist.includes(yaxisshow[k])) {
				done = true;
				document.getElementById('ylist').value = yaxisshow[k];
				document.getElementById('ylist').dispatchEvent(new Event('change'));
			}
		}
        if (done == true) break;
	}

	//if (document.getElementById('adddata').checked === true) {
	//	document.getElementById('ylist').dispatchEvent(new Event('change'));
	//}


	//console.log(latt_aver);
	//console.log(long_aver);
	//console.log(track);

	//for (i=0;i<track.length;i++) {
	//	mymap.removeLayer(points[i]);
	//}

	trackdata = [];
	var latt_aver = 0,
		long_aver = 0,
		n = 0;

	for (var i in fitdata.records) {
		var record = fitdata.records[i];
		var x = record.position_lat;
		var y = record.position_long;
		if (isNaN(x) || isNaN(y)) {} else {
			trackdata.push([x, y]);
			latt_aver += x;
			long_aver += y;
			n++;
		}
	};
	latt_aver = latt_aver / n;
	long_aver = long_aver / n;
	withGPS = !(isNaN(latt_aver) || isNaN(long_aver));

	//var trackcolor = ;
	//trackcolor = 'rgba(135,35,67, 0.2)'
	//console.log(trackcolor);
	/*Ltrack.on('click', function(e) {
		alert(e.latlng);
	});*/
		
	if (withGPS) {

		mymap.setView([latt_aver, long_aver], 14);

		var givencolors=["blue","green","magenta","brown","purple","olive"];
		var k = Ltracks.length % givencolors.length;
		Ltracks.push( L.polyline(trackdata, { color: givencolors[k] }).addTo(mymap) );

		Lpopups.push(
			L.popup({autoClose: false}).setLatLng(trackdata[ Math.round(Math.random()*(trackdata.length-1)/2) ])
			.setContent(new Intl.DateTimeFormat('ru-RU').format(local_timestamp)).openOn(mymap)
		);

		if ( ! mymap.hasLayer(mapPosition)) {
			mapPosition = L.circleMarker(trackdata[0], {
				color: 'red',
				fillColor: '#f03',
				fillOpacity: 0.5,
				radius: 5
			}).addTo(mymap);
		} else {
			mapPosition.bringToFront();
		}

		if ( ! mymap.hasLayer(mapSegment)) {
			mapSegment =  L.polyline([[]], { color: "red", weight: 5 }).addTo(mymap);
		} else {
			mapSegment.bringToFront();	
		}
	} else {	    
		var faketrack = [ // fake segment to get popup with averaged
				//[35.156025,33.3766633], // Nicosia
				//[55.752121, 37.617664], // Moscow
				[55.830431, 49.066081]  // Kazan
		];
		mymap.setView(faketrack[Math.round(Math.random()*(trackdata.length-1)/2)], 14);		
		mapSegment =  L.polyline(faketrack, { color: "red", weight: 5 }).addTo(mymap);
	}

	/*if ( ! mymap.hasLayer(mapSegmentInfo)) {
		mapSegmentInfo =  L.popup({autoClose: false}).setLatLng(mapSegment.getCenter())
			.setContent(averinfo).openOn(mymap);
	} else {
		mapSegmentInfo.bringToFront();	
	}*/
	
	

	/*Ltrack.on('mouseover', function(e) {
		var layer = e.target;
	
		//layer.setStyle({
		//	color: 'blue',
		//	opacity: 1,
		//	weight: 5
		//});
		var circle = L.circle( e.latlng, {
			color: 'red',
			fillColor: '#f03',
			fillOpacity: 0.5,
			radius: 5
		}).addTo(mymap);
	}); */


	//L.marker( track[10],{ color: 'red' }).addTo( mymap );
	/*var circle = L.circle( trackdata[10], {
		color: 'red',
		fillColor: '#f03',
		fillOpacity: 0.5,
		radius: 50
	}).addTo(mymap);*/
};

document.getElementById('clean').onclick = function (e) {

	// reset zoom
	chart.options.axisX.viewportMinimum = chart.options.axisX.viewportMaximum = null;

	for(var k = axisYops.length-1; k>=0; k--){ axisYops.pop()	}
	for(var k = axisY2ops.length-1; k>=0; k--){ axisY2ops.pop()	}
	for(var k = chartdata.length-1; k>=0; k--){ chartdata.pop()	}
	chart.render();

	if (withGPS){
		for(var k = 0; k < Ltracks.length-1; k++){ 
			mymap.removeLayer(Ltracks[k]);
		}
		Ltracks = Ltracks.slice(-1);
		
		for(var k = 0; k< Lpopups.length-1; k++){ 
			mymap.removeLayer(Lpopups[k]);
		}

		Lpopups = Lpopups.slice(-1);	
		//mapPosition.setLatLng( [] );
		mapSegment.setLatLngs( [[]] );

		if ( mymap.hasLayer(mapSegmentΙnfo)) {
			mymap.removeLayer(mapSegmentΙnfo);
		}
	}

}
